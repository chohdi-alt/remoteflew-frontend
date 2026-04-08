import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  finalize,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import { RequestService } from '../../core/services/request.service';
import { DashboardLayoutComponent } from '../dashboard/shared/dashboard-layout.component';
import { AuditHistoryDTO, PageResponse, PendingValidationTaskDTO } from '../../models/request.models';
import { RequestDecisionDialogComponent, RequestDecisionDialogResult } from './request-decision-dialog.component';
import { RequestTableComponent, RequestTableRow } from './request-table.component';
import { RealtimeSignalService } from '../../core/services/realtime-signal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { debounceTime } from 'rxjs/operators';

interface PageState {
  pageIndex: number;
  pageSize: number;
}

interface PendingTaskWithCreatedAt extends PendingValidationTaskDTO {
  createdAt: string | null;
}

const EMPTY_PAGE: PageResponse<PendingValidationTaskDTO> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 10,
  number: 0,
  numberOfElements: 0,
  first: true,
  last: true
};

@Component({
  selector: 'app-manager-requests',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, DashboardLayoutComponent, RequestTableComponent],
  templateUrl: './manager-requests.component.html',
  styleUrl: './manager-requests.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerRequestsComponent {
  private readonly requestService = inject(RequestService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly realtimeSignalService = inject(RealtimeSignalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSizeOptions = [10, 20, 50];

  private readonly pageState$ = new BehaviorSubject<PageState>({ pageIndex: 0, pageSize: 10 });
  private readonly refresh$ = new Subject<void>();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  constructor() {
    this.realtimeSignalService.connect();
    this.realtimeSignalService.onSignal(['MANAGER_INBOX_CHANGED', 'RECONNECT'])
      .pipe(
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.toastr.info('Inbox updated: new request received', 'Real-time Update');
        this.refresh();
      });
  }

  private readonly page$ = combineLatest([
    this.pageState$,
    this.refresh$.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([state]) => {
      this.loadingSubject.next(true);

      return this.requestService.getManagerRequests(state.pageIndex, state.pageSize).pipe(
        switchMap((page) =>
          this.enrichWithCreatedAt(page.content).pipe(
            map((content) => ({ ...page, content }))
          )
        ),
        catchError((error) => {
          console.error(error);
          this.toastr.error('Unable to load manager validation requests.', 'Manager Requests');
          return of({
            ...EMPTY_PAGE,
            content: [] as PendingTaskWithCreatedAt[],
            size: state.pageSize,
            number: state.pageIndex
          });
        }),
        finalize(() => this.loadingSubject.next(false)),
        map((page) => ({ page, state }))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly viewModel$ = this.page$.pipe(
    map(({ page, state }) => ({
      requests: page.content.map((task) => this.toTableRow(task)),
      total: page.totalElements,
      pageIndex: state.pageIndex,
      pageSize: state.pageSize
    }))
  );

  onPageChange(event: PageEvent): void {
    this.pageState$.next({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  onApprove(row: RequestTableRow): void {
    this.openDecisionDialog(row, 'approve');
  }

  onReject(row: RequestTableRow): void {
    this.openDecisionDialog(row, 'reject');
  }

  refresh(): void {
    this.refresh$.next();
  }

  private openDecisionDialog(row: RequestTableRow, initialAction: 'approve' | 'reject'): void {
    if (!row.requestId) {
      this.toastr.error('Request identifier is missing for this workflow task.', 'Manager Requests');
      return;
    }

    const dialogRef = this.dialog.open(RequestDecisionDialogComponent, {
      width: '520px',
      data: {
        request: row,
        role: 'MANAGER',
        initialAction
      }
    });

    dialogRef.afterClosed().subscribe((result: RequestDecisionDialogResult | undefined) => {
      if (!result) {
        return;
      }
      this.submitDecision(row, result);
    });
  }

  private submitDecision(row: RequestTableRow, result: RequestDecisionDialogResult): void {
    if (!row.requestId) {
      this.toastr.error('Request identifier is missing for this workflow task.', 'Manager Requests');
      return;
    }

    this.loadingSubject.next(true);
    const request$ = result.action === 'approve'
      ? this.requestService.approveManagerRequest(row.requestId, row.taskKey, { comment: result.comment })
      : this.requestService.rejectManagerRequest(row.requestId, row.taskKey, { comment: result.comment });

    request$
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: () => {
          this.toastr.success(`Request ${result.action}d successfully.`, 'Manager Requests');
          this.refresh();
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('Failed to submit decision.', 'Manager Requests');
        }
      });
  }

  private enrichWithCreatedAt(tasks: PendingValidationTaskDTO[]): Observable<PendingTaskWithCreatedAt[]> {
    if (tasks.length === 0) {
      return of<PendingTaskWithCreatedAt[]>([]);
    }

    return forkJoin(
      tasks.map((task) => {
        if (!task.requestId) {
          return of({ ...task, createdAt: null } as PendingTaskWithCreatedAt);
        }

        return this.requestService.getRequestHistory(task.requestId).pipe(
          map((history) => ({
            ...task,
            createdAt: this.resolveCreatedAt(history)
          })),
          catchError(() => of({ ...task, createdAt: null } as PendingTaskWithCreatedAt))
        );
      })
    );
  }

  private resolveCreatedAt(history: AuditHistoryDTO[]): string | null {
    const submitEntry = history.find((entry) => String(entry.action ?? '').toUpperCase() === 'SUBMIT');
    if (submitEntry?.timestamp) {
      return submitEntry.timestamp;
    }

    return history[0]?.timestamp ?? null;
  }

  private toTableRow(task: PendingTaskWithCreatedAt): RequestTableRow {
    return {
      requestId: task.requestId,
      employeeName: task.employeeName,
      startDate: task.startDate,
      endDate: task.endDate,
      reason: task.justificationReason || null,
      justificationReason: task.justificationReason || null,
      justificatifFileId: task.justificatifFileId || null,
      justificatifDownloadUrl: task.justificatifDownloadUrl || null,
      status: task.status,
      createdAt: task.createdAt,
      taskKey: task.taskKey
    };
  }
}

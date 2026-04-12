import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { RequestService } from '../../core/services/request.service';
import { FileDownloadService } from '../../core/services/file-download.service';

export interface RequestTableRow {
  requestId: number | null;
  employeeName: string;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  status: string;
  createdAt: string | null;
  taskKey: string;
  justificationReason?: string | null;
  justificatifFileId?: string | null;
  justificatifDownloadUrl?: string | null;
}

@Component({
  selector: 'app-request-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatPaginatorModule, MatProgressSpinnerModule, MatTableModule],
  templateUrl: './request-table.component.html',
  styleUrl: './request-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestTableComponent {
  private readonly requestService = inject(RequestService);
  private readonly fileDownloadService = inject(FileDownloadService);
  private readonly toastr = inject(ToastrService);

  @Input() requests: RequestTableRow[] = [];
  @Input() loading = false;
  @Input() total = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50];

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() approve = new EventEmitter<RequestTableRow>();
  @Output() reject = new EventEmitter<RequestTableRow>();

  readonly displayedColumns: string[] = ['employee', 'startDate', 'endDate', 'reason', 'justificatif', 'status', 'createdAt', 'actions'];

  viewJustificatif(row: RequestTableRow, event: Event): void {
    event.stopPropagation();
    const downloadUrl = row.justificatifDownloadUrl ?? null;

    if (!downloadUrl && !row.requestId) {
      this.toastr.error('File reference unavailable for this request.', 'Download failed');
      return;
    }

    this.requestService.viewJustificatifFile(row.requestId ?? 0, downloadUrl)
      .subscribe({
        next: (response) => {
          try {
            this.fileDownloadService.downloadFromResponse(response);
          } catch {
            this.toastr.error('Unable to process downloaded file.', 'Download failed');
          }
        },
        error: () => {}
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onApprove(row: RequestTableRow): void {
    this.approve.emit(row);
  }

  onReject(row: RequestTableRow): void {
    this.reject.emit(row);
  }

  toStatusClass(status: string): string {
    const value = String(status ?? '').trim().toUpperCase();
    if (value === 'SPECIAL') {
      return 'status status--special';
    }
    if (value === 'APPROVED') {
      return 'status status--approved';
    }
    if (value === 'REJECTED') {
      return 'status status--rejected';
    }
    return 'status status--submitted';
  }
}

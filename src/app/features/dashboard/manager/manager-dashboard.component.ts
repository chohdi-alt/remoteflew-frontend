import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, combineLatest, map, Observable, of, shareReplay, startWith, switchMap } from 'rxjs';
import {
  DashboardLineChartModel,
  DashboardPieChartModel,
  formatDuration,
  mapMonthlyTrendToLineChart,
  mapStatusTotalsToPieChart,
  shouldWarnPendingTaskCountUnavailable
} from '../dashboard-chart.adapter';
import { DashboardService } from '../dashboard.service';
import { ManagerDashboardDTO } from '../dashboard.models';
import { BaseChartComponent } from '../shared/base-chart.component';
import { DashboardLayoutComponent } from '../shared/dashboard-layout.component';
import { KpiCardComponent } from '../shared/kpi-card.component';
import { RealtimeSignalService } from '../../../core/services/realtime-signal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

interface ManagerDashboardViewModel {
  raw: ManagerDashboardDTO;
  totalsPie: DashboardPieChartModel;
  monthlyLine: DashboardLineChartModel;
  avgDecisionTimeText: string;
  showPendingWarning: boolean;
}

interface DashboardFilterState {
  from: string | undefined;
  to: string | undefined;
  invalidRange: boolean;
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DashboardLayoutComponent,
    KpiCardComponent,
    BaseChartComponent
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerDashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly realtimeSignalService = inject(RealtimeSignalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fromControl = new FormControl<string>('', { nonNullable: true });
  readonly toControl = new FormControl<string>('', { nonNullable: true });
  private readonly refresh$ = new BehaviorSubject<number>(0);

  constructor() {
    this.realtimeSignalService.connect();
    this.realtimeSignalService.onSignal(['MANAGER_INBOX_CHANGED', 'RECONNECT'])
      .pipe(
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.refresh$.next(Date.now());
      });
  }

  private readonly filterState$: Observable<DashboardFilterState> = combineLatest([
    this.fromControl.valueChanges.pipe(startWith(this.fromControl.value)),
    this.toControl.valueChanges.pipe(startWith(this.toControl.value)),
    this.refresh$.asObservable()
  ]).pipe(
    map(([from, to, _refresh]) => {
      const cleanFrom = this.toFilterDate(from as string);
      const cleanTo = this.toFilterDate(to as string);
      return {
        from: cleanFrom,
        to: cleanTo,
        invalidRange: this.isInvalidDateRange(cleanFrom, cleanTo)
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly dateRangeError$: Observable<string | null> = this.filterState$.pipe(
    map((state) => (state.invalidRange ? 'From date must be before or equal to To date.' : null))
  );

  readonly dashboardData$: Observable<ManagerDashboardViewModel | null> = this.filterState$.pipe(
    switchMap((state) => {
      if (state.invalidRange) {
        return of(null);
      }

      return this.dashboardService.getManagerDashboard(state.from, state.to).pipe(
        map((raw) => ({
          raw,
          totalsPie: mapStatusTotalsToPieChart(raw.teamTotalsByStatus, 'donut'),
          monthlyLine: mapMonthlyTrendToLineChart(raw.teamMonthlyTrend, 'Team requests'),
          avgDecisionTimeText: formatDuration(raw.avgManagerDecisionTime),
          showPendingWarning: shouldWarnPendingTaskCountUnavailable(raw.teamMonthlyTrend, raw.pendingManagerTasks, 0, 'MANAGER')
        })),
        catchError(() => of(null))
      );
    })
  );

  clearFilters(): void {
    this.fromControl.setValue('');
    this.toControl.setValue('');
  }

  private toFilterDate(value: string): string | undefined {
    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  private isInvalidDateRange(from: string | undefined, to: string | undefined): boolean {
    if (!from || !to) {
      return false;
    }
    return from > to;
  }
}

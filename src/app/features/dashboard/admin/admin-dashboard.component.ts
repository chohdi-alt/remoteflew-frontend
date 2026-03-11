import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, combineLatest, map, Observable, of, shareReplay, startWith, switchMap } from 'rxjs';
import {
  DashboardLineChartModel,
  DashboardPieChartModel,
  formatDuration,
  formatPercentage,
  mapMonthlyTrendToLineChart,
  mapStatusTotalsToPieChart,
  shouldWarnPendingTaskCountUnavailable
} from '../dashboard-chart.adapter';
import { AdminDashboardDTO } from '../dashboard.models';
import { DashboardService } from '../dashboard.service';
import { BaseChartComponent } from '../shared/base-chart.component';
import { DashboardLayoutComponent } from '../shared/dashboard-layout.component';
import { KpiCardComponent } from '../shared/kpi-card.component';

interface AdminDashboardViewModel {
  raw: AdminDashboardDTO;
  totalsPie: DashboardPieChartModel;
  monthlyLine: DashboardLineChartModel;
  approvalRateText: string;
  rejectionRateText: string;
  avgCycleTimeText: string;
  showPendingWarning: boolean;
}

interface DashboardFilterState {
  from: string | undefined;
  to: string | undefined;
  invalidRange: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    DashboardLayoutComponent,
    KpiCardComponent,
    BaseChartComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly fromControl = new FormControl<string>('', { nonNullable: true });
  readonly toControl = new FormControl<string>('', { nonNullable: true });

  private readonly filterState$: Observable<DashboardFilterState> = combineLatest([
    this.fromControl.valueChanges.pipe(startWith(this.fromControl.value)),
    this.toControl.valueChanges.pipe(startWith(this.toControl.value))
  ]).pipe(
    map(([from, to]) => {
      const cleanFrom = this.toFilterDate(from);
      const cleanTo = this.toFilterDate(to);
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

  readonly dashboardData$: Observable<AdminDashboardViewModel | null> = this.filterState$.pipe(
    switchMap((state) => {
      if (state.invalidRange) {
        return of(null);
      }

      return this.dashboardService.getAdminDashboard(state.from, state.to).pipe(
        map((raw) => ({
          raw,
          totalsPie: mapStatusTotalsToPieChart(raw.totalsByStatus, 'donut'),
          monthlyLine: mapMonthlyTrendToLineChart(raw.monthlyTrend, 'Requests'),
          approvalRateText: formatPercentage(raw.approvalRate),
          rejectionRateText: formatPercentage(raw.rejectionRate),
          avgCycleTimeText: formatDuration(raw.avgCycleTime),
          showPendingWarning: shouldWarnPendingTaskCountUnavailable(
            raw.monthlyTrend,
            raw.pendingManagerTasks,
            raw.pendingHrTasks,
            'ADMIN'
          )
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

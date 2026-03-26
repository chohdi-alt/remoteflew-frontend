import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { catchError, combineLatest, map, Observable, of, shareReplay, startWith, switchMap } from 'rxjs';
import { DashboardLineChartModel, DashboardPieChartModel, mapMonthlyTrendToLineChart, mapStatusTotalsToPieChart } from '../dashboard-chart.adapter';
import { DashboardService } from '../dashboard.service';
import { EmployeeDashboardDTO } from '../dashboard.models';
import { BaseChartComponent } from '../shared/base-chart.component';
import { DashboardLayoutComponent } from '../shared/dashboard-layout.component';
import { KpiCardComponent } from '../shared/kpi-card.component';

interface EmployeeDashboardViewModel {
  raw: EmployeeDashboardDTO;
  totalsPie: DashboardPieChartModel;
  monthlyLine: DashboardLineChartModel;
}

interface DashboardFilterState {
  from: string | undefined;
  to: string | undefined;
  invalidRange: boolean;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    DashboardLayoutComponent,
    KpiCardComponent,
    BaseChartComponent
  ],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeRoleDashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly fromControl = new FormControl<string>('', { nonNullable: true });
  readonly toControl = new FormControl<string>('', { nonNullable: true });
  readonly recentColumns: string[] = ['requestId', 'startDate', 'endDate', 'status', 'specialCase', 'managerComment', 'hrComment'];

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

  readonly dashboardData$: Observable<EmployeeDashboardViewModel | null> = this.filterState$.pipe(
    switchMap((state) => {
      if (state.invalidRange) {
        return of(null);
      }

      return this.dashboardService.getEmployeeDashboard(state.from, state.to).pipe(
        map((raw) => ({
          raw,
          totalsPie: mapStatusTotalsToPieChart(raw.myTotalsByStatus, 'donut'),
          monthlyLine: mapMonthlyTrendToLineChart(raw.myMonthlyTrend, 'My requests')
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

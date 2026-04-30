import { MonthlyCountDTO, RequestStatus } from './dashboard.models';

export type DashboardChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut';

export interface DashboardAxisSeries {
  name: string;
  data: number[];
}

export interface DashboardPieChartModel {
  type: 'pie' | 'donut';
  categories: string[];
  series: number[];
}

export interface DashboardLineChartModel {
  type: 'line';
  categories: string[];
  series: DashboardAxisSeries[];
}

type PendingWarningRole = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';

const STATUS_ORDER: RequestStatus[] = ['SUBMITTED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'SPECIAL'];

const STATUS_LABELS: Record<RequestStatus, string> = {
  SUBMITTED: 'Submitted',
  MANAGER_APPROVED: 'Manager Approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SPECIAL: 'Special'
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function mapStatusTotalsToPieChart(
  totals: Partial<Record<RequestStatus, number>>,
  chartType: 'pie' | 'donut' = 'donut'
): DashboardPieChartModel {
  const categories: string[] = [];
  const series: number[] = [];

  STATUS_ORDER.forEach((status) => {
    const value = totals[status] ?? 0;
    if (value > 0) {
      categories.push(STATUS_LABELS[status]);
      series.push(value);
    }
  });

  if (series.length === 0) {
    categories.push('No data');
    series.push(1);
  }

  return {
    type: chartType,
    categories,
    series
  };
}

export function mapMonthlyTrendToLineChart(monthlyTrend: MonthlyCountDTO[], seriesName: string): DashboardLineChartModel {
  const sortedTrend = [...monthlyTrend].sort((left, right) => {
    if (left.year === right.year) {
      return left.month - right.month;
    }
    return left.year - right.year;
  });

  return {
    type: 'line',
    categories: sortedTrend.map((item) => `${getMonthLabel(item.month)} ${String(item.year).slice(-2)}`),
    series: [
      {
        name: seriesName,
        data: sortedTrend.map((item) => item.count)
      }
    ]
  };
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export function formatPercentage(value: number, decimals = 1): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 1;
  return `${safeValue.toFixed(safeDecimals)}%`;
}

export function shouldWarnPendingTaskCountUnavailable(
  monthlyTrend: MonthlyCountDTO[],
  pendingManagerTasks: number | undefined,
  pendingHrTasks: number | undefined,
  role: PendingWarningRole
): boolean {
  if (role !== 'ADMIN' && role !== 'HR' && role !== 'MANAGER') {
    return false;
  }

  const monthlyTrendTotal = monthlyTrend.reduce((sum, item) => sum + item.count, 0);
  const managerTasks = pendingManagerTasks ?? 0;
  const hrTasks = pendingHrTasks ?? 0;

  return monthlyTrendTotal > 0 && managerTasks === 0 && hrTasks === 0;
}

function getMonthLabel(month: number): string {
  if (month >= 1 && month <= 12) {
    return MONTH_LABELS[month - 1] ?? String(month);
  }
  return String(month);
}

export type RequestStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SPECIAL' | 'MANAGER_APPROVED';

export interface TeleworkStatusDTO {
  requestId: number;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  decisionComment: string | null;
  specialCase: boolean;
  justificationReason?: string | null;
  justificatifFileId?: string | null;
  managerComment?: string | null;
  hrComment?: string | null;
}

export interface MonthlyCountDTO {
  year: number;
  month: number;
  count: number;
}

export interface AdminDashboardDTO {
  totalsByStatus: Record<RequestStatus, number>;
  approvalRate: number;
  rejectionRate: number;
  monthlyTrend: MonthlyCountDTO[];
  pendingManagerTasks: number;
  pendingHrTasks: number;
  avgCycleTime: number;
}

export interface HrDashboardDTO {
  totalsByStatus: Record<RequestStatus, number>;
  monthlyTrend: MonthlyCountDTO[];
  pendingHrTasks: number;
  avgHrDecisionTime: number;
}

export interface ManagerDashboardDTO {
  teamTotalsByStatus: Record<RequestStatus, number>;
  teamMonthlyTrend: MonthlyCountDTO[];
  pendingManagerTasks: number;
  avgManagerDecisionTime: number;
}

export interface EmployeeDashboardDTO {
  myTotalsByStatus: Record<RequestStatus, number>;
  myMonthlyTrend: MonthlyCountDTO[];
  recentRequests: TeleworkStatusDTO[];
}

export type ScoreStatus =
  | 'NOT_AVAILABLE'
  | 'PENDING_MANAGER_INPUT'
  | 'SCORED'
  | 'REVIEWED_BY_HR';

export interface ManagerScoreSubmissionRequest {
  attendance: number;
  tasks: number;
  punctuality: number;
  behavior: number;
  comments?: string | null;
}

export interface HrScoreReviewRequest {
  comments?: string | null;
}

export interface TeleworkScoreMetricDTO {
  metricCode: string;
  metricValue: number;
  metricWeight: number;
  weightedScore: number;
}

export interface TeleworkScoreSummaryDTO {
  scoreId: number;
  requestId: number;
  employeeId: string;
  teamId: number | null;
  startDate: string;
  endDate: string;
  status: ScoreStatus;
  totalScore: number | null;
  managerExternalId: string | null;
  scoredAt: string | null;
  hrExternalId: string | null;
  reviewedAt: string | null;
}

export interface TeleworkScoreDTO {
  scoreId: number;
  requestId: number;
  employeeId: string;
  teamId: number | null;
  startDate: string;
  endDate: string;
  status: ScoreStatus;
  totalScore: number | null;
  managerExternalId: string | null;
  managerComment: string | null;
  scoredAt: string | null;
  hrExternalId: string | null;
  hrComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: TeleworkScoreMetricDTO[];
}

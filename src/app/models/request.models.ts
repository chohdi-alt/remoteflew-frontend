export interface RequestDecisionRequest {
  comment?: string | null;
}

export interface ApprovalDecisionRequest {
  requestId?: number | null;
  managerId?: string | null;
  comment?: string | null;
}

export interface PendingValidationTaskDTO {
  requestId: number | null;
  employeeName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  taskKey: string;
}

export interface TeleworkStatusDTO {
  requestId: number;
  startDate: string;
  endDate: string;
  status: string;
  decisionComment: string | null;
  specialCase: boolean;
}

export interface AuditHistoryDTO {
  action: string;
  entity: string;
  timestamp: string;
  user: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
}

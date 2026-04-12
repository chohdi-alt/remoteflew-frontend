import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApprovalDecisionRequest,
  AuditHistoryDTO,
  PageResponse,
  PendingValidationTaskDTO,
  RequestDecisionRequest,
  TeleworkStatusDTO
} from '../../models/request.models';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = '/api';
  private readonly teleworkBasePath = '/api/telework';

  getManagerRequests(pageIndex = 0, pageSize = 10): Observable<PageResponse<PendingValidationTaskDTO>> {
    return this.getPendingValidations(pageIndex, pageSize);
  }

  getHrRequests(pageIndex = 0, pageSize = 10): Observable<PageResponse<PendingValidationTaskDTO>> {
    return this.getPendingValidations(pageIndex, pageSize);
  }

  getRequestById(requestId: number): Observable<TeleworkStatusDTO> {
    return this.http.get<TeleworkStatusDTO>(`${this.teleworkBasePath}/${requestId}`);
  }

  getRequestHistory(requestId: number): Observable<AuditHistoryDTO[]> {
    return this.http.get<AuditHistoryDTO[]>(`${this.teleworkBasePath}/${requestId}/history`);
  }

  viewJustificatifFile(requestId: number, downloadUrl?: string | null): Observable<HttpResponse<Blob>> {
    const endpoint = downloadUrl && downloadUrl.trim().length > 0
      ? downloadUrl
      : `${this.teleworkBasePath}/${requestId}/justificatif/view`;

    return this.http.get(endpoint, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  viewArchiveFile(requestId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiBasePath}/admin/archives/${requestId}/view`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  approveManagerRequest(requestId: number, taskKey: string, body: RequestDecisionRequest): Observable<void> {
    return this.http.post<void>(
      `${this.teleworkBasePath}/${requestId}/manager/approve`,
      this.toApprovalPayload(requestId, body),
      { params: this.taskKeyParams(taskKey) }
    );
  }

  rejectManagerRequest(requestId: number, taskKey: string, body: RequestDecisionRequest): Observable<void> {
    return this.http.post<void>(
      `${this.teleworkBasePath}/${requestId}/manager/reject`,
      this.toApprovalPayload(requestId, body),
      { params: this.taskKeyParams(taskKey) }
    );
  }

  approveHrRequest(requestId: number, taskKey: string, body: RequestDecisionRequest): Observable<void> {
    return this.http.post<void>(
      `${this.teleworkBasePath}/${requestId}/hr/approve`,
      this.toApprovalPayload(requestId, body),
      { params: this.taskKeyParams(taskKey) }
    );
  }

  rejectHrRequest(requestId: number, taskKey: string, body: RequestDecisionRequest): Observable<void> {
    return this.http.post<void>(
      `${this.teleworkBasePath}/${requestId}/hr/reject`,
      this.toApprovalPayload(requestId, body),
      { params: this.taskKeyParams(taskKey) }
    );
  }

  private getPendingValidations(pageIndex: number, pageSize: number): Observable<PageResponse<PendingValidationTaskDTO>> {
    const params = new HttpParams()
      .set('page', pageIndex)
      .set('size', pageSize);

    return this.http.get<PageResponse<PendingValidationTaskDTO>>(`${this.apiBasePath}/telework/validations/pending`, {
      params
    });
  }

  private taskKeyParams(taskKey: string): HttpParams {
    return new HttpParams().set('taskKey', taskKey);
  }

  private toApprovalPayload(requestId: number, body: RequestDecisionRequest): ApprovalDecisionRequest {
    const comment = body.comment == null ? null : body.comment.trim() || null;
    return {
      comment
    };
  }
}

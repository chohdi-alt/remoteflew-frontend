import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  HrScoreReviewRequest,
  ManagerScoreSubmissionRequest,
  ScoreStatus,
  TeleworkScoreDTO,
  TeleworkScoreSummaryDTO
} from '../models/scoring.models';

@Injectable({
  providedIn: 'root'
})
export class ScoringApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/api/scoring';

  getManagerPendingScores(): Observable<TeleworkScoreSummaryDTO[]> {
    return this.http.get<TeleworkScoreSummaryDTO[]>(`${this.basePath}/manager/pending`);
  }

  submitManagerScore(requestId: number, payload: ManagerScoreSubmissionRequest): Observable<TeleworkScoreDTO> {
    return this.http.post<TeleworkScoreDTO>(`${this.basePath}/${requestId}/submit`, payload);
  }

  getHrScores(filters?: {
    teamId?: number | null;
    employeeId?: string | null;
    managerExternalId?: string | null;
    status?: ScoreStatus | null;
  }): Observable<TeleworkScoreSummaryDTO[]> {
    let params = new HttpParams();

    if (filters?.teamId != null) {
      params = params.set('teamId', filters.teamId);
    }
    if (filters?.employeeId) {
      params = params.set('employeeId', filters.employeeId.trim());
    }
    if (filters?.managerExternalId) {
      params = params.set('managerExternalId', filters.managerExternalId.trim());
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<TeleworkScoreSummaryDTO[]>(this.basePath, { params });
  }

  getHrScoreById(scoreId: number): Observable<TeleworkScoreDTO> {
    return this.http.get<TeleworkScoreDTO>(`${this.basePath}/${scoreId}`);
  }

  reviewScoreByHr(scoreId: number, payload: HrScoreReviewRequest): Observable<TeleworkScoreDTO> {
    return this.http.post<TeleworkScoreDTO>(`${this.basePath}/${scoreId}/review`, payload);
  }

  getScoreByRequest(requestId: number): Observable<TeleworkScoreDTO> {
    return this.http.get<TeleworkScoreDTO>(`${this.basePath}/request/${requestId}`);
  }
}

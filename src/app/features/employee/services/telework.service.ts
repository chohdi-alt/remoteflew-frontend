import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateTeleworkDTO {
  employeeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface TeleworkQuotaResponse {
  maxDaysPerWeek: number;
  usedDaysThisWeek: number;
  remainingDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class TeleworkService {
  private readonly http = inject(HttpClient);

  createRequest(dto: CreateTeleworkDTO, file?: File): Observable<unknown> {
    const formData = new FormData();

    formData.append(
      'data',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );

    if (file) {
      formData.append('file', file, file.name);
    } else {
      formData.append('file', new Blob());
    }

    return this.http.post('/api/telework', formData);
  }

  getWeeklyQuota(): Observable<TeleworkQuotaResponse> {
    return this.http.get<TeleworkQuotaResponse>('/api/telework/quota');
  }

  getCurrentQuota(): Observable<TeleworkQuotaResponse> {
    return this.getWeeklyQuota();
  }
}

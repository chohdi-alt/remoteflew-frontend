import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SmtpConfigRequest, SmtpConfigResponse, SmtpConnectionTestResponse } from '../../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class SmtpService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/api/admin/smtp';

  list(): Observable<SmtpConfigResponse[]> {
    return this.http.get<SmtpConfigResponse[]>(this.basePath);
  }

  getEffective(): Observable<SmtpConfigResponse> {
    return this.http.get<SmtpConfigResponse>(`${this.basePath}/effective`);
  }

  create(payload: SmtpConfigRequest): Observable<SmtpConfigResponse> {
    return this.http.post<SmtpConfigResponse>(this.basePath, payload);
  }

  update(id: number, payload: SmtpConfigRequest): Observable<SmtpConfigResponse> {
    return this.http.put<SmtpConfigResponse>(`${this.basePath}/${id}`, payload);
  }

  activate(id: number): Observable<SmtpConfigResponse> {
    return this.http.post<SmtpConfigResponse>(`${this.basePath}/${id}/activate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }

  testStored(id: number): Observable<SmtpConnectionTestResponse> {
    return this.http.post<SmtpConnectionTestResponse>(`${this.basePath}/${id}/test`, {});
  }

  testInput(payload: SmtpConfigRequest): Observable<SmtpConnectionTestResponse> {
    return this.http.post<SmtpConnectionTestResponse>(`${this.basePath}/test`, payload);
  }
}

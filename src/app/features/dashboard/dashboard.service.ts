import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminDashboardDTO, EmployeeDashboardDTO, HrDashboardDTO, ManagerDashboardDTO } from './dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly basePath = '/api/dashboard';
  private readonly isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  constructor(private readonly http: HttpClient) {}

  getAdminDashboard(from?: string, to?: string): Observable<AdminDashboardDTO> {
    return this.http.get<AdminDashboardDTO>(`${this.basePath}/admin`, {
      params: this.buildDateParams(from, to)
    });
  }

  getHrDashboard(from?: string, to?: string): Observable<HrDashboardDTO> {
    return this.http.get<HrDashboardDTO>(`${this.basePath}/hr`, {
      params: this.buildDateParams(from, to)
    });
  }

  getManagerDashboard(from?: string, to?: string): Observable<ManagerDashboardDTO> {
    return this.http.get<ManagerDashboardDTO>(`${this.basePath}/manager`, {
      params: this.buildDateParams(from, to)
    });
  }

  getEmployeeDashboard(from?: string, to?: string): Observable<EmployeeDashboardDTO> {
    return this.http.get<EmployeeDashboardDTO>(`${this.basePath}/employee`, {
      params: this.buildDateParams(from, to)
    });
  }

  private buildDateParams(from?: string, to?: string): HttpParams {
    let params = new HttpParams();

    const cleanFrom = this.normalizeDate(from);
    const cleanTo = this.normalizeDate(to);

    if (cleanFrom) {
      params = params.set('from', cleanFrom);
    }
    if (cleanTo) {
      params = params.set('to', cleanTo);
    }

    return params;
  }

  private normalizeDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    return this.isoDatePattern.test(trimmedValue) ? trimmedValue : undefined;
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthTokenResponse, LoginRequestPayload } from '../models/auth.models';

export interface AuthMeResponse {
  userId: string;
  username: string;
  email: string | null;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly basePath = '/api/auth';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequestPayload): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.basePath}/login`, payload);
  }

  refresh(refreshToken: string): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.basePath}/refresh`, { refreshToken });
  }

  getCurrentUser(): Observable<AuthMeResponse> {
    return this.http.get<AuthMeResponse>(`${this.basePath}/me`);
  }
}

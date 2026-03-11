import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminUserDTO,
  CreateUserRequest,
  PageResponse,
  UpdateUserActivationRequest,
  UpdateUserRolesRequest,
  UserDirectoryDTO
} from '../../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly adminBasePath = '/api/admin';
  private readonly directoryBasePath = '/api/admin/directory';

  getUsers(pageIndex = 0, pageSize = 20, sort?: string): Observable<PageResponse<AdminUserDTO>> {
    let params = new HttpParams()
      .set('page', pageIndex)
      .set('size', pageSize);

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<PageResponse<AdminUserDTO>>(`${this.adminBasePath}/users`, { params });
  }

  updateUserRoles(externalId: string, roles: string[]): Observable<AdminUserDTO> {
    const payload: UpdateUserRolesRequest = { roles };
    return this.http.put<AdminUserDTO>(`${this.adminBasePath}/users/${externalId}/roles`, payload);
  }

  updateUserActivation(externalId: string, active: boolean): Observable<AdminUserDTO> {
    const payload: UpdateUserActivationRequest = { active };
    return this.http.put<AdminUserDTO>(`${this.adminBasePath}/users/${externalId}/activation`, payload);
  }

  createUser(request: CreateUserRequest): Observable<AdminUserDTO> {
    return this.http.post<AdminUserDTO>(`${this.adminBasePath}/users`, request);
  }

  syncUsersFromKeycloak(): Observable<void> {
    return this.http.post<void>(`${this.adminBasePath}/users/sync`, {});
  }

  getUserDirectory(): Observable<UserDirectoryDTO[]> {
    return this.http.get<UserDirectoryDTO[]>(`${this.directoryBasePath}/users`);
  }

  getManagers(): Observable<UserDirectoryDTO[]> {
    return this.http.get<UserDirectoryDTO[]>(`${this.directoryBasePath}/managers`);
  }

  getHrUsers(): Observable<UserDirectoryDTO[]> {
    return this.http.get<UserDirectoryDTO[]>(`${this.directoryBasePath}/hr`);
  }

  getTeamMembers(teamId: number): Observable<UserDirectoryDTO[]> {
    return this.http.get<UserDirectoryDTO[]>(`${this.directoryBasePath}/team/${teamId}/members`);
  }
}

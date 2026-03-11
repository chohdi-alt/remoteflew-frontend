import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateTeamRequest,
  TeamDirectoryDTO,
  UpdateTeamManagerRequest,
  UpdateTeamMembersRequest,
  UserDirectoryDTO
} from '../../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly directoryBasePath = '/api/admin/directory';
  private readonly adminBasePath = '/api/admin/teams';

  getTeams(): Observable<TeamDirectoryDTO[]> {
    return this.http.get<TeamDirectoryDTO[]>(`${this.directoryBasePath}/teams`);
  }

  getTeamMembers(teamId: number): Observable<UserDirectoryDTO[]> {
    return this.http.get<UserDirectoryDTO[]>(`${this.directoryBasePath}/team/${teamId}/members`);
  }

  createTeam(request: CreateTeamRequest): Observable<TeamDirectoryDTO> {
    return this.http.post<TeamDirectoryDTO>(this.adminBasePath, request);
  }

  updateTeamManager(teamId: number, request: UpdateTeamManagerRequest): Observable<void> {
    return this.http.put<void>(`${this.adminBasePath}/${teamId}/manager`, request);
  }

  updateTeamMembers(teamId: number, request: UpdateTeamMembersRequest): Observable<void> {
    return this.http.put<void>(`${this.adminBasePath}/${teamId}/members`, request);
  }
}

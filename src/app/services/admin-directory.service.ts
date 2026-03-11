import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserDTO {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    teamId?: string;
    teamName?: string;
    team?: TeamDTO;
}

export interface TeamDTO {
    id: string;
    name: string;
    managerId?: string;
    manager?: UserDTO;
    membersCount?: number;
}

export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
}

export interface AssignRoleRequest {
    role: string;
}

export interface CreateTeamRequest {
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class AdminDirectoryService {
    private readonly http = inject(HttpClient);
    private readonly basePath = '/api/admin';

    getUsers(): Observable<UserDTO[]> {
        return this.http.get<UserDTO[]>(`${this.basePath}/users`);
    }

    getTeams(): Observable<TeamDTO[]> {
        return this.http.get<TeamDTO[]>(`${this.basePath}/teams`);
    }

    getManagers(): Observable<UserDTO[]> {
        return this.http.get<UserDTO[]>(`${this.basePath}/managers`);
    }

    getHrUsers(): Observable<UserDTO[]> {
        return this.http.get<UserDTO[]>(`${this.basePath}/hr`);
    }

    getTeamMembers(teamId: string): Observable<UserDTO[]> {
        return this.http.get<UserDTO[]>(`${this.basePath}/team/${teamId}/members`);
    }

    createUser(request: CreateUserRequest): Observable<UserDTO> {
        return this.http.post<UserDTO>(`${this.basePath}/users`, request);
    }

    assignRole(userId: string, roleName: string): Observable<void> {
        return this.http.post<void>(`${this.basePath}/users/${userId}/roles`, { roleName });
    }

    createTeam(request: CreateTeamRequest): Observable<TeamDTO> {
        return this.http.post<TeamDTO>(`${this.basePath}/teams`, request);
    }

    assignUserToTeam(userId: string, teamId: string): Observable<void> {
        return this.http.post<void>(`${this.basePath}/team/${teamId}/users/${userId}`, {});
    }

    setManager(teamId: string, managerId: string): Observable<void> {
        return this.http.put<void>(`${this.basePath}/team/${teamId}/manager/${managerId}`, {});
    }
}

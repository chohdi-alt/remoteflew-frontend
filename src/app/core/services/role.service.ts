import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { APP_ROLES } from '../../models/auth.models';
import { RoleDTO } from '../../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly adminBasePath = '/api/admin';

  getRoles(): Observable<string[]> {
    return this.http.get<RoleDTO[]>(`${this.adminBasePath}/roles`).pipe(
      map((roles) => {
        const roleSet = new Set<string>(APP_ROLES);
        for (const role of roles ?? []) {
          const value = String(role?.name ?? '').trim().toUpperCase();
          if (value) {
            roleSet.add(value.startsWith('ROLE_') ? value.slice(5) : value);
          }
        }
        return Array.from(roleSet).sort();
      })
    );
  }
}

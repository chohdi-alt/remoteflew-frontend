import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { APP_ROLES } from '../../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  getRoles(): Observable<string[]> {
    return of([...APP_ROLES]);
  }
}

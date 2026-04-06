import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  finalize,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  catchError,
  forkJoin
} from 'rxjs';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { AdminUserDTO, CreateUserRequest, PageResponse } from '../../../models/admin.models';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';
import { UserCreateFormComponent, UserCreateFormResult } from './user-create-form.component';
import { UserFormComponent, UserFormResult } from './user-form.component';
import { AdminTabsComponent } from './admin-tabs.component';
import { AdminUserViewModel, UserTableComponent } from './user-table.component';

interface PageState {
  pageIndex: number;
  pageSize: number;
}

interface UserManagementViewModel {
  users: AdminUserViewModel[];
  total: number;
  filteredCount: number;
  pageIndex: number;
  pageSize: number;
}

const EMPTY_PAGE: PageResponse<AdminUserDTO> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 10,
  number: 0,
  numberOfElements: 0,
  first: true,
  last: true
};

function extractBackendErrorMessage(error: HttpErrorResponse): string | null {
  const payload = error.error;
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim();
  }

  if (payload && typeof payload === 'object') {
    const objectPayload = payload as {
      message?: unknown;
      fields?: Array<{ field?: unknown; message?: unknown }>;
    };

    if (typeof objectPayload.message === 'string' && objectPayload.message.trim().length > 0) {
      return objectPayload.message.trim();
    }

    if (Array.isArray(objectPayload.fields) && objectPayload.fields.length > 0) {
      const messages = objectPayload.fields
        .map((field) => (typeof field?.message === 'string' ? field.message.trim() : ''))
        .filter((message) => message.length > 0);
      if (messages.length > 0) {
        return messages.join(' | ');
      }
    }
  }

  return null;
}

export function resolveCreateUserErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Failed to create user.';
  }

  const backendMessage = extractBackendErrorMessage(error);

  if (error.status === 409) {
    return backendMessage ?? 'Email already exists.';
  }

  if (error.status === 400) {
    return backendMessage ?? 'Invalid user data. Please review the form.';
  }

  if (error.status >= 500) {
    return backendMessage ?? 'User creation failed due to a server error. Please retry.';
  }

  return backendMessage ?? 'Failed to create user.';
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    DashboardLayoutComponent,
    UserTableComponent,
    AdminTabsComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly pageSizeOptions = [10, 20, 50];

  private readonly pageState$ = new BehaviorSubject<PageState>({ pageIndex: 0, pageSize: 10 });
  private readonly refresh$ = new Subject<void>();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly loading$ = this.loadingSubject.asObservable();

  private readonly page$ = combineLatest([
    this.pageState$,
    this.refresh$.pipe(startWith(null))
  ]).pipe(
    switchMap(([state]) => {
      this.loadingSubject.next(true);
      return this.userService.getUsers(state.pageIndex, state.pageSize).pipe(
        catchError((error: unknown) => {
          console.error(error);
          const status = typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status ?? 0)
            : 0;

          if (status === 403) {
            this.toastr.error('Admin role is required to access this page.', 'User Management');
          } else if (status === 401) {
            this.toastr.error('Your session is not valid. Please sign in again.', 'User Management');
          } else {
            this.toastr.error('Unable to load users from the admin endpoint.', 'User Management');
          }

          return of(EMPTY_PAGE);
        }),
        finalize(() => this.loadingSubject.next(false)),
        map((page) => ({ page, state }))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly searchTerm$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    debounceTime(200),
    map((value) => value.trim().toLowerCase())
  );

  readonly roles$ = this.roleService.getRoles().pipe(
    catchError((error) => {
      console.error(error);
      this.toastr.error('Unable to load role directory.', 'User Management');
      return of([] as string[]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly viewModel$ = combineLatest([
    this.page$,
    this.searchTerm$
  ]).pipe(
    map(([pageResult, searchTerm]) => this.buildViewModel(pageResult.page, pageResult.state, searchTerm))
  );

  onPageChange(event: PageEvent): void {
    this.pageState$.next({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  syncUsers(): void {
    this.loadingSubject.next(true);
    this.userService
      .syncUsersFromKeycloak()
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: () => {
          this.toastr.success('User directory synchronized with Keycloak.', 'User Management');
          this.refresh();
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('User synchronization failed.', 'User Management');
        }
      });
  }

  openCreateUser(roles: string[]): void {
    const dialogRef = this.dialog.open(UserCreateFormComponent, {
      width: '460px',
      data: { availableRoles: roles }
    });

    dialogRef.afterClosed().subscribe((result: UserCreateFormResult | undefined) => {
      if (!result) {
        return;
      }

      this.loadingSubject.next(true);
      const role = this.normalizeRoles([result.role])[0];
      const payload: CreateUserRequest = {
        username: result.username,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        roles: role ? [role] : []
      };

      this.userService
        .createUser(payload)
        .pipe(finalize(() => this.loadingSubject.next(false)))
          .subscribe({
          next: () => {
            this.toastr.success('User created. Activation email sent.', 'User Management');
            this.refresh();
          },
          error: (error) => {
            console.error(error);
            this.toastr.error(resolveCreateUserErrorMessage(error), 'User Management');
          }
        });
    });
  }

  openEditUser(user: AdminUserViewModel, roles: string[]): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '420px',
      data: { user, availableRoles: roles }
    });

    dialogRef.afterClosed().subscribe((result: UserFormResult | undefined) => {
      if (!result) {
        return;
      }

      this.applyUserUpdate(user, result);
    });
  }

  toggleActivation(user: AdminUserViewModel, active: boolean): void {
    this.userService.updateUserActivation(user.externalId, active).subscribe({
      next: () => {
        this.toastr.success(`User ${active ? 'activated' : 'deactivated'}.`, 'User Management');
        this.refresh();
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Failed to update user activation.', 'User Management');
      }
    });
  }

  refresh(): void {
    this.refresh$.next();
  }

  private applyUserUpdate(user: AdminUserViewModel, result: UserFormResult): void {
    const updates = [];
    const normalizedRoles = this.normalizeRoles(result.roles);

    if (!this.areSameRoles(user.roles, normalizedRoles)) {
      updates.push(this.userService.updateUserRoles(user.externalId, normalizedRoles));
    }

    if (user.active !== result.active) {
      updates.push(this.userService.updateUserActivation(user.externalId, result.active));
    }

    if (updates.length === 0) {
      this.toastr.info('No changes detected.', 'User Management');
      return;
    }

    forkJoin(updates).subscribe({
      next: () => {
        this.toastr.success('User updated successfully.', 'User Management');
        this.refresh();
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Failed to update user details.', 'User Management');
      }
    });
  }

  private buildViewModel(
    page: PageResponse<AdminUserDTO>,
    state: PageState,
    searchTerm: string
  ): UserManagementViewModel {
    const users = page.content.map((user) => {
      return {
        externalId: user.externalId,
        fullName: user.fullName,
        email: user.email ?? null,
        matricule: user.matricule ?? null,
        roles: user.roles ?? [],
        teamName: user.teamName ?? null,
        active: user.active
      } as AdminUserViewModel;
    });

    const filtered = searchTerm
      ? users.filter((user) => this.matchesSearch(user, searchTerm))
      : users;

    return {
      users: filtered,
      total: page.totalElements,
      filteredCount: filtered.length,
      pageIndex: state.pageIndex,
      pageSize: state.pageSize
    };
  }

  private matchesSearch(user: AdminUserViewModel, term: string): boolean {
    const haystack = [
      user.fullName,
      user.email ?? '',
      user.matricule ?? '',
      user.teamName ?? '',
      ...user.roles
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  }

  private normalizeRoles(roles: string[]): string[] {
    return Array.from(
      new Set(
        (roles ?? []).map((role) => {
          const value = String(role ?? '').trim().toUpperCase();
          return value.startsWith('ROLE_') ? value.slice(5) : value;
        })
      )
    );
  }

  private areSameRoles(current: string[], next: string[]): boolean {
    if (current.length !== next.length) {
      return false;
    }
    const normalizedCurrent = this.normalizeRoles(current).sort();
    const normalizedNext = this.normalizeRoles(next).sort();
    return normalizedCurrent.every((role, index) => role === normalizedNext[index]);
  }
}

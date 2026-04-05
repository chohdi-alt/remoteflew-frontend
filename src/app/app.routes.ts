import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/Auth.guard';
import { RoleGuard } from './core/guards/Role.guard';
import { AccessDeniedComponent } from './core/layout/access-denied/access-denied.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./core/auth/change-password/change-password.component').then((m) => m.ChangePasswordComponent)
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./core/auth/activate-account/activate-account.component').then((m) => m.ActivateAccountComponent)
  },
  {
    path: 'employee',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['EMPLOYEE'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'requests/new',
        redirectTo: 'requests',
        pathMatch: 'full'
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./features/employee/requests/employee-request.component').then((m) => m.EmployeeRequestComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/employee/employee-dashboard.component').then(
            (m) => m.EmployeeRoleDashboardComponent
          )
      }
    ]
  },
  {
    path: 'manager',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'requests',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['ROLE_MANAGER'] },
        loadComponent: () =>
          import('./features/requests/manager-requests.component').then((m) => m.ManagerRequestsComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/manager/manager-dashboard.component').then((m) => m.ManagerDashboardComponent)
      },
      {
        path: 'scoring',
        loadComponent: () =>
          import('./features/scoring/manager/scoring-list.component').then((m) => m.ScoringListComponent)
      }
    ]
  },
  {
    path: 'hr',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['HR'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'requests',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['ROLE_HR'] },
        loadComponent: () => import('./features/requests/hr-requests.component').then((m) => m.HrRequestsComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/hr/hr-dashboard.component').then((m) => m.HrDashboardComponent)
      },
      {
        path: 'scoring-audit',
        loadComponent: () =>
          import('./features/scoring/hr/scoring-audit.component').then((m) => m.ScoringAuditComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'management', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/administration/user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          )
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/administration/user-management/team-management.component').then(
            (m) => m.TeamManagementComponent
          )
      },
      {
        path: 'smtp',
        loadComponent: () =>
          import('./features/administration/user-management/smtp-management.component').then(
            (m) => m.SmtpManagementComponent
          )
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent)
      },
      {
        path: 'archives',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/pages/archives/archives.component').then((m) => m.ArchivesComponent)
      }
    ]
  },
  { path: 'access-denied', component: AccessDeniedComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const RoleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data?.['roles'] as string[] | undefined) ?? [];

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (requiredRoles.length === 0 || auth.hasAnyRole(requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/access-denied']);
};

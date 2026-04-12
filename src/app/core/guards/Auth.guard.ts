import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const AuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.init().then(() => {
    if (auth.isAuthenticated()) {
      return true;
    }

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  });
};

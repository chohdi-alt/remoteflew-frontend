import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';

import { authInitFactory } from './core/auth/auth-init.factory';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
      progressBar: true,
      maxOpened: 3,
      timeOut: 4000
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: authInitFactory,
      multi: true,
      deps: [AuthService]
    }
  ]
};

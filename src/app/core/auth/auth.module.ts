import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AuthService } from './auth.service';
import { authInitFactory } from './auth-init.factory';

@NgModule({
  providers: [
    AuthService,
    {
      provide: APP_INITIALIZER,
      useFactory: authInitFactory,
      multi: true,
      deps: [AuthService]
    }
  ]
})
export class AuthModule {}

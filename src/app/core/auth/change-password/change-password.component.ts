import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthApiService } from '../../../services/auth-api.service';
import { AuthService } from '../auth.service';
import {
  KEYCLOAK_PASSWORD_POLICY,
  evaluatePasswordPolicy,
  passwordPolicyValidator,
  PasswordPolicy,
  PasswordPolicyState
} from '../password-policy.validator';

const PASSWORD_UPDATE_USERNAME_KEY = 'remoteflow.password_update.username';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);

  readonly passwordPolicy: PasswordPolicy = KEYCLOAK_PASSWORD_POLICY;
  readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required]],
      temporaryPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordPolicyValidator(KEYCLOAK_PASSWORD_POLICY)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    const username = this.readStoredUsername();
    if (!username) {
      this.errorMessage = 'Password update session not found. Please sign in again.';
      void this.router.navigateByUrl('/login');
      return;
    }

    this.form.controls.username.setValue(username);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const { username, temporaryPassword, newPassword } = this.form.getRawValue();

    this.authApi
      .changePassword({
        username,
        temporaryPassword,
        newPassword
      })
      .pipe(
        switchMap(() => this.auth.login(username, newPassword)),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: () => {
          this.clearStoredUsername();
          void this.router.navigateByUrl(this.auth.getDashboardRouteForRole(this.auth.getPrimaryRole()));
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveChangePasswordErrorMessage(error);
        }
      });
  }

  get hasPasswordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'] && this.form.touched;
  }

  get passwordPolicyState(): PasswordPolicyState {
    return evaluatePasswordPolicy(this.form.controls.newPassword.value, this.passwordPolicy);
  }

  get showPasswordPolicyFeedback(): boolean {
    const control = this.form.controls.newPassword;
    return control.touched || control.dirty || this.isSubmitting;
  }

  private readStoredUsername(): string | null {
    if (typeof globalThis.sessionStorage === 'undefined') {
      return null;
    }

    const value = globalThis.sessionStorage.getItem(PASSWORD_UPDATE_USERNAME_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  }

  private clearStoredUsername(): void {
    if (typeof globalThis.sessionStorage === 'undefined') {
      return;
    }

    globalThis.sessionStorage.removeItem(PASSWORD_UPDATE_USERNAME_KEY);
  }

  private resolveChangePasswordErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Unable to change password right now. Please try again.';
    }

    const backendMessage = this.extractBackendErrorMessage(error);

    if (error.status === 401) {
      return backendMessage ?? 'Temporary password is invalid. Please check your credentials.';
    }
    if (error.status === 400 || error.status === 409) {
      return backendMessage ?? 'Password does not satisfy security requirements.';
    }
    if (error.status === 502 || error.status === 503) {
      return backendMessage ?? 'Authentication service is temporarily unavailable. Please retry.';
    }
    if (error.status >= 500) {
      return backendMessage ?? 'Unable to change password right now. Please try again.';
    }

    return backendMessage ?? 'Unable to change password right now. Please try again.';
  }

  private extractBackendErrorMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error.trim();
    }

    if (error.error && typeof error.error === 'object') {
      const payload = error.error as { message?: unknown };
      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        return payload.message.trim();
      }
    }

    return null;
  }
}

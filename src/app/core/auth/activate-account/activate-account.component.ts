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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../../services/auth-api.service';
import {
  KEYCLOAK_PASSWORD_POLICY,
  evaluatePasswordPolicy,
  passwordPolicyValidator,
  PasswordPolicy,
  PasswordPolicyState
} from '../password-policy.validator';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!newPassword || !confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.css'
})
export class ActivateAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);

  readonly passwordPolicy: PasswordPolicy = KEYCLOAK_PASSWORD_POLICY;
  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, passwordPolicyValidator(KEYCLOAK_PASSWORD_POLICY)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  isSubmitting = false;
  success = false;
  successUsername: string | null = null;
  errorMessage = '';
  token: string | null = null;

  ngOnInit(): void {
    const rawToken = this.route.snapshot.queryParamMap.get('token');
    this.token = rawToken && rawToken.trim().length > 0 ? rawToken.trim() : null;
    if (!this.token) {
      this.errorMessage = 'Activation token is missing. Please use the full link from your email.';
    }
  }

  submit(): void {
    if (!this.token || this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authApi
      .activateAccount({
        token: this.token,
        newPassword: this.form.controls.newPassword.value
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          this.success = true;
          this.successUsername = response.username ?? null;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveActivationErrorMessage(error);
        }
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
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

  private resolveActivationErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Unable to activate your account right now. Please try again later.';
    }

    const backendMessage = this.extractBackendErrorMessage(error);

    if (error.status === 401) {
      return backendMessage ?? 'Activation token is invalid or expired.';
    }
    if (error.status === 400 || error.status === 409) {
      return backendMessage ?? 'Password does not satisfy security requirements.';
    }
    if (error.status === 502 || error.status === 503) {
      return backendMessage ?? 'Authentication service is temporarily unavailable. Please retry.';
    }
    if (error.status >= 500) {
      return backendMessage ?? 'Unable to activate your account right now. Please try again later.';
    }

    return backendMessage ?? 'Unable to activate your account right now. Please try again later.';
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

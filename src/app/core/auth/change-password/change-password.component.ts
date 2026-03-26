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

  readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required]],
      temporaryPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
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
          if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
              this.errorMessage = 'Temporary password is invalid. Please check your credentials.';
              return;
            }

            if (error.status === 400) {
              const message =
                typeof error.error === 'object' &&
                error.error !== null &&
                'message' in error.error &&
                typeof (error.error as { message?: unknown }).message === 'string'
                  ? (error.error as { message: string }).message
                  : 'Unable to change password. Please verify the form values.';
              this.errorMessage = message;
              return;
            }
          }

          this.errorMessage = 'Unable to change password right now. Please try again.';
        }
      });
  }

  get hasPasswordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'] && this.form.touched;
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
}

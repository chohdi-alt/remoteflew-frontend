import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AppRole, AuthError, AuthErrorType } from '../../../models/auth.models';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  private static readonly PASSWORD_UPDATE_USERNAME_KEY = 'remoteflow.password_update.username';

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  errorMessage = '';
  retryAfterSeconds: number | null = null;
  lockUntil: number | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.redirectToDashboard(this.auth.getPrimaryRole());
      return;
    }

    this.restoreTimer();
  }

  private restoreTimer(): void {
    const stored = sessionStorage.getItem('lockUntil');
    if (stored) {
      this.lockUntil = Number(stored);
      const remaining = Math.floor((this.lockUntil - Date.now()) / 1000);

      if (remaining > 0) {
        this.retryAfterSeconds = remaining;
        this.startCountdown();
      } else {
        sessionStorage.removeItem('lockUntil');
      }
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const { username, password } = this.form.getRawValue();

    this.auth
      .login(username, password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          if (typeof result === 'object' && result !== null && 'success' in result && result.success === false) {
            this.handleAuthError(result.error);
            return;
          }

          this.clearPasswordUpdateUsername();
          sessionStorage.removeItem('lockUntil');
          this.lockUntil = null;
          this.retryAfterSeconds = null;
          this.redirectToDashboard(this.auth.getPrimaryRole());
        },
        error: () => {
          this.auth.clearSession();
          this.errorMessage = 'An unexpected error occurred. Please try again.';
        }
      });
  }

  private handleAuthError(error: AuthError): void {
    this.auth.clearSession();

    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        this.errorMessage = 'Invalid username or password.';
        break;
      case AuthErrorType.TEMPORARY_LOCK: {
        const retry = error.retryAfterSeconds ?? 60;
        this.lockUntil = Date.now() + retry * 1000;
        sessionStorage.setItem('lockUntil', this.lockUntil.toString());
        this.startCountdown();
        break;
      }
      case AuthErrorType.ACCOUNT_DISABLED:
        this.errorMessage = 'Your account has been disabled. Contact your administrator.';
        break;
      case AuthErrorType.PASSWORD_RESET_REQUIRED:
        this.errorMessage = 'Your account was reactivated. Please check your email to reset your password.';
        break;
      case AuthErrorType.UNKNOWN:
      default:
        this.errorMessage = 'An unexpected error occurred. Please try again.';
        break;
    }
  }

  private startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.updateLockMessage();
    this.countdownInterval = setInterval(() => {
      if (!this.lockUntil) {
        this.clearTimer();
        return;
      }

      const remaining = Math.floor((this.lockUntil - Date.now()) / 1000);

      if (remaining > 0) {
        this.retryAfterSeconds = remaining;
        this.updateLockMessage();
      } else {
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer() {
    this.retryAfterSeconds = 0;
    this.lockUntil = null;
    sessionStorage.removeItem('lockUntil');
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.errorMessage = '';
  }

  private updateLockMessage() {
    this.errorMessage = `Too many failed attempts. Try again in ${this.retryAfterSeconds} seconds.`;
  }

  private redirectToDashboard(role: AppRole | string | null | undefined): void {
    void this.router.navigateByUrl(this.auth.getDashboardRouteForRole(role));
  }

  private storePasswordUpdateUsername(username: string): void {
    if (typeof globalThis.sessionStorage === 'undefined') {
      return;
    }
    globalThis.sessionStorage.setItem(LoginComponent.PASSWORD_UPDATE_USERNAME_KEY, username);
  }

  private clearPasswordUpdateUsername(): void {
    if (typeof globalThis.sessionStorage === 'undefined') {
      return;
    }
    globalThis.sessionStorage.removeItem(LoginComponent.PASSWORD_UPDATE_USERNAME_KEY);
  }
}


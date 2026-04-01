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

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
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
          if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
              this.errorMessage = 'Activation token is invalid or expired.';
              return;
            }
            if (
              typeof error.error === 'object' &&
              error.error !== null &&
              'message' in error.error &&
              typeof (error.error as { message?: unknown }).message === 'string'
            ) {
              this.errorMessage = (error.error as { message: string }).message;
              return;
            }
          }
          this.errorMessage = 'Unable to activate your account right now. Please try again later.';
        }
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  get hasPasswordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'] && this.form.touched;
  }
}

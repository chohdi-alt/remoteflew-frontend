import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AppRole } from '../../../models/auth.models';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.auth.isAuthenticated() || this.hasStoredToken()) {
      this.redirectToDashboard(this.readStoredRole());
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
        next: () => {
          this.redirectToDashboard(this.auth.getPrimaryRole());
        },
        error: (error: unknown) => {
          this.auth.clearSession();
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.errorMessage = 'Invalid username or password.';
            return;
          }
          this.errorMessage = 'Unable to log in right now. Please try again.';
        }
      });
  }

  private redirectToDashboard(role: AppRole | string | null | undefined): void {
    void this.router.navigateByUrl(this.auth.getDashboardRouteForRole(role));
  }

  private readStoredRole(): AppRole | null {
    if (typeof globalThis.localStorage === 'undefined') {
      return this.auth.getPrimaryRole();
    }

    return (localStorage.getItem('user_role') as AppRole | null) ?? this.auth.getPrimaryRole();
  }

  private hasStoredToken(): boolean {
    return typeof globalThis.localStorage !== 'undefined' && !!localStorage.getItem('access_token');
  }
}


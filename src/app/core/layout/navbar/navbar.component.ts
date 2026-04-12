import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated() || this.authService.hasRefreshToken();
  }

  navigateToDashboard(): void {
    void this.router.navigateByUrl(this.getDashboardRoute());
  }

  navigateToProfile(): void {
    void this.router.navigate([this.getDashboardRoute()], {
      queryParams: { section: 'profile' }
    });
  }

  logout(): void {
    void this.authService.logout();
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  isManager(): boolean {
    return this.authService.hasRole('MANAGER');
  }

  isHr(): boolean {
    return this.authService.hasRole('HR');
  }

  isEmployee(): boolean {
    return this.authService.hasRole('EMPLOYEE');
  }

  private getDashboardRoute(): string {
    if (this.authService.hasRole('ADMIN')) {
      return '/admin/dashboard';
    }
    if (this.authService.hasRole('HR')) {
      return '/hr/dashboard';
    }
    if (this.authService.hasRole('MANAGER')) {
      return '/manager/dashboard';
    }
    if (this.authService.hasRole('EMPLOYEE')) {
      return '/employee/dashboard';
    }
    return '/login';
  }
}

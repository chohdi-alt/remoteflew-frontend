import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  private readonly currentUrlSubject = new BehaviorSubject<string>(this.router.url);
  readonly currentUrl$ = this.currentUrlSubject.asObservable();
  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly showEmployeeMobileNav$ = combineLatest([this.isHandset$, this.currentUrl$]).pipe(
    map(([isHandset, url]) => isHandset && this.isEmployee() && this.isUserPage(url)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  isDrawerOpen = false;

  constructor() {
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((event) => event instanceof NavigationEnd ? event.urlAfterRedirects : null)
      )
      .subscribe((url) => {
        if (!url) {
          return;
        }
        this.currentUrlSubject.next(url);
        this.closeDrawer();
      });
  }

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
    this.closeDrawer();
    void this.authService.logout();
  }

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDrawer();
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

  private isUserPage(url: string): boolean {
    return (
      url.startsWith('/employee/dashboard') ||
      url.startsWith('/employee/requests')
    );
  }
}

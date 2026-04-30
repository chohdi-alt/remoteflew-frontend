import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, shareReplay } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-validation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './validation-detail.component.html',
  styleUrl: './validation-detail.component.css'
})
export class ValidationDetailComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly validationId = this.route.snapshot.paramMap.get('id');
  isDrawerOpen = false;

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  logout(): void {
    this.closeDrawer();
    void this.authService.logout();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDrawer();
  }
}

import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [],
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.css']
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  goBack(): void {
    if (typeof history !== 'undefined' && history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/']);
  }
}


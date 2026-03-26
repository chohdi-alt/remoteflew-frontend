import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-tabs">
      <a routerLink="/admin/users" routerLinkActive="active" class="tab-link">Users</a>
      <a routerLink="/admin/teams" routerLinkActive="active" class="tab-link">Teams</a>
    </div>
  `,
  styles: [`
    .admin-tabs {
      display: flex;
      gap: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
    }

    .tab-link {
      text-decoration: none;
      color: #718096;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      position: relative;
      padding: 0.5rem 0;
    }

    .tab-link:hover {
      color: #2d3748;
    }

    .tab-link.active {
      color: #3b82f6;
    }

    .tab-link.active::after {
      content: '';
      position: absolute;
      bottom: -0.6rem;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #3b82f6;
      border-radius: 2px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTabsComponent {}

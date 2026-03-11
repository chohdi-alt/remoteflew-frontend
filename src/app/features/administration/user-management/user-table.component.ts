import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface AdminUserViewModel {
  externalId: string;
  fullName: string;
  email: string | null;
  matricule: string | null;
  roles: string[];
  teamName: string | null;
  active: boolean;
}

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserTableComponent {
  @Input() users: AdminUserViewModel[] = [];
  @Input() total = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() editUser = new EventEmitter<AdminUserViewModel>();
  @Output() toggleActivation = new EventEmitter<{ user: AdminUserViewModel; active: boolean }>();
  @Output() assignTeam = new EventEmitter<AdminUserViewModel>();

  readonly displayedColumns: string[] = [
    'fullName',
    'email',
    'matricule',
    'roles',
    'team',
    'status',
    'actions'
  ];

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onEditUser(user: AdminUserViewModel): void {
    this.editUser.emit(user);
  }

  onToggleActivation(user: AdminUserViewModel): void {
    this.toggleActivation.emit({ user, active: !user.active });
  }

  onAssignTeam(user: AdminUserViewModel): void {
    this.assignTeam.emit(user);
  }
}

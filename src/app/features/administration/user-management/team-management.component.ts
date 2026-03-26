import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  finalize,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  catchError,
  forkJoin
} from 'rxjs';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { TeamDirectoryDTO, UserDirectoryDTO } from '../../../models/admin.models';
import { TeamService } from '../../../core/services/team.service';
import { UserService } from '../../../core/services/user.service';
import { TeamFormComponent, TeamFormData, TeamFormResult } from './team-form.component';

interface TeamViewModel {
  id: number;
  name: string;
  manager: string | null;
  membersCount: number;
}

import { AdminTabsComponent } from './admin-tabs.component';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    DashboardLayoutComponent,
    AdminTabsComponent
  ],
  templateUrl: './team-management.component.html',
  styleUrl: './team-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamManagementComponent {
  private readonly teamService = inject(TeamService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = ['name', 'manager', 'members', 'actions'];

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly teams$ = this.refresh$.pipe(
    switchMap(() =>
      this.teamService.getTeams().pipe(
        catchError((error) => {
          console.error(error);
          this.toastr.error('Unable to load teams.', 'Team Management');
          return of([] as TeamDirectoryDTO[]);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly searchTerm$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    debounceTime(200),
    map((value) => value.trim().toLowerCase())
  );

  readonly viewModel$ = combineLatest([this.teams$, this.searchTerm$]).pipe(
    map(([teams, term]) => {
      const mapped = teams.map<TeamViewModel>((team) => ({
        id: team.id,
        name: team.name,
        manager: team.manager,
        membersCount: team.membersCount
      }));
      return term
        ? mapped.filter((team) => `${team.name} ${team.manager ?? ''}`.toLowerCase().includes(term))
        : mapped;
    })
  );

  openCreateTeam(): void {
    this.loadingSubject.next(true);
    forkJoin({
      managers: this.userService.getManagers().pipe(catchError(() => of([] as UserDirectoryDTO[]))),
      members: this.userService.getUserDirectory().pipe(catchError(() => of([] as UserDirectoryDTO[])))
    })
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: ({ managers, members }) => {
          const dialogRef = this.dialog.open(TeamFormComponent, {
            width: '520px',
            data: {
              mode: 'create',
              team: null,
              managers,
              members,
              selectedMemberIds: []
            } as TeamFormData
          });

          dialogRef.afterClosed().subscribe((result: TeamFormResult | undefined) => {
            if (!result) {
              return;
            }
            this.createTeam(result);
          });
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('Unable to prepare team creation.', 'Team Management');
        }
      });
  }

  openViewTeam(team: TeamViewModel): void {
    this.loadingSubject.next(true);

    forkJoin({
      managers: this.userService.getManagers().pipe(catchError(() => of([] as UserDirectoryDTO[]))),
      members: this.userService.getUserDirectory().pipe(catchError(() => of([] as UserDirectoryDTO[]))),
      selectedMembers: this.teamService.getTeamMembers(team.id).pipe(catchError(() => of([] as UserDirectoryDTO[])))
    })
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: ({ managers, members, selectedMembers }) => {
          const dialogRef = this.dialog.open(TeamFormComponent, {
            width: '520px',
            data: {
              mode: 'edit',
              team,
              managers,
              members,
              selectedMemberIds: selectedMembers.map((member) => member.externalId)
            } as TeamFormData
          });

          dialogRef.afterClosed().subscribe((result: TeamFormResult | undefined) => {
            if (!result) {
              return;
            }
            this.updateTeam(team, result);
          });
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('Unable to load team details.', 'Team Management');
        }
      });
  }

  private createTeam(result: TeamFormResult): void {
    if (!result.managerExternalId) {
      this.toastr.error('Manager is required to create a team.', 'Team Management');
      return;
    }

    this.loadingSubject.next(true);
    this.teamService
      .createTeam({ name: result.name, managerExternalId: result.managerExternalId })
      .pipe(
        switchMap((team) => {
          const members = result.memberExternalIds ?? [];
          if (!members.length) {
            return of(team);
          }
          return this.teamService
            .updateTeamMembers(team.id, { userExternalIds: members })
            .pipe(map(() => team));
        }),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Team created successfully.', 'Team Management');
          this.refreshTeams();
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('Failed to create team.', 'Team Management');
        }
      });
  }

  private updateTeam(team: TeamViewModel, result: TeamFormResult): void {
    const updates = [];

    if (result.managerExternalId) {
      updates.push(
        this.teamService.updateTeamManager(team.id, { managerExternalId: result.managerExternalId })
      );
    }

    updates.push(
      this.teamService.updateTeamMembers(team.id, { userExternalIds: result.memberExternalIds ?? [] })
    );

    if (!updates.length) {
      this.toastr.info('No changes to apply.', 'Team Management');
      return;
    }

    this.loadingSubject.next(true);
    forkJoin(updates)
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: () => {
          this.toastr.success('Team updated successfully.', 'Team Management');
          this.refreshTeams();
        },
        error: (error) => {
          console.error(error);
          this.toastr.error('Failed to update team.', 'Team Management');
        }
      });
  }

  private refreshTeams(): void {
    this.refresh$.next(undefined);
  }
}

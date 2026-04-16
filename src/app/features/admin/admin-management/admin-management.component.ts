import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { BehaviorSubject, catchError, forkJoin, of } from 'rxjs';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { AdminDirectoryService, TeamDTO, UserDTO } from '../../../services/admin-directory.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
    selector: 'app-admin-management',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTableModule,
        MatIconModule,
        MatTabsModule,
        DashboardLayoutComponent
    ],
    templateUrl: './admin-management.component.html',
    styleUrl: './admin-management.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminManagementComponent implements OnInit {
    private readonly adminService = inject(AdminDirectoryService);
    private readonly fb = inject(FormBuilder);

    readonly users$ = new BehaviorSubject<UserDTO[]>([]);
    readonly teams$ = new BehaviorSubject<TeamDTO[]>([]);
    readonly managers$ = new BehaviorSubject<UserDTO[]>([]);
    readonly hrUsers$ = new BehaviorSubject<UserDTO[]>([]);

    readonly userColumns = ['name', 'email', 'roles', 'team', 'actions'];
    readonly teamColumns = ['name', 'manager', 'membersCount', 'actions'];
    readonly directoryColumns = ['name', 'email', 'roles'];

    createUserForm: FormGroup;
    createTeamForm: FormGroup;
    assignTeamForm: FormGroup;
    assignManagerForm: FormGroup;
    assignRoleForm: FormGroup;

    feedbackMessage$ = new BehaviorSubject<string | null>(null);

    constructor() {
        this.createUserForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            roles: [['EMPLOYEE'], Validators.required]
        });

        this.createTeamForm = this.fb.group({
            name: ['', Validators.required]
        });

        this.assignTeamForm = this.fb.group({
            userId: ['', Validators.required],
            teamId: ['', Validators.required]
        });

        this.assignManagerForm = this.fb.group({
            teamId: ['', Validators.required],
            managerId: ['', Validators.required]
        });

        this.assignRoleForm = this.fb.group({
            userId: ['', Validators.required],
            roleName: ['', Validators.required]
        });
    }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        forkJoin({
            users: this.adminService.getUsers().pipe(catchError(() => of([]))),
            teams: this.adminService.getTeams().pipe(catchError(() => of([]))),
            managers: this.adminService.getManagers().pipe(catchError(() => of([]))),
            hr: this.adminService.getHrUsers().pipe(catchError(() => of([])))
        }).subscribe(data => {
            this.users$.next(data.users);
            this.teams$.next(data.teams);
            this.managers$.next(data.managers);
            this.hrUsers$.next(data.hr);
        });
    }

    showFeedback(msg: string) {
        this.feedbackMessage$.next(msg);
        setTimeout(() => this.feedbackMessage$.next(null), 3000);
    }

    onCreateUser() {
        if (this.createUserForm.valid) {
            this.adminService.createUser(this.createUserForm.value).subscribe({
                next: () => {
                    this.showFeedback('User created successfully');
                    this.createUserForm.reset({ roles: ['EMPLOYEE'] });
                    this.loadData();
                },
                error: () => this.showFeedback('Failed to create user')
            });
        }
    }

    onCreateTeam() {
        if (this.createTeamForm.valid) {
            this.adminService.createTeam(this.createTeamForm.value).subscribe({
                next: () => {
                    this.showFeedback('Team created successfully');
                    this.createTeamForm.reset();
                    this.loadData();
                },
                error: () => this.showFeedback('Failed to create team')
            });
        }
    }

    onAssignTeam() {
        if (this.assignTeamForm.valid) {
            const { userId, teamId } = this.assignTeamForm.value;
            this.adminService.assignUserToTeam(userId, teamId).subscribe({
                next: () => {
                    this.showFeedback('User assigned to team');
                    this.assignTeamForm.reset();
                    this.loadData();
                },
                error: () => this.showFeedback('Failed to assign team')
            });
        }
    }

    onAssignManager() {
        if (this.assignManagerForm.valid) {
            const { teamId, managerId } = this.assignManagerForm.value;
            this.adminService.setManager(teamId, managerId).subscribe({
                next: () => {
                    this.showFeedback('Manager updated successfully');
                    this.assignManagerForm.reset();
                    this.loadData();
                },
                error: () => this.showFeedback('Failed to assign manager')
            });
        }
    }

    onAssignRole() {
        if (this.assignRoleForm.valid) {
            const { userId, roleName } = this.assignRoleForm.value;
            this.adminService.assignRole(userId, roleName).subscribe({
                next: () => {
                    this.showFeedback('Role assigned successfully');
                    this.assignRoleForm.reset();
                    this.loadData();
                },
                error: () => this.showFeedback('Failed to assign role')
            });
        }
    }

    selectUserForRole(userId: string) {
        this.assignRoleForm.patchValue({ userId });
        this.scrollToForm('role-form');
    }

    selectUserForTeam(userId: string) {
        this.assignTeamForm.patchValue({ userId });
        this.scrollToForm('team-assign-form');
    }

    selectTeamForManager(teamId: string) {
        this.assignManagerForm.patchValue({ teamId });
        this.scrollToForm('manager-assign-form');
    }

    scrollToForm(elementId: string) {
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
    }
}

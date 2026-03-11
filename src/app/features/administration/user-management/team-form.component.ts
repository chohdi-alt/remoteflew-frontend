import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TeamDirectoryDTO, UserDirectoryDTO } from '../../../models/admin.models';

export interface TeamFormData {
  mode: 'create' | 'edit';
  team: TeamDirectoryDTO | null;
  managers: UserDirectoryDTO[];
  members: UserDirectoryDTO[];
  selectedMemberIds: string[];
}

export interface TeamFormResult {
  name: string;
  managerExternalId: string | null;
  memberExternalIds: string[];
}

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamFormComponent {
  readonly form: FormGroup<{
    name: FormControl<string>;
    managerExternalId: FormControl<string | null>;
    memberExternalIds: FormControl<string[]>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<TeamFormComponent, TeamFormResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: TeamFormData
  ) {
    this.form = this.fb.group({
      name: this.fb.nonNullable.control(this.data.team?.name ?? '', Validators.required),
      managerExternalId: this.fb.control<string | null>(null, this.data.mode === 'create' ? Validators.required : []),
      memberExternalIds: this.fb.nonNullable.control<string[]>(this.data.selectedMemberIds ?? [])
    });

    if (data.mode === 'edit') {
      this.form.controls.name.disable();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name.trim(),
      managerExternalId: this.normalizeOptional(raw.managerExternalId),
      memberExternalIds: raw.memberExternalIds ?? []
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}


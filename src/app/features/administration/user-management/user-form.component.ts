import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AdminUserViewModel } from './user-table.component';

export interface UserFormData {
  user: AdminUserViewModel;
  availableRoles: string[];
}

export interface UserFormResult {
  roles: string[];
  active: boolean;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
  readonly form: FormGroup<{
    roles: FormControl<string[]>;
    active: FormControl<boolean>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<UserFormComponent, UserFormResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserFormData
  ) {
    this.form = this.fb.group({
      roles: this.fb.nonNullable.control<string[]>([...this.data.user.roles], Validators.required),
      active: this.fb.nonNullable.control(this.data.user.active)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      roles: this.form.controls.roles.value ?? [],
      active: this.form.controls.active.value
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

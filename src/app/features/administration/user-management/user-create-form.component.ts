import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface UserCreateFormData {
  availableRoles: string[];
}

export interface UserCreateFormResult {
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

@Component({
  selector: 'app-user-create-form',
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
  templateUrl: './user-create-form.component.html',
  styleUrl: './user-create-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCreateFormComponent {
  readonly form: FormGroup<{
    username: FormControl<string>;
    email: FormControl<string>;
    firstName: FormControl<string | null>;
    lastName: FormControl<string | null>;
    role: FormControl<string>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<UserCreateFormComponent, UserCreateFormResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserCreateFormData
  ) {
    const defaultRole = this.data.availableRoles[0] ?? 'EMPLOYEE';
    this.form = this.fb.group({
      username: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S+/)]),
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
      firstName: this.fb.control<string | null>(null),
      lastName: this.fb.control<string | null>(null),
      role: this.fb.nonNullable.control(defaultRole, Validators.required)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      username: this.normalizeRequired(raw.username),
      email: this.normalizeRequired(raw.email),
      firstName: this.normalizeOptional(raw.firstName),
      lastName: this.normalizeOptional(raw.lastName),
      role: this.normalizeRequired(raw.role)
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

  private normalizeRequired(value: string): string {
    return value.trim();
  }
}

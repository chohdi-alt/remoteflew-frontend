import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RequestTableRow } from './request-table.component';

export type RequestDecisionAction = 'approve' | 'reject';

export interface RequestDecisionDialogData {
  request: RequestTableRow;
  role: 'MANAGER' | 'HR';
  initialAction: RequestDecisionAction;
}

export interface RequestDecisionDialogResult {
  action: RequestDecisionAction;
  comment: string | null;
}

@Component({
  selector: 'app-request-decision-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './request-decision-dialog.component.html',
  styleUrl: './request-decision-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestDecisionDialogComponent {
  readonly form: FormGroup<{
    comment: FormControl<string>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RequestDecisionDialogComponent, RequestDecisionDialogResult>,
    @Inject(MAT_DIALOG_DATA) readonly data: RequestDecisionDialogData
  ) {
    this.form = this.fb.group({
      comment: this.fb.nonNullable.control('')
    });
  }

  approve(): void {
    this.dialogRef.close({
      action: 'approve',
      comment: this.normalizedComment()
    });
  }

  reject(): void {
    this.dialogRef.close({
      action: 'reject',
      comment: this.normalizedComment()
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private normalizedComment(): string | null {
    const value = this.form.controls.comment.value.trim();
    return value.length > 0 ? value : null;
  }
}

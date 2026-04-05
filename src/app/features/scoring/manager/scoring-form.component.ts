import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagerScoreSubmissionRequest, TeleworkScoreSummaryDTO } from '../../../models/scoring.models';

@Component({
  selector: 'app-scoring-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './scoring-form.component.html',
  styleUrl: './scoring-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringFormComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) score: TeleworkScoreSummaryDTO | null = null;
  @Input() submitting = false;
  @Output() submitScore = new EventEmitter<ManagerScoreSubmissionRequest>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly form = this.formBuilder.group({
    attendance: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    tasks: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    punctuality: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    behavior: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    comments: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['score']) {
      this.form.reset({
        attendance: null,
        tasks: null,
        punctuality: null,
        behavior: null,
        comments: ''
      });
    }
  }

  get previewTotal(): number | null {
    const attendance = this.form.controls.attendance.value;
    const tasks = this.form.controls.tasks.value;
    const punctuality = this.form.controls.punctuality.value;
    const behavior = this.form.controls.behavior.value;

    if (
      attendance == null ||
      tasks == null ||
      punctuality == null ||
      behavior == null
    ) {
      return null;
    }

    const total = attendance * 0.3 + tasks * 0.3 + punctuality * 0.2 + behavior * 0.2;
    return Math.round(total * 100) / 100;
  }

  get requiresJustification(): boolean {
    const total = this.previewTotal;
    return total != null && total < 60;
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const total = this.previewTotal;
    const commentValue = this.form.controls.comments.value?.trim() ?? '';
    if (total != null && total < 60 && !commentValue) {
      this.form.controls.comments.setErrors({ requiredForLowScore: true });
      return;
    }

    this.submitScore.emit({
      attendance: this.form.controls.attendance.value as number,
      tasks: this.form.controls.tasks.value as number,
      punctuality: this.form.controls.punctuality.value as number,
      behavior: this.form.controls.behavior.value as number,
      comments: commentValue || null
    });
  }
}

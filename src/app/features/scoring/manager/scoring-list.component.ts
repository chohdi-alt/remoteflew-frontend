import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { ManagerScoreSubmissionRequest, TeleworkScoreSummaryDTO } from '../../../models/scoring.models';
import { ScoringApiService } from '../../../services/scoring-api.service';
import { map, shareReplay } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

type RiskLevel = '' | 'LOW' | 'MEDIUM' | 'HIGH';

interface ScoreModalSnapshot {
  attendance: number | null;
  tasks: number | null;
  punctuality: number | null;
  behavior: number | null;
  managerComment: string;
  decisionNote: string;
  riskLevel: RiskLevel;
  recommendation: string;
}

interface ScoreModalForm {
  attendance: FormControl<number | null>;
  tasks: FormControl<number | null>;
  punctuality: FormControl<number | null>;
  behavior: FormControl<number | null>;
  managerComment: FormControl<string>;
  decisionNote: FormControl<string>;
  riskLevel: FormControl<RiskLevel>;
  recommendation: FormControl<string>;
}

@Component({
  selector: 'app-scoring-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, DashboardLayoutComponent],
  templateUrl: './scoring-list.component.html',
  styleUrl: './scoring-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringListComponent implements OnInit {
  private readonly scoringApi = inject(ScoringApiService);
  private readonly toastr = inject(ToastrService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly scoreDraftById = new Map<number, ScoreModalSnapshot>();

  protected readonly loading = signal<boolean>(false);
  protected readonly submitting = signal<boolean>(false);
  protected readonly modalOpen = signal<boolean>(false);
  protected readonly pendingScores = signal<TeleworkScoreSummaryDTO[]>([]);
  protected readonly selectedScore = signal<TeleworkScoreSummaryDTO | null>(null);
  protected readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  @ViewChild('managerCommentField') private managerCommentField?: ElementRef<HTMLTextAreaElement>;
  isDrawerOpen = false;

  protected readonly scoreModalForm = this.formBuilder.group<ScoreModalForm>({
    attendance: this.formBuilder.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    tasks: this.formBuilder.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    punctuality: this.formBuilder.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    behavior: this.formBuilder.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    managerComment: this.formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(1500)],
      nonNullable: true
    }),
    decisionNote: this.formBuilder.control('', {
      validators: [Validators.maxLength(800)],
      nonNullable: true
    }),
    riskLevel: this.formBuilder.control<RiskLevel>('', { nonNullable: true }),
    recommendation: this.formBuilder.control('', {
      validators: [Validators.maxLength(800)],
      nonNullable: true
    })
  });

  ngOnInit(): void {
    this.loadPendingScores();
  }

  protected selectScore(score: TeleworkScoreSummaryDTO): void {
    this.openModal(score);
  }

  protected clearSelection(): void {
    this.selectedScore.set(null);
    this.closeModal();
  }

  protected loadPendingScores(): void {
    this.loading.set(true);
    this.scoringApi.getManagerPendingScores().subscribe({
      next: (rows) => {
        this.pendingScores.set(rows);
        if (rows.length === 0) {
          this.selectedScore.set(null);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('Unable to load pending scoring items.', 'Scoring');
      }
    });
  }

  protected openModal(row: TeleworkScoreSummaryDTO): void {
    this.selectedScore.set(row);
    const draft = this.scoreDraftById.get(row.scoreId);
    this.scoreModalForm.setValue({
      attendance: draft?.attendance ?? null,
      tasks: draft?.tasks ?? null,
      punctuality: draft?.punctuality ?? null,
      behavior: draft?.behavior ?? null,
      managerComment: draft?.managerComment ?? '',
      decisionNote: draft?.decisionNote ?? '',
      riskLevel: draft?.riskLevel ?? '',
      recommendation: draft?.recommendation ?? ''
    });
    this.modalOpen.set(true);
    this.focusManagerComment();
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  logout(): void {
    this.closeDrawer();
    void this.authService.logout();
  }

  protected submitScore(): void {
    const selected = this.selectedScore();
    if (!selected) {
      return;
    }

    this.scoreModalForm.markAllAsTouched();
    if (this.scoreModalForm.invalid) {
      return;
    }

    const {
      attendance,
      tasks,
      punctuality,
      behavior,
      managerComment,
      decisionNote,
      riskLevel,
      recommendation
    } = this.scoreModalForm.getRawValue();

    if (
      attendance === null ||
      tasks === null ||
      punctuality === null ||
      behavior === null
    ) {
      return;
    }

    const mergedComment = this.buildMergedComment({
      managerComment,
      decisionNote,
      riskLevel,
      recommendation
    });
    const payload: ManagerScoreSubmissionRequest = {
      attendance,
      tasks,
      punctuality,
      behavior,
      comments: mergedComment
    };

    this.submitting.set(true);
    this.scoringApi.submitManagerScore(selected.requestId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.scoreDraftById.set(selected.scoreId, {
          attendance,
          tasks,
          punctuality,
          behavior,
          managerComment,
          decisionNote,
          riskLevel,
          recommendation
        });
        this.toastr.success('Score submitted successfully.', 'Scoring');
        this.modalOpen.set(false);
        this.selectedScore.set(null);
        this.loadPendingScores();
      },
      error: (error) => {
        this.submitting.set(false);
        const message = error?.error?.message ?? 'Unable to submit score.';
        this.toastr.error(message, 'Scoring');
      }
    });
  }

  protected readonly riskLevels: ReadonlyArray<{ value: RiskLevel; label: string }> = [
    { value: '', label: 'Not specified' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' }
  ];

  protected get computedTotal(): number | null {
    const attendance = this.scoreModalForm.controls.attendance.value;
    const tasks = this.scoreModalForm.controls.tasks.value;
    const punctuality = this.scoreModalForm.controls.punctuality.value;
    const behavior = this.scoreModalForm.controls.behavior.value;

    if (attendance === null || tasks === null || punctuality === null || behavior === null) {
      return null;
    }

    const total = attendance * 0.3 + tasks * 0.3 + punctuality * 0.2 + behavior * 0.2;
    return Math.round(total * 100) / 100;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.modalOpen() && !this.submitting()) {
      this.closeModal();
    }
    this.closeDrawer();
  }

  private focusManagerComment(): void {
    setTimeout(() => {
      this.managerCommentField?.nativeElement.focus();
    });
  }

  private buildMergedComment(data: {
    managerComment: string;
    decisionNote: string;
    riskLevel: RiskLevel;
    recommendation: string;
  }): string {
    const lines: string[] = [data.managerComment.trim()];
    if (data.decisionNote.trim()) {
      lines.push(`Decision note: ${data.decisionNote.trim()}`);
    }
    if (data.riskLevel) {
      lines.push(`Risk level: ${data.riskLevel}`);
    }
    if (data.recommendation.trim()) {
      lines.push(`Recommendation: ${data.recommendation.trim()}`);
    }
    return lines.filter((line) => line.length > 0).join('\n');
  }
}

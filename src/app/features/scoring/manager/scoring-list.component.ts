import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { ManagerScoreSubmissionRequest, TeleworkScoreSummaryDTO } from '../../../models/scoring.models';
import { ScoringApiService } from '../../../services/scoring-api.service';
import { ScoringFormComponent } from './scoring-form.component';

@Component({
  selector: 'app-scoring-list',
  standalone: true,
  imports: [CommonModule, DashboardLayoutComponent, ScoringFormComponent],
  templateUrl: './scoring-list.component.html',
  styleUrl: './scoring-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringListComponent implements OnInit {
  private readonly scoringApi = inject(ScoringApiService);
  private readonly toastr = inject(ToastrService);

  protected readonly loading = signal<boolean>(false);
  protected readonly submitting = signal<boolean>(false);
  protected readonly pendingScores = signal<TeleworkScoreSummaryDTO[]>([]);
  protected readonly selectedScore = signal<TeleworkScoreSummaryDTO | null>(null);

  ngOnInit(): void {
    this.loadPendingScores();
  }

  protected selectScore(score: TeleworkScoreSummaryDTO): void {
    this.selectedScore.set(score);
  }

  protected clearSelection(): void {
    this.selectedScore.set(null);
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

  protected submitScore(payload: ManagerScoreSubmissionRequest): void {
    const selected = this.selectedScore();
    if (!selected) {
      return;
    }

    this.submitting.set(true);
    this.scoringApi.submitManagerScore(selected.requestId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastr.success('Score submitted successfully.', 'Scoring');
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
}

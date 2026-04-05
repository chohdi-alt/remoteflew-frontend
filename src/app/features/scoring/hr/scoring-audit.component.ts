import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { ScoreStatus, TeleworkScoreDTO, TeleworkScoreSummaryDTO } from '../../../models/scoring.models';
import { ScoringApiService } from '../../../services/scoring-api.service';

@Component({
  selector: 'app-scoring-audit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardLayoutComponent],
  templateUrl: './scoring-audit.component.html',
  styleUrl: './scoring-audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringAuditComponent implements OnInit {
  private readonly scoringApi = inject(ScoringApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);

  protected readonly loadingList = signal(false);
  protected readonly loadingDetails = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly rows = signal<TeleworkScoreSummaryDTO[]>([]);
  protected readonly selected = signal<TeleworkScoreDTO | null>(null);

  protected readonly statuses: ScoreStatus[] = [
    'PENDING_MANAGER_INPUT',
    'SCORED',
    'REVIEWED_BY_HR'
  ];

  protected readonly filterForm = this.formBuilder.group({
    teamId: [''],
    employeeId: [''],
    managerExternalId: [''],
    status: ['']
  });

  protected readonly reviewForm = this.formBuilder.group({
    comments: ['']
  });

  ngOnInit(): void {
    this.search();
  }

  protected search(): void {
    this.loadingList.set(true);
    const teamRaw = this.filterForm.controls.teamId.value?.trim();
    const teamId = teamRaw ? Number(teamRaw) : null;

    this.scoringApi.getHrScores({
      teamId: teamId != null && Number.isFinite(teamId) ? teamId : null,
      employeeId: this.filterForm.controls.employeeId.value || null,
      managerExternalId: this.filterForm.controls.managerExternalId.value || null,
      status: (this.filterForm.controls.status.value as ScoreStatus) || null
    }).subscribe({
      next: (items) => {
        this.rows.set(items);
        this.selected.set(null);
        this.loadingList.set(false);
      },
      error: () => {
        this.loadingList.set(false);
        this.toastr.error('Unable to load scoring data.', 'HR Audit');
      }
    });
  }

  protected selectRow(row: TeleworkScoreSummaryDTO): void {
    this.loadingDetails.set(true);
    this.reviewForm.reset({ comments: '' });
    this.scoringApi.getHrScoreById(row.scoreId).subscribe({
      next: (details) => {
        this.selected.set(details);
        this.loadingDetails.set(false);
      },
      error: () => {
        this.loadingDetails.set(false);
        this.toastr.error('Unable to load score details.', 'HR Audit');
      }
    });
  }

  protected reviewSelected(): void {
    const current = this.selected();
    if (!current || current.status !== 'SCORED') {
      return;
    }

    this.reviewing.set(true);
    const comments = this.reviewForm.controls.comments.value?.trim() ?? '';
    this.scoringApi.reviewScoreByHr(current.scoreId, { comments: comments || null }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.reviewing.set(false);
        this.toastr.success('Score reviewed successfully.', 'HR Audit');
        this.search();
      },
      error: (error) => {
        this.reviewing.set(false);
        const message = error?.error?.message ?? 'Unable to review score.';
        this.toastr.error(message, 'HR Audit');
      }
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AdminTabsComponent } from '../../../administration/user-management/admin-tabs.component';

export interface ArchiveSummaryDTO {
  requestId: number;
  employeeId: string;
  status: string;
  startDate: string;
  endDate: string;
  managerExternalId: string | null;
  managerDecisionAt: string | null;
  managerComment: string | null;
  hrExternalId: string | null;
  hrDecisionAt: string | null;
  hrComment: string | null;
  submittedAt: string;
  specialCase: boolean;
  justificationReason: string | null;
  justificatifFileId: string | null;
  archiveNodeId: string | null;
}

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule, DatePipe, AdminTabsComponent],
  template: `
    <div class="archives-page">
      <app-admin-tabs></app-admin-tabs>
      <header class="page-header">
        <div class="header-content">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h1>Telework Archive Registry</h1>
            <p class="subtitle">Legally compliant audit trail for all finalized telework requests</p>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ archives().length }}</span>
            <span class="stat-label">Total Archives</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ approvedCount() }}</span>
            <span class="stat-label">Approved</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ rejectedCount() }}</span>
            <span class="stat-label">Rejected</span>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading archives...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>⚠️ {{ error() }}</p>
          <button class="btn-retry" (click)="loadArchives()">Retry</button>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="archive-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Employee</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Type</th>
                <th>Justification</th>
                <th>Manager Comment</th>
                <th>HR Comment</th>
                <th>Justificatif</th>
                <th>Archive</th>
              </tr>
            </thead>
            <tbody>
              @for (item of archives(); track item.requestId) {
                <tr class="table-row" [class.special]="item.specialCase">
                  <td>
                    <span class="request-id">#{{ item.requestId }}</span>
                  </td>
                  <td>
                    <span class="employee-id">{{ item.employeeId }}</span>
                  </td>
                  <td>
                    <span class="date-text">{{ item.startDate | date:'dd/MM/yyyy' }} - {{ item.endDate | date:'dd/MM/yyyy' }}</span>
                  </td>
                  <td>
                    <span class="badge" [class]="'badge-' + item.status.toLowerCase()">
                      {{ item.status }}
                    </span>
                  </td>
                  <td>
                    @if (item.specialCase) {
                      <span class="special-badge">⚠ SPECIAL</span>
                    } @else {
                      <span class="normal-badge">NORMAL</span>
                    }
                  </td>
                  <td>
                    <span class="justification-text">{{ item.justificationReason || 'N/A' }}</span>
                  </td>
                  <td>
                    <div class="decision-cell">
                      <span class="decision-actor">{{ item.managerExternalId || 'N/A' }}</span>
                      @if (item.managerDecisionAt) {
                        <span class="decision-date">{{ item.managerDecisionAt | date:'dd/MM/yy HH:mm' }}</span>
                      }
                      @if (item.managerComment) {
                        <span class="decision-comment" [title]="item.managerComment">{{ item.managerComment | slice:0:30 }}{{ item.managerComment.length > 30 ? '…' : '' }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div class="decision-cell">
                      <span class="decision-actor">{{ item.hrExternalId || 'N/A' }}</span>
                      @if (item.hrDecisionAt) {
                        <span class="decision-date">{{ item.hrDecisionAt | date:'dd/MM/yy HH:mm' }}</span>
                      }
                      @if (item.hrComment) {
                        <span class="decision-comment" [title]="item.hrComment">{{ item.hrComment | slice:0:30 }}{{ item.hrComment.length > 30 ? '…' : '' }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    @if (item.justificatifFileId) {
                      <button class="btn-view" (click)="viewJustificatif(item.requestId)" title="View Justificatif">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                    }
                  </td>
                  <td>
                    @if (item.archiveNodeId) {
                      <button class="btn-view" (click)="viewArchive(item.requestId)" title="View PDF Archive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        PDF ({{ item.archiveNodeId ? 'OK' : 'NULL' }})
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="empty-state">No archived requests found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .archives-page {
      padding: 0;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #e0e0f0;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2rem 2.5rem;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(102,126,234,0.35);
    }

    .header-icon svg {
      color: #fff;
      width: 100%;
      height: 100%;
    }

    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      background: linear-gradient(90deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .subtitle {
      color: rgba(224,224,240,0.6);
      font-size: 0.875rem;
      margin: 0.2rem 0 0;
    }

    .stats {
      display: flex;
      gap: 1.5rem;
    }

    .stat {
      text-align: center;
      background: rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 800;
      background: linear-gradient(90deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .stat-label {
      font-size: 0.75rem;
      color: rgba(224,224,240,0.55);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem;
      gap: 1rem;
      color: rgba(224,224,240,0.7);
    }

    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(167,139,250,0.2);
      border-top-color: #a78bfa;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-retry {
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.4);
      color: #a78bfa;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-retry:hover {
      background: rgba(167,139,250,0.25);
    }

    .table-wrapper {
      padding: 1.5rem 2.5rem;
      overflow-x: auto;
    }

    .archive-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 0.4rem;
      font-size: 0.875rem;
    }

    .archive-table thead tr th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: rgba(224,224,240,0.5);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-size: 0.75rem;
    }

    .table-row td {
      background: rgba(255,255,255,0.04);
      padding: 0.85rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }

    .table-row:hover td {
      background: rgba(167,139,250,0.08);
    }

    .table-row.special td {
      border-left: 2px solid #f59e0b;
    }

    .table-row td:first-child {
      border-radius: 10px 0 0 10px;
    }
    .table-row td:last-child {
      border-radius: 0 10px 10px 0;
    }

    .request-id {
      font-weight: 700;
      color: #a78bfa;
      font-size: 0.9rem;
    }

    .employee-id {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      color: #93c5fd;
      background: rgba(96,165,250,0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .badge {
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-approved {
      background: rgba(16,185,129,0.15);
      color: #6ee7b7;
      border: 1px solid rgba(16,185,129,0.3);
    }

    .badge-rejected {
      background: rgba(239,68,68,0.15);
      color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.3);
    }

    .badge-special {
      background: rgba(245,158,11,0.15);
      color: #fcd34d;
      border: 1px solid rgba(245,158,11,0.3);
    }

    .decision-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .decision-actor {
      font-weight: 600;
      color: #e0e0f0;
      font-size: 0.82rem;
    }

    .decision-date {
      font-size: 0.72rem;
      color: rgba(224,224,240,0.5);
    }

    .decision-comment {
      font-size: 0.72rem;
      color: rgba(224,224,240,0.4);
      font-style: italic;
    }

    .date-text {
      color: rgba(224,224,240,0.7);
      font-size: 0.82rem;
    }

    .special-badge {
      background: rgba(245,158,11,0.15);
      color: #fcd34d;
      border: 1px solid rgba(245,158,11,0.3);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .normal-badge {
      color: rgba(224,224,240,0.4);
      font-size: 0.75rem;
    }

    .btn-view {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2));
      border: 1px solid rgba(102,126,234,0.4);
      color: #a78bfa;
      padding: 0.45rem 0.9rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-view:hover {
      background: linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4));
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102,126,234,0.3);
    }

    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: rgba(224,224,240,0.4);
      font-size: 1rem;
    }
  `]
})
export class ArchivesComponent implements OnInit {
  archives = signal<ArchiveSummaryDTO[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  approvedCount = signal(0);
  rejectedCount = signal(0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadArchives();
  }

  loadArchives(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ArchiveSummaryDTO[]>('/api/admin/archives').subscribe({
      next: (data) => {
        console.log('ARCHIVE DATA', data);
        this.archives.set(data);
        this.approvedCount.set(data.filter(d => d.status === 'APPROVED').length);
        this.rejectedCount.set(data.filter(d => d.status === 'REJECTED').length);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load archives: ' + (err.error?.message || err.message));
        this.loading.set(false);
      }
    });
  }

  viewJustificatif(requestId: number): void {
    this.http.get(`/api/telework/${requestId}/justificatif/view`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        alert('Failed to open justificatif. Please try again.');
      }
    });
  }

  viewArchive(requestId: number): void {
    this.http.get(`/api/admin/archives/${requestId}/view`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        alert('Failed to open archive PDF. Please try again.');
      }
    });
  }
}

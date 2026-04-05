import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { SmtpService } from '../../../core/services/smtp.service';
import { SmtpConfigRequest, SmtpConfigResponse } from '../../../models/admin.models';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { AdminTabsComponent } from './admin-tabs.component';

@Component({
  selector: 'app-smtp-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardLayoutComponent, AdminTabsComponent],
  templateUrl: './smtp-management.component.html',
  styleUrl: './smtp-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmtpManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly smtpService = inject(SmtpService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    host: ['', [Validators.required]],
    port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    protocol: ['smtp'],
    username: [''],
    password: [''],
    fromEmail: [''],
    authEnabled: [true],
    starttlsEnabled: [true],
    sslEnabled: [false],
    connectionTimeoutMs: [10000],
    readTimeoutMs: [10000],
    writeTimeoutMs: [10000],
    active: [false]
  });

  configs: SmtpConfigResponse[] = [];
  effective: SmtpConfigResponse | null = null;
  isLoading = false;
  isSubmitting = false;
  editingId: number | null = null;
  testMessage: string | null = null;
  private loaded = false;
  private loadInFlight = false;

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(force = false): void {
    console.count('[SMTP CALL]');
    if (!force && this.loaded) {
      return;
    }
    if (this.loadInFlight) {
      return;
    }

    this.loaded = true;
    this.loadInFlight = true;
    this.isLoading = true;
    console.log('[SMTP] CALL START');
    this.smtpService
      .list()
      .pipe(
        finalize(() => {
          this.loadInFlight = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (configs) => {
          console.log('[SMTP] RESPONSE', configs);
          this.configs = Array.isArray(configs) ? configs : [];
          this.isLoading = false;
          this.loadEffective();
        },
        error: (err) => {
          console.error('[SMTP] ERROR', err);
          this.loaded = false;
          this.isLoading = false;
          this.toastr.error('Unable to load SMTP configurations.', 'SMTP');
        },
        complete: () => {
          console.log('[SMTP] COMPLETE');
        }
      });
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    this.isSubmitting = true;
    const request$ = this.editingId == null
      ? this.smtpService.create(payload)
      : this.smtpService.update(this.editingId, payload);

    request$
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.toastr.success(this.editingId == null ? 'SMTP configuration created.' : 'SMTP configuration updated.', 'SMTP');
          this.resetForm();
          this.reloadConfigs();
        },
        error: () => {
          this.toastr.error('Failed to save SMTP configuration.', 'SMTP');
        }
      });
  }

  edit(config: SmtpConfigResponse): void {
    this.editingId = config.id ?? null;
    this.form.patchValue({
      name: config.name,
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      username: config.username ?? '',
      password: '',
      fromEmail: config.fromEmail ?? '',
      authEnabled: config.authEnabled,
      starttlsEnabled: config.starttlsEnabled,
      sslEnabled: config.sslEnabled,
      connectionTimeoutMs: config.connectionTimeoutMs ?? 10000,
      readTimeoutMs: config.readTimeoutMs ?? 10000,
      writeTimeoutMs: config.writeTimeoutMs ?? 10000,
      active: config.active
    });
    this.testMessage = null;
  }

  activate(config: SmtpConfigResponse): void {
    if (!config.id) {
      return;
    }
    this.smtpService.activate(config.id).subscribe({
      next: () => {
        this.toastr.success('SMTP configuration activated.', 'SMTP');
        this.reloadConfigs();
      },
      error: () => {
        this.toastr.error('Failed to activate SMTP configuration.', 'SMTP');
      }
    });
  }

  delete(config: SmtpConfigResponse): void {
    if (!config.id) {
      return;
    }
    this.smtpService.delete(config.id).subscribe({
      next: () => {
        this.toastr.success('SMTP configuration deleted.', 'SMTP');
        this.reloadConfigs();
      },
      error: () => {
        this.toastr.error('Failed to delete SMTP configuration.', 'SMTP');
      }
    });
  }

  testCurrentInput(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.smtpService.testInput(this.toPayload()).subscribe({
      next: (response) => {
        this.testMessage = response.message;
        if (response.success) {
          this.toastr.success('SMTP test succeeded.', 'SMTP');
        } else {
          this.toastr.warning('SMTP test failed.', 'SMTP');
        }
      },
      error: () => {
        this.toastr.error('SMTP test request failed.', 'SMTP');
      }
    });
  }

  testStored(config: SmtpConfigResponse): void {
    if (!config.id) {
      return;
    }
    this.smtpService.testStored(config.id).subscribe({
      next: (response) => {
        this.testMessage = response.message;
        if (response.success) {
          this.toastr.success(`SMTP test passed for ${config.name}.`, 'SMTP');
        } else {
          this.toastr.warning(`SMTP test failed for ${config.name}.`, 'SMTP');
        }
      },
      error: () => {
        this.toastr.error('Failed to test saved SMTP configuration.', 'SMTP');
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private reloadConfigs(): void {
    this.loadConfigs(true);
  }

  private loadEffective(): void {
    this.smtpService.getEffective().subscribe({
      next: (effective) => {
        this.effective = effective;
        this.cdr.markForCheck();
      },
      error: () => {
        this.effective = null;
        this.cdr.markForCheck();
      }
    });
  }

  private resetForm(): void {
    this.editingId = null;
    this.testMessage = null;
    this.form.reset({
      name: '',
      host: '',
      port: 587,
      protocol: 'smtp',
      username: '',
      password: '',
      fromEmail: '',
      authEnabled: true,
      starttlsEnabled: true,
      sslEnabled: false,
      connectionTimeoutMs: 10000,
      readTimeoutMs: 10000,
      writeTimeoutMs: 10000,
      active: false
    });
  }

  private toPayload(): SmtpConfigRequest {
    const raw = this.form.getRawValue();
    return {
      name: raw.name.trim(),
      host: raw.host.trim(),
      port: Number(raw.port),
      protocol: raw.protocol.trim() || 'smtp',
      username: this.normalizeOptional(raw.username),
      password: this.normalizeOptional(raw.password),
      fromEmail: this.normalizeOptional(raw.fromEmail),
      authEnabled: !!raw.authEnabled,
      starttlsEnabled: !!raw.starttlsEnabled,
      sslEnabled: !!raw.sslEnabled,
      connectionTimeoutMs: this.normalizeNumber(raw.connectionTimeoutMs),
      readTimeoutMs: this.normalizeNumber(raw.readTimeoutMs),
      writeTimeoutMs: this.normalizeNumber(raw.writeTimeoutMs),
      active: !!raw.active
    };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNumber(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

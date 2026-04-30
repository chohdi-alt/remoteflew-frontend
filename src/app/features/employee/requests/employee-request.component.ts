import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, finalize, map, shareReplay } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardLayoutComponent } from '../../dashboard/shared/dashboard-layout.component';
import { CreateTeleworkDTO, TeleworkQuotaResponse, TeleworkService } from '../services/telework.service';

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value as Date | null;
  const endDate = control.get('endDate')?.value as Date | null;

  if (!startDate || !endDate || startDate <= endDate || startDate.getTime() === endDate.getTime()) {
    return null;
  }

  return { invalidDateRange: true };
};

@Component({
  selector: 'app-employee-request',
  standalone: true,
  imports: [
    CommonModule,
    LayoutModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    DashboardLayoutComponent
  ],
  templateUrl: './employee-request.component.html',
  styleUrl: './employee-request.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeRequestComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly teleworkService = inject(TeleworkService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpointObserver = inject(BreakpointObserver);

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  readonly minSelectableDate = this.stripTime(new Date());
  readonly isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly requestForm = this.fb.group(
    {
      startDate: this.fb.control<Date | null>(null, Validators.required),
      endDate: this.fb.control<Date | null>(null, Validators.required),
      reason: this.fb.nonNullable.control('', Validators.maxLength(500)),
      file: this.fb.control<File | null>(null)
    },
    { validators: dateRangeValidator }
  );

  quota: TeleworkQuotaResponse = {
    maxDaysPerWeek: 1,
    usedDaysThisWeek: 0,
    remainingDays: 1
  };
  selectedFile: File | null = null;
  isSubmitting = false;
  isLoadingQuota = false;

  ngOnInit(): void {
    this.loadQuota();
    this.requestForm.controls.startDate.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged((a, b) => a?.getTime() === b?.getTime())
      )
      .subscribe((startDate) => {
        if (startDate) {
          const formatted = this.formatDate(this.stripTime(startDate));
          this.loadQuota(formatted);
        }

        if (this.isSingleDateMode && startDate) {
          const currentEnd = this.requestForm.controls.endDate.value;
          if (!currentEnd || currentEnd.getTime() !== startDate.getTime()) {
            this.requestForm.controls.endDate.setValue(startDate, { emitEvent: false });
          }
        }
      });
  }

  get employeeLabel(): string {
    return this.authService.username ?? 'Authenticated employee';
  }

  get hasInvalidDateRange(): boolean {
    return (
      this.requestForm.hasError('invalidDateRange') &&
      (this.requestForm.controls.startDate.touched || this.requestForm.controls.endDate.touched)
    );
  }

  get isSingleDateMode(): boolean {
    return this.quota.remainingDays === 1;
  }

  get requestedDays(): number {
    const startDate = this.requestForm.controls.startDate.value;
    const endDate = this.requestForm.controls.endDate.value;
    if (!startDate || !endDate) {
      return 0;
    }

    const start = this.stripTime(startDate);
    const end = this.stripTime(endDate);
    const diffInMs = end.getTime() - start.getTime();
    if (diffInMs < 0) {
      return 0;
    }

    return Math.floor(diffInMs / (24 * 60 * 60 * 1000)) + 1;
  }

  get exceedsRemainingQuota(): boolean {
    return this.requestedDays > this.quota.remainingDays;
  }

  readonly dateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const normalized = this.stripTime(date);
    const weekday = normalized.getDay();
    return normalized >= this.minSelectableDate && weekday !== 0 && weekday !== 6;
  };

  readonly singleDateClass = (cellDate: Date, view: 'month' | 'year' | 'multi-year'): string => {
    if (view !== 'month') {
      return '';
    }

    const classes: string[] = [];
    if (this.isToday(cellDate)) {
      classes.push('rf-date-today');
    }
    if (this.isDateEqual(cellDate, this.requestForm.controls.startDate.value)) {
      classes.push('rf-date-selected');
    }
    return classes.join(' ');
  };

  readonly rangeDateClass = (cellDate: Date, view: 'month' | 'year' | 'multi-year'): string => {
    if (view !== 'month') {
      return '';
    }

    const classes: string[] = [];
    if (this.isToday(cellDate)) {
      classes.push('rf-date-today');
    }
    if (this.isDateEqual(cellDate, this.requestForm.controls.startDate.value)) {
      classes.push('rf-date-range-start');
    }
    if (this.isDateEqual(cellDate, this.requestForm.controls.endDate.value)) {
      classes.push('rf-date-range-end');
    }
    return classes.join(' ');
  };

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    this.selectedFile = file;
    this.requestForm.controls.file.setValue(file);
    this.requestForm.controls.file.markAsDirty();
  }

  submitRequest(): void {
    if (this.requestForm.invalid || this.isSubmitting) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const startDate = this.requestForm.controls.startDate.value;
    const endDate = this.isSingleDateMode
      ? this.requestForm.controls.startDate.value
      : this.requestForm.controls.endDate.value;

    if (!startDate || !endDate) {
      this.toastr.error('Start date and end date are required.', 'Validation error');
      return;
    }

    const start = this.stripTime(startDate);
    const end = this.stripTime(endDate);
    if (end < start) {
      this.toastr.error('Start date cannot be after end date.', 'Validation error');
      return;
    }

    if (this.exceedsRemainingQuota && !this.selectedFile) {
      this.toastr.error(
        `More than ${this.quota.maxDaysPerWeek} telework days per week requires a justificatif.`,
        'Justificatif required'
      );
      return;
    }

    const trimmedReason = this.requestForm.controls.reason.value.trim();
    const dto: CreateTeleworkDTO = {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
      reason: trimmedReason || undefined
    };

    this.isSubmitting = true;
    this.teleworkService
      .createRequest(dto, this.selectedFile ?? undefined)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Request submitted successfully.', 'Telework request');
          this.resetForm();
          this.loadQuota();
        },
        error: () => {
          this.toastr.error('Unable to submit the request right now.', 'Submission failed');
        }
      });
  }

  resetForm(): void {
    this.requestForm.reset({
      startDate: null,
      endDate: null,
      reason: '',
      file: null
    });
    this.selectedFile = null;
    this.applyQuotaMode();

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private loadQuota(date?: string): void {
    this.isLoadingQuota = true;
    this.teleworkService
      .getWeeklyQuota(date)
      .pipe(finalize(() => (this.isLoadingQuota = false)))
      .subscribe({
        next: (quota) => {
          this.quota = quota;
          this.applyQuotaMode();
        },
        error: () => {
          this.toastr.warning('Unable to load weekly quota. Using default policy.', 'Quota information');
          this.quota = {
            maxDaysPerWeek: 1,
            usedDaysThisWeek: 0,
            remainingDays: 1
          };
          this.applyQuotaMode();
        }
      });
  }

  private applyQuotaMode(): void {
    const startDateControl = this.requestForm.controls.startDate;
    const endDateControl = this.requestForm.controls.endDate;

    if (this.isSingleDateMode) {
      endDateControl.clearValidators();
      const startVal = startDateControl.value;
      if (startVal && (!endDateControl.value || endDateControl.value.getTime() !== startVal.getTime())) {
        endDateControl.setValue(startVal, { emitEvent: false });
      }
    } else {
      endDateControl.setValidators(Validators.required);
    }
    endDateControl.updateValueAndValidity({ emitEvent: false });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private stripTime(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private isToday(date: Date): boolean {
    return this.isDateEqual(date, new Date());
  }

  private isDateEqual(left: Date, right: Date | null): boolean {
    if (!right) {
      return false;
    }
    return this.stripTime(left).getTime() === this.stripTime(right).getTime();
  }
}

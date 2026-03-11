import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusLabel'
})
export class StatusLabelPipe implements PipeTransform {

  transform(value: unknown): string {
    if (value == null) {
      return '';
    }

    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    const normalized = raw.toUpperCase();
    const labels: Record<string, string> = {
      SUBMITTED: 'Submitted',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      SPECIAL: 'Special',
      PENDING: 'Pending',
      IN_PROGRESS: 'In progress',
      IN_REVIEW: 'In review',
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      CANCELED: 'Canceled',
      CANCELLED: 'Cancelled'
    };

    return labels[normalized] ?? raw;
  }

}

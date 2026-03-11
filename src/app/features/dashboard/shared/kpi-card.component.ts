import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

type KpiColor = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value: string | number = 0;
  @Input() icon = 'analytics';
  @Input() color: KpiColor = 'primary';

  get colorClass(): string {
    return `kpi-${this.color}`;
  }
}

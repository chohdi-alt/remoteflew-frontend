import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}

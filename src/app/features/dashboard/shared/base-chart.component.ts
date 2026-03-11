import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTheme,
  ApexXAxis,
  NgApexchartsModule
} from 'ng-apexcharts';
import { DashboardAxisSeries, DashboardChartType } from '../dashboard-chart.adapter';

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseChartComponent {
  @Input({ required: true }) series!: DashboardAxisSeries[] | number[];
  @Input({ required: true }) categories!: string[];
  @Input({ required: true }) chartType!: DashboardChartType;
  @Input() title = '';
  @Input() height = 300;
  @Input() colorPalette: string[] = ['#0f4c81', '#2f855a', '#d69e2e', '#dd6b20', '#4a5568'];

  get isNonAxisChart(): boolean {
    return this.chartType === 'pie' || this.chartType === 'donut';
  }

  get axisSeries(): ApexAxisChartSeries {
    return this.isNonAxisChart ? [] : (this.series as DashboardAxisSeries[]);
  }

  get nonAxisSeries(): ApexNonAxisChartSeries {
    return this.isNonAxisChart ? (this.series as number[]) : [];
  }

  get chart(): ApexChart {
    return {
      type: this.chartType,
      height: this.height,
      toolbar: {
        show: false
      },
      animations: {
        enabled: true,
        speed: 450
      }
    };
  }

  get xaxis(): ApexXAxis {
    return {
      categories: this.categories,
      labels: {
        trim: true
      }
    };
  }

  get stroke(): ApexStroke {
    return {
      curve: 'smooth',
      width: 3
    };
  }

  get dataLabels(): ApexDataLabels {
    return {
      enabled: this.chartType === 'pie' || this.chartType === 'donut'
    };
  }

  get plotOptions(): ApexPlotOptions {
    return {
      bar: {
        borderRadius: 4,
        columnWidth: '46%'
      }
    };
  }

  get legend(): ApexLegend {
    return {
      position: 'bottom',
      horizontalAlign: 'left'
    };
  }

  get grid(): ApexGrid {
    return {
      strokeDashArray: 4,
      borderColor: '#d1d8e0'
    };
  }

  get theme(): ApexTheme {
    return {
      mode: 'light'
    };
  }
}

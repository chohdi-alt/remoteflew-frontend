import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { map, shareReplay } from 'rxjs';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, LayoutModule],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css']
})
export class RequestDetailComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly requestDetail = {
    requestId: '--',
    employee: '--',
    status: 'PENDING',
    startDate: null as string | null,
    endDate: null as string | null,
    reason: 'Request detail will be displayed here when connected to the data source.',
    managerComment: '--',
    hrComment: '--'
  };
}

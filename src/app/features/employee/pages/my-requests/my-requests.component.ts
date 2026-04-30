import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { map, shareReplay } from 'rxjs';

interface MyRequestItem {
  id: number;
  title: string;
  date: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SPECIAL';
}

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, LayoutModule],
  templateUrl: './my-requests.component.html',
  styleUrl: './my-requests.component.css'
})
export class MyRequestsComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly requests: MyRequestItem[] = [];
}

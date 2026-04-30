import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs';
import { InboxMessage, InboxService } from '../../services/inbox.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css'
})
export class InboxComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  isDrawerOpen = false;

  constructor(
    private readonly inboxService: InboxService,
    private readonly breakpointObserver: BreakpointObserver
  ) {}

  private allMessages: InboxMessage[] = [];
  messages: InboxMessage[] = [];
  searchQuery = '';
  statusFilter: 'all' | 'read' | 'unread' = 'all';

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.inboxService.getMessages().subscribe({
      next: (messages) => {
        this.allMessages = messages;
        this.messages = this.applyFilters(this.allMessages);
      },
      error: (error) => {
        console.error('Failed to load inbox messages.', error);
        this.allMessages = [];
        this.messages = [];
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.messages = this.applyFilters(this.allMessages);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.onSearchChange(target?.value ?? '');
  }

  onStatusChange(value: string): void {
    this.statusFilter = value === 'read' || value === 'unread' ? value : 'all';
    this.messages = this.applyFilters(this.allMessages);
  }

  onStatusSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.onStatusChange(target?.value ?? 'all');
  }

  toggleSelect(message: InboxMessage): void {
    message.selected = !message.selected;
  }

  markAsRead(message: InboxMessage): void {
    message.read = true;
  }

  markAsUnread(message: InboxMessage): void {
    message.read = false;
  }

  openMessage(message: InboxMessage): void {
    message.read = true;
  }

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  logout(): void {
    this.closeDrawer();
    void this.authService.logout();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDrawer();
  }

  private applyFilters(messages: InboxMessage[]): InboxMessage[] {
    const query = this.searchQuery.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesQuery =
        !query ||
        message.subject.toLowerCase().includes(query) ||
        message.preview.toLowerCase().includes(query) ||
        message.sender.toLowerCase().includes(query);
      const matchesStatus =
        this.statusFilter === 'all' || (this.statusFilter === 'read' ? message.read : !message.read);
      return matchesQuery && matchesStatus;
    });
  }
}

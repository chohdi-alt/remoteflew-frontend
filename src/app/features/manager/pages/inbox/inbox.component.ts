import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InboxMessage, InboxService } from '../../services/inbox.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css'
})
export class InboxComponent implements OnInit {
  constructor(private readonly inboxService: InboxService) {}

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

  onStatusChange(value: string): void {
    this.statusFilter = value === 'read' || value === 'unread' ? value : 'all';
    this.messages = this.applyFilters(this.allMessages);
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

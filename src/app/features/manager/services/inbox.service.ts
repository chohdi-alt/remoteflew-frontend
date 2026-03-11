import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface InboxMessage {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: string;
  read: boolean;
  selected: boolean;
}

@Injectable({ providedIn: 'root' })
export class InboxService {
  getMessages(): Observable<InboxMessage[]> {
    return of([]);
  }
}

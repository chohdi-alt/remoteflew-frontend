import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface RealtimeSignal {
  type: string;
  entityId: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeSignalService {
  private client: Client;
  private signalSubject = new Subject<RealtimeSignal>();
  private subscriptions: StompSubscription[] = [];

  constructor(private authService: AuthService) {
    // Dynamically build the WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.warn('[RealtimeSignalService] Connected');
      this.subscribeToDestinations();
      // Phase 1: Reconnect Sync - Force refresh on UI
      this.signalSubject.next({ type: 'RECONNECT', entityId: 0 });
    };

    this.client.onStompError = (frame) => {
      console.error('[RealtimeSignalService] Broker reported error:', frame.headers['message']);
      console.error('[RealtimeSignalService] Details:', frame.body);
    };

    this.client.onWebSocketClose = () => {
      console.warn('[RealtimeSignalService] WebSocket closed. Reconnecting if active...');
    };

    this.authService.tokenRefreshed$.subscribe(_newToken => {
      if (this.client.active) {
        console.warn('[RealtimeSignalService] Token refreshed. Reconnecting STOMP client...');
        this.disconnect();
        this.connect();
      }
    });
  }

  public connect(): void {
    if (!this.authService.isAuthenticated()) return;
    if (this.client.active) return;

    // Use JWT as connection header
    this.client.connectHeaders = {
      Authorization: `Bearer ${this.authService.token}`
    };

    this.client.activate();
  }

  public disconnect(): void {
    if (this.client.active) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];
      void this.client.deactivate();
      console.warn('[RealtimeSignalService] Disconnected');
    }
  }

  private subscribeToDestinations(): void {
    // Shared private queue for specific user signals
    this.subscriptions.push(
      this.client.subscribe('/user/queue/signals', (message: IMessage) => {
        this.handleMessage(message);
      })
    );

    // Topic for roles
    const role = this.authService.getPrimaryRole();
    if (role === 'MANAGER') {
      this.subscriptions.push(
        this.client.subscribe('/topic/roles/MANAGER', (message: IMessage) => {
          this.handleMessage(message);
        })
      );
    } else if (role === 'HR') {
      this.subscriptions.push(
        this.client.subscribe('/topic/roles/HR', (message: IMessage) => {
          this.handleMessage(message);
        })
      );
    }
  }

  private handleMessage(message: IMessage): void {
    try {
      const signal: RealtimeSignal = JSON.parse(message.body);
      this.signalSubject.next(signal);
    } catch (e) {
      console.error('[RealtimeSignalService] Error parsing signal message', e);
    }
  }

  public onSignal(types?: string | string[]): Observable<RealtimeSignal> {
    if (types) {
      const typeArray = Array.isArray(types) ? types : [types];
      return this.signalSubject.asObservable().pipe(
        filter(signal => typeArray.includes(signal.type))
      );
    }
    return this.signalSubject.asObservable();
  }
}

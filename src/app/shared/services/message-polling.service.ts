import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  Subject,
  interval,
  Subscription,
} from 'rxjs';
import {
  switchMap,
  catchError,
  tap,
  filter,
  takeUntil,
  map,
} from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { Message } from '../interfaces/message.interface';
import { MessageService } from './message.service';

// Response wrapper from Go backend
interface ApiResponse<T> {
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class MessagePollingService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private pollingSubscription: Subscription | null = null;
  private lastMessageTimestamp: Date | null = null;

  // Subjects for events
  private newMessageSubject = new BehaviorSubject<Message | null>(null);
  public newMessage$ = this.newMessageSubject.asObservable();

  private messageReadSubject = new BehaviorSubject<string | null>(null);
  public messageRead$ = this.messageReadSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  /**
   * Start polling for new messages
   * @param intervalMs Polling interval in milliseconds (default: 10000 - 10 seconds)
   */
  startPolling(intervalMs: number = 10000): void {
    // Stop any existing polling
    this.stopPolling();

    console.log('Starting message polling service');

    // Set initial timestamp if not set
    if (!this.lastMessageTimestamp) {
      this.lastMessageTimestamp = new Date();
    }

    // Start polling at the specified interval
    this.pollingSubscription = interval(intervalMs)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.authService.isAuthenticated()),
        switchMap(() => this.checkForNewMessages()),
        catchError((error) => {
          console.error('Error polling for messages:', error);
          return [];
        })
      )
      .subscribe((messages) => {
        if (messages && messages.length > 0) {
          console.log(`Poll found ${messages.length} new messages`);

          // Update last timestamp to the newest message
          const latestMessage = messages.reduce((latest, message) => {
            const messageDate = new Date(message.timestamp);
            return messageDate > latest ? messageDate : latest;
          }, this.lastMessageTimestamp || new Date());

          this.lastMessageTimestamp = latestMessage;

          // Emit each new message
          messages.forEach((message) => {
            this.newMessageSubject.next(message);
          });
        }
      });
  }

  /**
   * Stop polling for new messages
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Check for new messages since the last poll
   */ private checkForNewMessages(): Observable<Message[]> {
    // Use the message service's built-in method to get new messages
    const since = this.lastMessageTimestamp || new Date();
    return this.messageService.getNewMessagesSince(since).pipe(
      tap((messages) => {
        if (messages && messages.length > 0) {
          console.log(`Retrieved ${messages.length} new messages from server`);
        }
      }),
      catchError((error) => {
        console.error('Error checking for new messages:', error);
        return [];
      })
    );
  }

  /**
   * Check for message status changes (read/unread)
   */
  checkMessageStatuses(messageIds: string[]): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/api/v1/messages/status`, {
        messageIds,
      })
      .pipe(
        tap((response) => {
          if (response.data && response.data.length > 0) {
            response.data.forEach((update: any) => {
              if (update.status === 'read') {
                this.messageReadSubject.next(update.id);
              }
            });
          }
        })
      );
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

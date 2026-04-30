import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { InboxComponent } from './inbox.component';
import { InboxService, InboxMessage } from '../../services/inbox.service';

describe('InboxComponent', () => {
  let component: InboxComponent;
  let fixture: ComponentFixture<InboxComponent>;

  const mockMessages: InboxMessage[] = [
    {
      subject: 'Test',
      preview: 'Preview',
      sender: 'Admin',
      read: false,
      selected: false
    } as InboxMessage
  ];

  const inboxServiceMock = {
    getMessages: () => of(mockMessages)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxComponent],
      providers: [
        provideRouter([]),
        { provide: InboxService, useValue: inboxServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load messages on init', () => {
    expect(component.messages.length).toBe(1);
  });

  it('should filter messages by search', () => {
    component.onSearchChange('test');
    expect(component.messages.length).toBe(1);

    component.onSearchChange('unknown');
    expect(component.messages.length).toBe(0);
  });
});
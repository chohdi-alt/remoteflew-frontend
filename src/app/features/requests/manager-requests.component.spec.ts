import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ManagerRequestsComponent } from './manager-requests.component';
import { RequestService } from '../../core/services/request.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { RealtimeSignalService } from '../../core/services/realtime-signal.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DestroyRef } from '@angular/core';

describe('ManagerRequestsComponent', () => {
  let component: ManagerRequestsComponent;
  let fixture: ComponentFixture<ManagerRequestsComponent>;
  let requestServiceMock: jasmine.SpyObj<RequestService>;
  let dialogMock: jasmine.SpyObj<MatDialog>;
  let toastrMock: jasmine.SpyObj<ToastrService>;
  let realtimeSignalMock: jasmine.SpyObj<RealtimeSignalService>;

  beforeEach(async () => {
    requestServiceMock = jasmine.createSpyObj('RequestService', [
      'getManagerRequests',
      'enrichWithCreatedAt',
      'getRequestHistory',
      'approveManagerRequest',
      'rejectManagerRequest'
    ]);
    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    toastrMock = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);
    realtimeSignalMock = jasmine.createSpyObj('RealtimeSignalService', ['connect', 'onSignal']);

    // Default returns
    requestServiceMock.getManagerRequests.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      numberOfElements: 0,
      first: true,
      last: true
    }));
    realtimeSignalMock.onSignal.and.returnValue(of({ type: 'MANAGER_INBOX_CHANGED', entityId: undefined } as any));

    await TestBed.configureTestingModule({
      imports: [ManagerRequestsComponent, NoopAnimationsModule],
      providers: [
        { provide: RequestService, useValue: requestServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: RealtimeSignalService, useValue: realtimeSignalMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and connect to realtime signals', () => {
    expect(component).toBeTruthy();
    expect(realtimeSignalMock.connect).toHaveBeenCalled();
    expect(realtimeSignalMock.onSignal).toHaveBeenCalledWith(['MANAGER_INBOX_CHANGED', 'RECONNECT']);
  });

  it('should load manager requests on init', () => {
    expect(requestServiceMock.getManagerRequests).toHaveBeenCalledWith(0, 10);
    expect(component.pageSizeOptions).toContain(10);
  });

  it('should handle API failure by showing a meaningful error toast', () => {
    requestServiceMock.getManagerRequests.and.returnValue(throwError(() => ({
      status: 500,
      message: 'Server Down'
    })));

    // Trigger another refresh
    component.refresh();
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalledWith(
      'Unable to load manager validation requests.',
      'Manager Requests'
    );
    // Ensure loading indicator is turned off even on error
    component.loading$.subscribe(loading => expect(loading).toBeFalse());
  });

  it('should not submit decision if requestId is missing', () => {
    const invalidRow = { taskKey: 'some-key' } as any;
    component.onApprove(invalidRow);
    expect(toastrMock.error).toHaveBeenCalledWith(
      'Request identifier is missing for this workflow task.',
      'Manager Requests'
    );
    expect(requestServiceMock.approveManagerRequest).not.toHaveBeenCalled();
  });

  it('should handle pagination changes', () => {
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 100 });
    fixture.detectChanges();
    expect(requestServiceMock.getManagerRequests).toHaveBeenCalledWith(2, 20);
  });

  it('should open decision dialog for approval', () => {
    const mockRow = { requestId: 123, taskKey: 'task-1' } as any;
    dialogMock.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    component.onApprove(mockRow);

    expect(dialogMock.open).toHaveBeenCalled();
    const dialogArgs = dialogMock.open.calls.mostRecent().args as any[];
    expect(dialogArgs[1]?.data.initialAction).toBe('approve');
  });

  it('should show error if requestId is missing on approval', () => {
    const mockRow = { taskKey: 'task-1' } as any; // No requestId
    component.onApprove(mockRow);
    expect(toastrMock.error).toHaveBeenCalledWith(jasmine.any(String), 'Manager Requests');
  });

  it('should handle API failure during data loading gracefully', fakeAsync(() => {
    requestServiceMock.getManagerRequests.and.returnValue(throwError(() => new Error('API Fail')));

    component.refresh();
    tick(500);

    expect(toastrMock.error).toHaveBeenCalledWith('Unable to load manager validation requests.', 'Manager Requests');
  }));
});

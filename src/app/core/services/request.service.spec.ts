import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RequestService]
    });
    service = TestBed.inject(RequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensures no outstanding requests
  });

  it('should fetch manager requests with pagination', () => {
    const dummyPage = { content: [], totalElements: 10 };
    
    service.getManagerRequests(1, 20).subscribe(page => {
      expect(page.totalElements).toBe(10);
    });

    const req = httpMock.expectOne(request => 
      request.url.includes('/api/telework/validations/pending') &&
      request.params.get('page') === '1' &&
      request.params.get('size') === '20'
    );
    expect(req.request.method).toBe('GET');
    req.flush(dummyPage);
  });

  it('should approve manager request with correct payload and task key', () => {
    const requestId = 123;
    const taskKey = 'task_abc';
    const decision = { comment: ' Looks good ' };

    service.approveManagerRequest(requestId, taskKey, decision).subscribe();

    const req = httpMock.expectOne(request => 
      request.url.includes(`/api/telework/${requestId}/manager/approve`) &&
      request.params.get('taskKey') === taskKey
    );
    
    expect(req.request.method).toBe('POST');
    // Ensure comment was trimmed
    expect(req.request.body.comment).toBe('Looks good');
    req.flush({});
  });

  it('should handle file viewing with dynamic download URL', () => {
    const downloadUrl = 'http://external-storage.com/file.pdf';
    
    service.viewJustificatifFile(0, downloadUrl).subscribe();

    const req = httpMock.expectOne(downloadUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('should fallback to default endpoint when downloadUrl is empty', () => {
    const requestId = 456;
    
    service.viewJustificatifFile(requestId, ' ').subscribe();

    const req = httpMock.expectOne(`/api/telework/${requestId}/justificatif/view`);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob());
  });

  it('should propagate error when API returns 500 server error', () => {
    service.getManagerRequests().subscribe({
      next: () => fail('expected an error, not a page'),
      error: error => expect(error.status).toBe(500)
    });

    const req = httpMock.expectOne(request => request.url.includes('/api/telework/validations/pending'));
    req.flush('Error Message', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle malformed pagination data safely', () => {
    // Backend returns content but totalElements is missing/NaN
    const malformedData = { content: [], totalElements: undefined };
    
    service.getManagerRequests().subscribe(page => {
      expect(page.content).toEqual([]);
      // Logic should treat missing total as 0 or undefined without crashing
      expect(page.totalElements).toBeUndefined();
    });

    const req = httpMock.expectOne(request => request.url.includes('/api/telework/validations/pending'));
    req.flush(malformedData);
  });
});

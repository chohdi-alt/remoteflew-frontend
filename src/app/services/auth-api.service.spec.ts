import { TestBed } from '@angular/core/testing';
import { AuthApiService } from './auth-api.service';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // ensures no pending requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call login endpoint', () => {
    const payload = { username: 'test', password: '123' } as any;

    service.login(payload).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');

    req.flush({ accessToken: 'fake-token' });
  });
});
import { TestBed } from '@angular/core/testing';

import { TeleworkApiService } from './telework-api.service';

describe('TeleworkApiService', () => {
  let service: TeleworkApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeleworkApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

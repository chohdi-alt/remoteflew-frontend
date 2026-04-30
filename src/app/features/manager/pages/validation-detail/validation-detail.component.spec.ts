import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { ValidationDetailComponent } from './validation-detail.component';

describe('ValidationDetailComponent', () => {
  let component: ValidationDetailComponent;
  let fixture: ComponentFixture<ValidationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'test-id' } },
            params: of({ id: 'test-id' })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationDetailComponent } from './validation-detail.component';

describe('ValidationDetailComponent', () => {
  let component: ValidationDetailComponent;
  let fixture: ComponentFixture<ValidationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationDetailComponent]
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

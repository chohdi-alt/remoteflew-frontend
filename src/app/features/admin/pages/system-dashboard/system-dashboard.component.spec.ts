import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemDashboardComponent } from './system-dashboard.component';

describe('SystemDashboardComponent', () => {
  let component: SystemDashboardComponent;
  let fixture: ComponentFixture<SystemDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

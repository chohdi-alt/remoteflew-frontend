import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            hasRole: () => false,
            logout: () => Promise.resolve()
          }
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: () => Promise.resolve(true),
            navigate: () => Promise.resolve(true)
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

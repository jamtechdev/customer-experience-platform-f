import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocialAnalysis } from './social-analysis';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('SocialAnalysis', () => {
  let component: SocialAnalysis;
  let fixture: ComponentFixture<SocialAnalysis>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', ['getDashboardStats']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [SocialAnalysis],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SocialAnalysis);
    component = fixture.componentInstance;
    dashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

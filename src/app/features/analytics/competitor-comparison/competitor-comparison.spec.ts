import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompetitorComparison } from './competitor-comparison';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('CompetitorComparison', () => {
  let component: CompetitorComparison;
  let fixture: ComponentFixture<CompetitorComparison>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', ['getDashboardStats']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [CompetitorComparison],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompetitorComparison);
    component = fixture.componentInstance;
    dashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

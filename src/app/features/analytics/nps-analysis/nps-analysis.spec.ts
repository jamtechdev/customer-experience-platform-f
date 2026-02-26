import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NpsAnalysis } from './nps-analysis';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('NpsAnalysis', () => {
  let component: NpsAnalysis;
  let fixture: ComponentFixture<NpsAnalysis>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', ['getDashboardStats']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [NpsAnalysis],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NpsAnalysis);
    component = fixture.componentInstance;
    dashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load NPS data on init', () => {
    const mockData = {
      success: true,
      data: {
        nps: {
          score: 50,
          promoters: 100,
          passives: 50,
          detractors: 50,
          total: 200
        }
      }
    };
    dashboardService.getDashboardStats.and.returnValue(of(mockData));

    component.ngOnInit();

    expect(dashboardService.getDashboardStats).toHaveBeenCalled();
    expect(component.npsData()).toBeTruthy();
  });
});

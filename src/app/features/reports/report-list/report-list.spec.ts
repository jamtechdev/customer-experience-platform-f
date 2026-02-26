import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportList } from './report-list';
import { ReportService } from '../../../core/services/report.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('ReportList', () => {
  let component: ReportList;
  let fixture: ComponentFixture<ReportList>;
  let reportService: jasmine.SpyObj<ReportService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const reportServiceSpy = jasmine.createSpyObj('ReportService', ['getReports']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ReportList],
      providers: [
        { provide: ReportService, useValue: reportServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportList);
    component = fixture.componentInstance;
    reportService = TestBed.inject(ReportService) as jasmine.SpyObj<ReportService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

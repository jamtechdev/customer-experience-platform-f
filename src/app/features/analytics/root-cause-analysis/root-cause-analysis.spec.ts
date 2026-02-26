import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RootCauseAnalysis } from './root-cause-analysis';
import { AnalysisService } from '../../../core/services/analysis.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('RootCauseAnalysis', () => {
  let component: RootCauseAnalysis;
  let fixture: ComponentFixture<RootCauseAnalysis>;
  let analysisService: jasmine.SpyObj<AnalysisService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const analysisServiceSpy = jasmine.createSpyObj('AnalysisService', ['getTopRootCauses']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [RootCauseAnalysis],
      providers: [
        { provide: AnalysisService, useValue: analysisServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RootCauseAnalysis);
    component = fixture.componentInstance;
    analysisService = TestBed.inject(AnalysisService) as jasmine.SpyObj<AnalysisService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

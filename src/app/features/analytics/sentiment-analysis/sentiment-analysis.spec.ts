import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SentimentAnalysis } from './sentiment-analysis';
import { AnalysisService } from '../../../core/services/analysis.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('SentimentAnalysis', () => {
  let component: SentimentAnalysis;
  let fixture: ComponentFixture<SentimentAnalysis>;
  let analysisService: jasmine.SpyObj<AnalysisService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const analysisServiceSpy = jasmine.createSpyObj('AnalysisService', ['getSentimentTrends']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [SentimentAnalysis],
      providers: [
        { provide: AnalysisService, useValue: analysisServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SentimentAnalysis);
    component = fixture.componentInstance;
    analysisService = TestBed.inject(AnalysisService) as jasmine.SpyObj<AnalysisService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JourneyMap } from './journey-map';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('JourneyMap', () => {
  let component: JourneyMap;
  let fixture: ComponentFixture<JourneyMap>;
  let journeyService: jasmine.SpyObj<CustomerJourneyService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const journeyServiceSpy = jasmine.createSpyObj('CustomerJourneyService', ['getJourneyAnalysis']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [JourneyMap],
      providers: [
        { provide: CustomerJourneyService, useValue: journeyServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JourneyMap);
    component = fixture.componentInstance;
    journeyService = TestBed.inject(CustomerJourneyService) as jasmine.SpyObj<CustomerJourneyService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

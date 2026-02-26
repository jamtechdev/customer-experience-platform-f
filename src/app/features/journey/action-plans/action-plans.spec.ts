import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionPlans } from './action-plans';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('ActionPlans', () => {
  let component: ActionPlans;
  let fixture: ComponentFixture<ActionPlans>;
  let journeyService: jasmine.SpyObj<CustomerJourneyService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const journeyServiceSpy = jasmine.createSpyObj('CustomerJourneyService', ['getActionPlans']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ActionPlans],
      providers: [
        { provide: CustomerJourneyService, useValue: journeyServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionPlans);
    component = fixture.componentInstance;
    journeyService = TestBed.inject(CustomerJourneyService) as jasmine.SpyObj<CustomerJourneyService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

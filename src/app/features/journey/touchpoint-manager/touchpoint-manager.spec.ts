import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TouchpointManager } from './touchpoint-manager';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('TouchpointManager', () => {
  let component: TouchpointManager;
  let fixture: ComponentFixture<TouchpointManager>;
  let journeyService: jasmine.SpyObj<CustomerJourneyService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const journeyServiceSpy = jasmine.createSpyObj('CustomerJourneyService', ['getTouchpoints']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [TouchpointManager],
      providers: [
        { provide: CustomerJourneyService, useValue: journeyServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TouchpointManager);
    component = fixture.componentInstance;
    journeyService = TestBed.inject(CustomerJourneyService) as jasmine.SpyObj<CustomerJourneyService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

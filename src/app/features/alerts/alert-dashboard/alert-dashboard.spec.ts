import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertDashboard } from './alert-dashboard';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('AlertDashboard', () => {
  let component: AlertDashboard;
  let fixture: ComponentFixture<AlertDashboard>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [AlertDashboard],
      providers: [
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertDashboard);
    component = fixture.componentInstance;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

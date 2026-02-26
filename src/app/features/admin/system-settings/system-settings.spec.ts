import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemSettings } from './system-settings';
import { SettingsService } from '../../../core/services/settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('SystemSettings', () => {
  let component: SystemSettings;
  let fixture: ComponentFixture<SystemSettings>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', ['getSettings', 'updateSettings']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [SystemSettings],
      providers: [
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemSettings);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

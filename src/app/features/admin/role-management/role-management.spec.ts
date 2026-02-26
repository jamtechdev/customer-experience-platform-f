import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleManagement } from './role-management';
import { AdminService } from '../../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('RoleManagement', () => {
  let component: RoleManagement;
  let fixture: ComponentFixture<RoleManagement>;
  let adminService: jasmine.SpyObj<AdminService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('AdminService', ['getRoles']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [RoleManagement],
      providers: [
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleManagement);
    component = fixture.componentInstance;
    adminService = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

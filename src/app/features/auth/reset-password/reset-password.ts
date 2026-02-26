import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  resetPasswordForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  loading = false;

  constructor() {
    const email = this.route.snapshot.queryParams['email'] || '';
    
    this.resetPasswordForm = this.fb.group({
      email: [email, [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.loading = true;
      const { confirmPassword, ...resetData } = this.resetPasswordForm.value;
      
      this.authService.resetPassword(resetData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Password reset successful! Please sign in.', 'Close', { duration: 5000 });
            this.router.navigate(['/login']);
          }
        },
        error: (error) => {
          this.loading = false;
          const message = error.error?.message || 'Password reset failed. Please try again.';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        }
      });
    } else {
      this.markFormGroupTouched(this.resetPasswordForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.resetPasswordForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1').trim()} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('pattern')) {
      return 'OTP must be 6 digits';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }
    return '';
  }

  getPasswordMismatchError(): boolean {
    return !!(this.resetPasswordForm.hasError('passwordMismatch') && 
           this.resetPasswordForm.get('confirmPassword')?.touched &&
           this.resetPasswordForm.get('newPassword')?.touched);
  }
}

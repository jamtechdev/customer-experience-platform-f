import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SettingsService } from '../../../core/services/settings.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-system-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettings implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  settingsForm: FormGroup;

  constructor() {
    this.settingsForm = this.fb.group({
      alertThreshold: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
      npsThreshold: [30, [Validators.required, Validators.min(-100), Validators.max(100)]],
      sentimentThreshold: [0.6, [Validators.required, Validators.min(0), Validators.max(1)]],
      enableAlerts: [true],
      enableNotifications: [true]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    const settings = this.settingsService.getSettings();
    this.settingsForm.patchValue({
      alertThreshold: settings.alerts?.thresholds?.sentiment ? Math.abs(settings.alerts.thresholds.sentiment * 100) : 50,
      npsThreshold: settings.alerts?.thresholds?.nps || 30,
      sentimentThreshold: settings.alerts?.thresholds?.sentiment ? Math.abs(settings.alerts.thresholds.sentiment) : 0.6,
      enableAlerts: settings.alerts?.enabled ?? true,
      enableNotifications: settings.notifications?.inApp ?? true
    });
    this.loading.set(false);
  }

  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.loading.set(true);
      const formValue = this.settingsForm.value;
      const settingsUpdate = {
        alerts: {
          enabled: formValue.enableAlerts,
          thresholds: {
            sentiment: -formValue.sentimentThreshold,
            nps: formValue.npsThreshold,
            complaint: 10
          }
        },
        notifications: {
          email: true,
          push: false,
          inApp: formValue.enableNotifications
        }
      };
      
      this.settingsService.updateSettings(settingsUpdate).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

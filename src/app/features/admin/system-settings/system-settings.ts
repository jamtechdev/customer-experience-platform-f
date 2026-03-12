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
  alertThresholdsForm: FormGroup;
  sentimentParametersForm: FormGroup;

  constructor() {
    this.settingsForm = this.fb.group({
      enableAlerts: [true],
      enableNotifications: [true]
    });
    this.alertThresholdsForm = this.fb.group({
      sentimentDropThreshold: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
      npsDeclineThreshold: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      complaintSpikeThreshold: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      competitorOutperformThreshold: [0.2, [Validators.required, Validators.min(0), Validators.max(1)]]
    });
    this.sentimentParametersForm = this.fb.group({
      positiveThreshold: [0.1, [Validators.required, Validators.min(-1), Validators.max(1)]],
      negativeThreshold: [-0.1, [Validators.required, Validators.min(-1), Validators.max(1)]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadAlertThresholds();
    this.loadSentimentParameters();
  }

  loadSettings(): void {
    const settings = this.settingsService.getSettings();
    this.settingsForm.patchValue({
      enableAlerts: settings.alerts?.enabled ?? true,
      enableNotifications: settings.notifications?.inApp ?? true
    });
  }

  loadAlertThresholds(): void {
    this.loading.set(true);
    this.settingsService.getAlertThresholds().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.alertThresholdsForm.patchValue({
            sentimentDropThreshold: response.data.sentimentDropThreshold,
            npsDeclineThreshold: response.data.npsDeclineThreshold,
            complaintSpikeThreshold: response.data.complaintSpikeThreshold,
            competitorOutperformThreshold: response.data.competitorOutperformThreshold
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadSentimentParameters(): void {
    this.settingsService.getSentimentParameters().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sentimentParametersForm.patchValue({
            positiveThreshold: response.data.positiveThreshold,
            negativeThreshold: response.data.negativeThreshold
          });
        }
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.loading.set(true);
      const formValue = this.settingsForm.value;
      const settingsUpdate = {
        alerts: { enabled: formValue.enableAlerts },
        notifications: { email: true, push: false, inApp: formValue.enableNotifications }
      } as Parameters<SettingsService['updateSettings']>[0];
      this.settingsService.updateSettings(settingsUpdate).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        }
      });
    }
  }

  saveAlertThresholds(): void {
    if (this.alertThresholdsForm.valid) {
      this.loading.set(true);
      this.settingsService.updateAlertThresholds(this.alertThresholdsForm.value).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.snackBar.open('Alert thresholds saved successfully', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Failed to save alert thresholds', 'Close', { duration: 3000 });
        }
      });
    }
  }

  saveSentimentParameters(): void {
    if (this.sentimentParametersForm.valid) {
      this.loading.set(true);
      this.settingsService.updateSentimentParameters(this.sentimentParametersForm.value).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.snackBar.open('Sentiment parameters saved successfully', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Failed to save sentiment parameters', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService } from '../../../core/services/settings.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { FirebaseNotificationService } from '../../../core/services/firebase-notification.service';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';

@Component({
  selector: 'app-alert-configuration',
  standalone: true,
  imports: [
    PageHeaderCard,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    OllamaLoader,
  ],
  templateUrl: './alert-configuration.html',
  styleUrl: './alert-configuration.css',
})
export class AlertConfiguration implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private firebaseNotificationService = inject(FirebaseNotificationService);

  loading = signal(false);
  saving = signal(false);
  savingEmail = signal(false);
  runningCheck = signal(false);
  form: FormGroup;
  emailEnabled = false;
  emailRecipients = '';
  pushEnabled = signal(false);
  pushSaving = signal(false);
  pushTokenCount = signal(0);
  firebaseEnabled = signal(this.firebaseNotificationService.isEnabled());
  firebaseMissingKeys = signal<string[]>(this.firebaseNotificationService.missingConfigKeys());
  firebaseConfigured = signal(this.firebaseEnabled() && this.firebaseMissingKeys().length === 0);

  constructor() {
    this.form = this.fb.group({
      sentimentDropThreshold: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
      npsDeclineThreshold: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      complaintSpikeThreshold: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      competitorOutperformThreshold: [0.2, [Validators.required, Validators.min(0), Validators.max(1)]],
    });
  }

  ngOnInit(): void {
    this.refreshFirebaseConfigStatus();
    this.loadThresholds();
    this.loadAlertEmailSettings();
    this.loadAlertPushSettings();
  }

  refreshFirebaseConfigStatus(): void {
    const enabled = this.firebaseNotificationService.isEnabled();
    const missing = this.firebaseNotificationService.missingConfigKeys();
    this.firebaseEnabled.set(enabled);
    this.firebaseMissingKeys.set(missing);
    this.firebaseConfigured.set(enabled && missing.length === 0);
  }

  loadAlertEmailSettings(): void {
    this.settingsService.getAlertEmailSettings().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.emailEnabled = res.data.enabled;
          this.emailRecipients = (res.data.recipients || []).join(', ');
        }
      },
      error: () => {}
    });
  }

  saveAlertEmailSettings(): void {
    const recipients = this.emailRecipients
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.savingEmail.set(true);
    this.settingsService.updateAlertEmailSettings({ enabled: this.emailEnabled, recipients }).subscribe({
      next: (res) => {
        this.savingEmail.set(false);
        if (res.success) {
          this.snackBar.open('Alert email settings saved', 'Close', { duration: 2000 });
        }
      },
      error: () => {
        this.savingEmail.set(false);
        this.snackBar.open('Failed to save alert email settings', 'Close', { duration: 3000 });
      },
    });
  }

  loadAlertPushSettings(): void {
    this.settingsService.getAlertPushSettings().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pushEnabled.set(res.data.enabled);
          this.pushTokenCount.set(res.data.tokens?.length || 0);
        }
      },
      error: () => {},
    });
  }

  async enableFirebaseNotifications(): Promise<void> {
    this.refreshFirebaseConfigStatus();
    if (!this.firebaseEnabled()) {
      this.snackBar.open('Firebase notifications are disabled by env. Email alerts remain available.', 'Close', { duration: 6000 });
      return;
    }
    if (!this.firebaseConfigured()) {
      this.snackBar.open(`Firebase config missing: ${this.firebaseMissingKeys().join(', ')}`, 'Close', { duration: 7000 });
      return;
    }
    this.pushSaving.set(true);
    try {
      const token = await this.firebaseNotificationService.enableAlertNotifications();
      this.pushSaving.set(false);
      if (token) {
        this.pushEnabled.set(true);
        this.loadAlertPushSettings();
        this.snackBar.open('Firebase notifications enabled for this browser', 'Close', { duration: 3000 });
      } else {
        this.snackBar.open('Notification permission was not granted or Firebase messaging is unsupported', 'Close', { duration: 5000 });
      }
    } catch {
      this.pushSaving.set(false);
      this.snackBar.open('Failed to enable Firebase notifications', 'Close', { duration: 4000 });
    }
  }

  async disableFirebaseNotifications(): Promise<void> {
    this.pushSaving.set(true);
    await this.firebaseNotificationService.disableAlertNotifications();
    this.settingsService.updateAlertPushSettings({ enabled: false, tokens: [] }).subscribe({
      next: () => {
        this.pushSaving.set(false);
        this.pushEnabled.set(false);
        this.pushTokenCount.set(0);
        this.snackBar.open('Firebase notifications disabled', 'Close', { duration: 3000 });
      },
      error: () => {
        this.pushSaving.set(false);
        this.snackBar.open('Failed to disable Firebase notifications', 'Close', { duration: 3000 });
      },
    });
  }

  loadThresholds(): void {
    this.loading.set(true);
    this.settingsService.getAlertThresholds().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.form.patchValue({
            sentimentDropThreshold: res.data.sentimentDropThreshold,
            npsDeclineThreshold: res.data.npsDeclineThreshold,
            complaintSpikeThreshold: res.data.complaintSpikeThreshold,
            competitorOutperformThreshold: res.data.competitorOutperformThreshold,
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load alert thresholds', 'Close', { duration: 3000 });
      },
    });
  }

  saveThresholds(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.settingsService.updateAlertThresholds(this.form.value).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.snackBar.open('Alert thresholds saved', 'Close', { duration: 2000 });
        }
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save thresholds', 'Close', { duration: 3000 });
      },
    });
  }

  runCheck(): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.runningCheck.set(true);
    this.alertService.checkAlerts(companyId, this.form.valid ? this.form.value : undefined).subscribe({
      next: (res) => {
        this.runningCheck.set(false);
        const count = Array.isArray(res?.data) ? res.data.length : 0;
        this.snackBar.open(
          count > 0 ? `Alert check complete: ${count} new alert(s) created` : 'Alert check complete. No new alerts.',
          'Close',
          { duration: 3000 }
        );
      },
      error: () => {
        this.runningCheck.set(false);
        this.snackBar.open('Alert check failed', 'Close', { duration: 3000 });
      },
    });
  }
}

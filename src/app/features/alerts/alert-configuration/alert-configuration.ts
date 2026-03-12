import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

@Component({
  selector: 'app-alert-configuration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
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

  loading = signal(false);
  saving = signal(false);
  runningCheck = signal(false);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      sentimentDropThreshold: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
      npsDeclineThreshold: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      complaintSpikeThreshold: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      competitorOutperformThreshold: [0.2, [Validators.required, Validators.min(0), Validators.max(1)]],
    });
  }

  ngOnInit(): void {
    this.loadThresholds();
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
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
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

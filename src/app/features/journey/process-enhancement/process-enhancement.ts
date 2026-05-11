import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { buildClientReportDatePresets } from '../../../core/utils/report-date-presets';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import type { ApiResponse } from '../../../core/models';
import type { TwitterCxReportDto } from '../../../core/models/analysis.model';

@Component({
  selector: 'app-process-enhancement',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './process-enhancement.html',
  styleUrl: './process-enhancement.css',
})
export class ProcessEnhancement implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  processImprovements = signal<string[]>([]);
  managementTakeaways = signal<string[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    const presets = buildClientReportDatePresets();
    const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
    const preset = presets.find((p) => p.id === defaultId) ?? presets[0];
    this.loading.set(true);
    const reportTimeoutMs = 180_000;
    this.analysisService
      .getTwitterCxReport(companyId, new Date(preset.startDate), new Date(preset.endDate))
      .pipe(
        timeout(reportTimeoutMs),
        catchError(() => {
          this.loading.set(false);
          this.processImprovements.set([]);
          this.managementTakeaways.set([]);
          this.snackBar.open(
            'Report request timed out. Try a narrower date range or retry in a moment.',
            'Close',
            { duration: 6000 }
          );
          return of<ApiResponse<TwitterCxReportDto | null>>({
            success: false,
            data: null,
            message: 'timeout',
          });
        })
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.processImprovements.set(res.data.processImprovements ?? []);
            this.managementTakeaways.set(res.data.managementTakeaways ?? []);
          } else {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
          }
          this.loading.set(false);
        },
        error: () => {
          this.processImprovements.set([]);
          this.managementTakeaways.set([]);
          this.loading.set(false);
        },
      });
  }
}

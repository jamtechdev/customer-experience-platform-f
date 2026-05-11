import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

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
    this.loading.set(true);
    this.analysisService
      .getTwitterCxReport(companyId)
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
            this.snackBar.open(twitterCxReportFailureMessage(res.message), 'Close', { duration: 8000 });
            this.loading.set(false);
            return;
          }
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
          this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
        },
      });
  }
}

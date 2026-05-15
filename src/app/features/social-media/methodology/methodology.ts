import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

@Component({
  selector: 'app-methodology',
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './methodology.html',
  styleUrl: './methodology.css',
})
export class Methodology implements OnInit {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  bullets = signal<string[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.bullets.set([]);
          this.snackBar.open(twitterCxReportFailureMessage(res.message), 'Close', { duration: 7000 });
        } else {
          this.bullets.set(res.data?.scopeAndMethodBullets ? res.data.scopeAndMethodBullets : []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.bullets.set([]);
        this.loading.set(false);
        this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
      },
    });
  }
}

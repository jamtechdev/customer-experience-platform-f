import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

interface DatasetProfileRow {
  metric: string;
  value: string;
  comment: string;
}

@Component({
  selector: 'app-dataset-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './dataset-profile.html',
  styleUrl: './dataset-profile.css',
})
export class DatasetProfile implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private refreshSub?: Subscription;

  readonly displayedColumns = ['metric', 'value', 'comment'];
  loading = signal(false);

  rows = signal<DatasetProfileRow[]>([]);

  ngOnInit(): void {
    this.loadProfile();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadProfile());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadProfile(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.rows.set([]);
          this.snackBar.open(twitterCxReportFailureMessage(res.message), 'Close', { duration: 7000 });
        } else {
          this.rows.set(res.data?.datasetProfileRows ? res.data.datasetProfileRows : []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
      },
    });
  }
}

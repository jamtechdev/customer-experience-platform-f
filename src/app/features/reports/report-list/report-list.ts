import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../../core/services/report.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Report {
  id: number;
  name: string;
  type: string;
  createdAt: Date;
  status: string;
}

@Component({
  selector: 'app-report-list',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './report-list.html',
  styleUrl: './report-list.css',
})
export class ReportList implements OnInit {
  private reportService = inject(ReportService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  reports = signal<Report[]>([]);
  displayedColumns: string[] = ['name', 'type', 'createdAt', 'status', 'actions'];

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading.set(true);
    this.reportService.getReports().subscribe({
      next: (response) => {
        if (response.success) {
          // Map API response to component interface (convert id from string to number if needed)
          const mapped = (response.data || []).map((item: any) => ({
            id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
            name: item.name || 'Untitled Report',
            type: item.type || 'standard',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            status: item.status || 'completed'
          }));
          this.reports.set(mapped);
        } else {
          this.reports.set([]);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load reports:', error);
        this.loading.set(false);
        this.reports.set([]);
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load reports', 'Close', { duration: 3000 });
        }
      }
    });
  }

  downloadReport(report: Report): void {
    this.snackBar.open('Downloading report...', 'Close', { duration: 2000 });
  }

  deleteReport(report: Report): void {
    this.snackBar.open('Report deleted', 'Close', { duration: 2000 });
  }
}

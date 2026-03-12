import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type ReportType = 'executive' | 'full';
type ReportFormat = 'pdf' | 'excel';

@Component({
  selector: 'app-report-builder',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './report-builder.html',
  styleUrl: './report-builder.css',
})
export class ReportBuilder {
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  reportType = signal<ReportType>('executive');
  reportFormat = signal<ReportFormat>('pdf');
  exporting = signal(false);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  get companyId(): number {
    return this.authService.currentUser()?.settings?.companyId ?? 1;
  }

  exportReport(): void {
    this.exporting.set(true);
    const config: { companyId: number; startDate?: string; endDate?: string } = { companyId: this.companyId };
    const start = this.startDate();
    const end = this.endDate();
    if (start) config.startDate = start;
    if (end) config.endDate = end;
    const format = this.reportFormat();
    const type = this.reportType();
    const dateStr = new Date().toISOString().slice(0, 10);

    const done = (): void => {
      this.exporting.set(false);
      this.snackBar.open('Report downloaded', 'Close', { duration: 2000 });
    };
    const fail = (): void => {
      this.exporting.set(false);
      this.snackBar.open('Export failed', 'Close', { duration: 3000 });
    };

    if (format === 'pdf') {
      this.reportService.exportDashboardToPdf(config).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-report-${dateStr}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          done();
        },
        error: fail
      });
    } else {
      this.reportService.exportDashboardToExcel(config).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-report-${dateStr}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          done();
        },
        error: fail
      });
    }
  }
}

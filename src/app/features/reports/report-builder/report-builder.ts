import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportExportRecord, ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  datesValidYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';

type ReportType = 'executive' | 'full';
type ReportFormat = 'pdf' | 'excel';
interface CreatedReportRecord {
  id: number;
  type: ReportType;
  format: ReportFormat;
  range: string;
  createdAt: Date;
}

/** Report export: user must pick a fixed preset or custom range; backend also requires startDate/endDate. */

@Component({
  selector: 'app-report-builder',
  imports: [
    PageHeaderCard,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReportDateRangeFilter,
  ],
  templateUrl: './report-builder.html',
  styleUrl: './report-builder.css',
})
export class ReportBuilder implements OnInit {
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);

  readonly t = (key: string): string => this.translationService.translate(key);

  reportType = signal<ReportType>('executive');
  reportFormat = signal<ReportFormat>('pdf');
  exporting = signal(false);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  createdReports = signal<CreatedReportRecord[]>([]);
  private readonly maxStoredReports = 50;

  get companyId(): number {
    return this.authService.currentUser()?.settings?.companyId ?? 1;
  }

  ngOnInit(): void {
    this.loadCreatedReportsFromDb();
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
      },
      error: () => {
        this.presets.set(buildClientReportDatePresets());
      },
    });
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
  }

  canCreateReport(): boolean {
    return this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID || this.datesValid();
  }

  private exportRange(): { startDate: string; endDate: string; displayRange: string } {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      const allTime = this.presets().find((p) => p.id === 'all_time');
      if (allTime) {
        return {
          startDate: allTime.startDate,
          endDate: allTime.endDate,
          displayRange: this.t('reports.allData'),
        };
      }
      const fallbackEnd = new Date();
      fallbackEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date('1970-01-01T00:00:00.000Z').toISOString(),
        endDate: fallbackEnd.toISOString(),
        displayRange: this.t('reports.allData'),
      };
    }
    const { startDate, endDate } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    return {
      startDate,
      endDate,
      displayRange: `${this.startDate()} -> ${this.endDate()}`,
    };
  }

  exportReport(): void {
    if (!this.canCreateReport()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 5000 });
      return;
    }
    this.exporting.set(true);
    const { startDate: sd, endDate: ed, displayRange } = this.exportRange();
    const format = this.reportFormat();
    const type = this.reportType();
    const config: { companyId: number; startDate: string; endDate: string; reportType: ReportType; displayRange: string } = {
      companyId: this.companyId,
      startDate: sd,
      endDate: ed,
      reportType: type,
      displayRange,
    };
    const dateStr = new Date().toISOString().slice(0, 10);

    const done = (): void => {
      this.exporting.set(false);
      this.snackBar.open(this.t('reports.downloaded'), this.t('app.close'), { duration: 2000 });
    };
    const fail = (err: unknown): void => {
      this.exporting.set(false);
      const msg =
        err && typeof err === 'object' && 'error' in err && (err as { error?: { message?: string } }).error?.message
          ? String((err as { error: { message: string } }).error.message)
          : this.t('reports.exportFailed');
      this.snackBar.open(msg, this.t('app.close'), { duration: 5000 });
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
          this.loadCreatedReportsFromDb();
          done();
        },
        error: fail,
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
          this.loadCreatedReportsFromDb();
          done();
        },
        error: fail,
      });
    }
  }

  createReport(): void {
    this.exportReport();
  }

  private loadCreatedReportsFromDb(): void {
    this.reportService.getReportExports().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const records = rows
          .map((row) => this.mapReportExport(row))
          .filter((item): item is CreatedReportRecord => item !== null)
          .slice(0, this.maxStoredReports);
        this.createdReports.set(records);
      },
      error: () => {
        this.createdReports.set([]);
      },
    });
  }

  private mapReportExport(row: ReportExportRecord): CreatedReportRecord | null {
    const id = Number(row.id);
    const createdAt = new Date(row.createdAt || Date.now());
    if (!Number.isFinite(id) || Number.isNaN(createdAt.getTime())) return null;
    const rawType = String(row.type || '').toLowerCase();
    const rawFormat = String(row.format || '').toLowerCase();
    if (!['executive', 'dashboard', 'custom'].includes(rawType)) return null;
    if (!['pdf', 'excel'].includes(rawFormat)) return null;
    return {
      id,
      type: rawType === 'executive' ? 'executive' : 'full',
      format: rawFormat === 'excel' ? 'excel' : 'pdf',
      range: this.reportRangeLabel(row),
      createdAt,
    };
  }

  private reportRangeLabel(row: ReportExportRecord): string {
    const params = row.parameters || {};
    const displayRange = params['displayRange'];
    if (typeof displayRange === 'string' && displayRange.trim()) {
      return displayRange;
    }
    const start = typeof params.startDate === 'string' ? params.startDate.slice(0, 10) : '';
    const end = typeof params.endDate === 'string' ? params.endDate.slice(0, 10) : '';
    if (!start || !end) return this.t('reports.allData');
    if (start <= '1970-01-02') return this.t('reports.allData');
    return `${start} -> ${end}`;
  }

}

import { Component, inject, signal, OnInit } from '@angular/core';
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
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

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
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
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

  get companyId(): number {
    return this.authService.currentUser()?.settings?.companyId ?? 1;
  }

  ngOnInit(): void {
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

  applyPreset(p: ReportDatePreset): void {
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
  }

  onPresetChange(id: string): void {
    if (id === NO_DATE_FILTER_PRESET_ID) {
      this.selectedPresetId.set(NO_DATE_FILTER_PRESET_ID);
      this.startDate.set(null);
      this.endDate.set(null);
      return;
    }
    if (id === 'custom') {
      this.selectedPresetId.set('custom');
      return;
    }
    const p = this.presets().find((x) => x.id === id);
    if (p) this.applyPreset(p);
  }

  presetLabel(p: ReportDatePreset): string {
    const labels: Record<string, string> = {
      all_time: 'reports.allTime',
      last_7_days: 'reports.last7Days',
      last_30_days: 'reports.last30Days',
      last_calendar_month: 'reports.lastCalendarMonth',
      ytd: 'reports.yearToDate',
    };
    return labels[p.id] ? this.t(labels[p.id]) : p.label;
  }

  onManualDate(): void {
    this.selectedPresetId.set('custom');
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
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
    const config: { companyId: number; startDate: string; endDate: string } = {
      companyId: this.companyId,
      startDate: sd,
      endDate: ed,
    };
    const format = this.reportFormat();
    const type = this.reportType();
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
          this.pushCreatedReport(type, format, displayRange);
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
          this.pushCreatedReport(type, format, displayRange);
          done();
        },
        error: fail,
      });
    }
  }

  createReport(): void {
    this.exportReport();
  }

  private pushCreatedReport(type: ReportType, format: ReportFormat, range: string): void {
    const next: CreatedReportRecord = {
      id: Date.now(),
      type,
      format,
      range,
      createdAt: new Date(),
    };
    this.createdReports.update((list) => [next, ...list]);
  }
}

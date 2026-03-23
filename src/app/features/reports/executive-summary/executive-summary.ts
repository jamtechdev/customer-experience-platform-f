import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DashboardService, ExecutiveDashboardData } from '../../../core/services/dashboard.service';
import { ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

@Component({
  selector: 'app-executive-summary',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './executive-summary.html',
  styleUrl: './executive-summary.css',
})
export class ExecutiveSummary implements OnInit {
  private dashboardService = inject(DashboardService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);

  readonly t = (key: string, params?: Record<string, string>): string => this.translationService.translate(key, params);

  loading = signal(true);
  exporting = signal(false);
  data = signal<ExecutiveDashboardData | null>(null);
  Math = Math;

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private manualReloadTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadPresets();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const role = this.authService.currentUser()?.role;
        const defId = role === 'admin' ? 'all_time' : 'last_30_days';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.loadSummary();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const role = this.authService.currentUser()?.role;
        const defId = role === 'admin' ? 'all_time' : 'last_30_days';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.loadSummary();
      },
    });
  }

  applyPreset(p: ReportDatePreset): void {
    if (this.manualReloadTimer) {
      clearTimeout(this.manualReloadTimer);
      this.manualReloadTimer = null;
    }
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
  }

  onPresetChange(id: string): void {
    if (id === 'custom') {
      this.selectedPresetId.set('custom');
      return;
    }
    const p = this.presets().find((x) => x.id === id);
    if (p) {
      this.applyPreset(p);
      this.loadSummary();
    }
  }

  onManualDate(): void {
    this.selectedPresetId.set('custom');
    if (!this.datesValid()) return;

    if (this.manualReloadTimer) clearTimeout(this.manualReloadTimer);
    // Debounce to avoid spamming the API while the user is editing.
    this.manualReloadTimer = setTimeout(() => this.loadSummary(), 400);
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
  }

  applyRangeAndReload(): void {
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 5000 });
      return;
    }
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const companyId = isAdmin ? undefined : (user?.settings?.companyId ?? 1);
    if (!this.datesValid()) {
      this.loading.set(false);
      return;
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    this.dashboardService.getExecutiveDashboard(companyId, new Date(sd), new Date(ed)).subscribe({
      next: (res) => {
        if (res.success && res.data) this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.t('reports.executiveSummaryLoadFailed'), this.t('app.close'), { duration: 3000 });
      },
    });
  }

  exportPdf(): void {
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 5000 });
      return;
    }
    this.exporting.set(true);
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    this.reportService.exportDashboardToPdf({ companyId, startDate: sd, endDate: ed }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.snackBar.open(this.t('reports.downloaded'), this.t('app.close'), { duration: 2000 });
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open(this.t('reports.exportFailed'), this.t('app.close'), { duration: 4000 });
      },
    });
  }
}

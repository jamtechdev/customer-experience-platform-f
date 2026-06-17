import { Component, computed, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslationService } from '../../services/translation.service';
import { DatePickerInput } from '../date-picker-input/date-picker-input';
import {
  NO_DATE_FILTER_PRESET_ID,
  type ReportDatePreset,
  datesValidYmd,
  applyDashboardDatePreset,
  toLocalYmd,
} from '../../utils/report-date-presets';

export type ReportDateFilterMode = 'analytics' | 'dashboard';

@Component({
  selector: 'app-report-date-range-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    DatePickerInput,
  ],
  templateUrl: './report-date-range-filter.html',
  styleUrl: './report-date-range-filter.css',
})
export class ReportDateRangeFilter {
  private translationService = inject(TranslationService);

  mode = input<ReportDateFilterMode>('analytics');
  presets = input<ReportDatePreset[]>([]);
  showNoFilterOption = input(true);
  showActiveRange = input(true);
  lockDatesUntilCustom = input(false);
  wrapInCard = input(false);
  showApplyButton = input(true);
  applyDisabled = input(false);
  applyFlat = input(false);
  periodTitle = input<string | null>(null);
  periodLabelKey = input('dashboard.period');
  activeRangeStartFallback = input<string | null>(null);
  activeRangeEndFallback = input<string | null>(null);
  applyLabelKey = input('app.apply');

  selectedPresetId = model<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = model<string | null>(null);
  endDate = model<string | null>(null);

  apply = output<void>();

  readonly todayYmd = computed(() => toLocalYmd(new Date()));

  readonly datesLocked = computed(
    () => this.lockDatesUntilCustom() && this.selectedPresetId() !== 'custom',
  );

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  activeRangeStartLabel(): string {
    return this.startDate() || this.activeRangeStartFallback() || this.t('reports.allData');
  }

  activeRangeEndLabel(): string {
    return this.endDate() || this.activeRangeEndFallback() || this.t('reports.allData');
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
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

  onPresetChange(id: string): void {
    if (this.mode() === 'dashboard') {
      this.applyDashboardPreset(id);
      return;
    }

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
    const preset = this.presets().find((item) => item.id === id);
    if (preset) {
      this.selectedPresetId.set(preset.id);
      this.startDate.set(preset.startDate.slice(0, 10));
      this.endDate.set(preset.endDate.slice(0, 10));
    }
  }

  onStartDateChange(value: string | null): void {
    this.startDate.set(value);
    this.selectedPresetId.set('custom');
  }

  onEndDateChange(value: string | null): void {
    this.endDate.set(value);
    this.selectedPresetId.set('custom');
  }

  onApplyClick(): void {
    this.apply.emit();
  }

  private applyDashboardPreset(id: string): void {
    this.selectedPresetId.set(id);
    if (id === 'custom') {
      return;
    }
    const { startDate, endDate } = applyDashboardDatePreset(id);
    this.startDate.set(startDate);
    this.endDate.set(endDate);
  }
}

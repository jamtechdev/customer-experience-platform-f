import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { buildClientReportDatePresets } from '../../../core/utils/report-date-presets';

interface DatasetProfileRow {
  metric: string;
  value: string;
  comment: string;
}

@Component({
  selector: 'app-dataset-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  templateUrl: './dataset-profile.html',
  styleUrl: './dataset-profile.css',
})
export class DatasetProfile implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);

  readonly displayedColumns = ['metric', 'value', 'comment'];
  loading = signal(false);

  rows = signal<DatasetProfileRow[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    const presets = buildClientReportDatePresets();
    const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
    const preset = presets.find((p) => p.id === defaultId) ?? presets[0];
    this.loading.set(true);
    this.analysisService.getTwitterCxReport(companyId, new Date(preset.startDate), new Date(preset.endDate)).subscribe({
      next: (res) => {
        this.rows.set((res.success && res.data?.datasetProfileRows) ? res.data.datasetProfileRows : []);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }
}

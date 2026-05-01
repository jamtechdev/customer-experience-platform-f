import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { buildClientReportDatePresets } from '../../../core/utils/report-date-presets';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';

@Component({
  selector: 'app-methodology',
  imports: [
    CommonModule,
    MatCardModule,
    OllamaLoader
  ],
  templateUrl: './methodology.html',
  styleUrl: './methodology.css',
})
export class Methodology implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);

  loading = signal(false);
  bullets = signal<string[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    const presets = buildClientReportDatePresets();
    const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
    const preset = presets.find((p) => p.id === defaultId) ?? presets[0];
    this.loading.set(true);
    this.analysisService.getTwitterCxReport(companyId, new Date(preset.startDate), new Date(preset.endDate)).subscribe({
      next: (res) => {
        this.bullets.set((res.success && res.data?.scopeAndMethodBullets) ? res.data.scopeAndMethodBullets : []);
        this.loading.set(false);
      },
      error: () => {
        this.bullets.set([]);
        this.loading.set(false);
      },
    });
  }
}

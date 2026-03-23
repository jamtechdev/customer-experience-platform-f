import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { AuthService } from '../../../core/services/auth.service';

interface StageRow {
  stageName: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  painPoints: string[];
  satisfactionPoints: string[];
}

@Component({
  selector: 'app-journey-heatmap',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './journey-heatmap.html',
  styleUrl: './journey-heatmap.css',
})
export class JourneyHeatmap implements OnInit {
  private journeyService = inject(CustomerJourneyService);
  private authService = inject(AuthService);

  loading = signal(false);
  stages = signal<StageRow[]>([]);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadHeatmap();
  }

  loadHeatmap(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.error.set(null);
    this.journeyService.analyzeJourney(companyId).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.stages.set(
            res.data.map((s: any) => ({
              stageName: s.stage?.name ?? 'Unknown',
              satisfactionScore: Number(s.satisfactionScore) ?? 0,
              dissatisfactionScore: Number(s.dissatisfactionScore) ?? 0,
              feedbackCount: Number(s.feedbackCount) ?? 0,
              painPoints: Array.isArray(s.painPoints) ? s.painPoints : [],
              satisfactionPoints: Array.isArray(s.satisfactionPoints) ? s.satisfactionPoints : [],
            }))
          );
        } else {
          this.stages.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load journey analysis');
        this.stages.set([]);
        this.loading.set(false);
      },
    });
  }

  getSatisfactionColor(score: number): string {
    if (score >= 0.5) return 'heat-high';
    if (score >= 0.2) return 'heat-mid';
    if (score > 0) return 'heat-low';
    return 'heat-none';
  }

  getDissatisfactionColor(score: number): string {
    if (score >= 0.6) return 'heat-pain-high';
    if (score >= 0.3) return 'heat-pain-mid';
    if (score > 0) return 'heat-pain-low';
    return 'heat-none';
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface JourneyStage {
  id: number;
  name: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  painPoints: string[];
  satisfactionPoints: string[];
}

@Component({
  selector: 'app-journey-map',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './journey-map.html',
  styleUrl: './journey-map.css',
})
export class JourneyMap implements OnInit {
  private journeyService = inject(CustomerJourneyService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  journeyStages = signal<JourneyStage[]>([]);

  ngOnInit(): void {
    this.loadJourneyData();
  }

  loadJourneyData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.journeyService.analyzeJourney(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          // Backend returns JourneyStageAnalysis[] like:
          // { stage: {id,name,...}, satisfactionScore, dissatisfactionScore, feedbackCount, painPoints, satisfactionPoints }
          const list = Array.isArray(data) ? data : data?.stages;
          if (!Array.isArray(list)) {
            this.journeyStages.set([]);
            this.loading.set(false);
            return;
          }

          this.journeyStages.set(
            list.map((s: any) => ({
              id: s?.stage?.id ?? s?.stageId ?? s?.id ?? 0,
              name: s?.stage?.name ?? s?.name ?? '',
              satisfactionScore: Number(s?.satisfactionScore ?? 0),
              dissatisfactionScore: Number(s?.dissatisfactionScore ?? 0),
              feedbackCount: Number(s?.feedbackCount ?? 0),
              painPoints: Array.isArray(s?.painPoints) ? s.painPoints : [],
              satisfactionPoints: Array.isArray(s?.satisfactionPoints) ? s.satisfactionPoints : [],
            }))
          );
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Failed to load journey data', 'Close', { duration: 3000 });
      }
    });
  }

  getSatisfactionColor(score: number): string {
    // Backend returns satisfactionScore in 0..1 range; UI shows it as percentage.
    const pct = score * 100;
    if (pct >= 70) return 'satisfaction-high';
    if (pct >= 50) return 'satisfaction-medium';
    return 'satisfaction-low';
  }
}

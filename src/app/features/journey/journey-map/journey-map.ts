import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
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
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  journeyStages = signal<JourneyStage[]>([]);

  ngOnInit(): void {
    this.loadJourneyData();
  }

  loadJourneyData(): void {
    this.loading.set(true);
    this.journeyService.analyzeJourney().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          // Handle both array and object response formats
          if (Array.isArray(data)) {
            this.journeyStages.set(data);
          } else if (data.stages) {
            this.journeyStages.set(data.stages);
          } else {
            this.journeyStages.set([]);
          }
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
    if (score >= 70) return 'satisfaction-high';
    if (score >= 50) return 'satisfaction-medium';
    return 'satisfaction-low';
  }
}

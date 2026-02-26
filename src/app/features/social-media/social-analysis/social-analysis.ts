import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface PlatformData {
  platform: string;
  volume: number;
  positive: number;
  negative: number;
  neutral: number;
  sentimentScore: number;
}

@Component({
  selector: 'app-social-analysis',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './social-analysis.html',
  styleUrl: './social-analysis.css',
})
export class SocialAnalysis implements OnInit {
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  platformData = signal<PlatformData[]>([]);
  displayedColumns: string[] = ['platform', 'volume', 'sentiment', 'positive', 'negative', 'neutral'];

  totalVolume = computed(() => {
    return this.platformData().reduce((sum, p) => sum + p.volume, 0);
  });

  averageSentiment = computed(() => {
    const data = this.platformData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, p) => sum + p.sentimentScore, 0);
    return (total / data.length * 100);
  });

  ngOnInit(): void {
    this.loadSocialMediaData();
  }

  loadSocialMediaData(): void {
    this.loading.set(true);
    // Mock data - in real app, this would come from API
    setTimeout(() => {
      this.platformData.set([
        { platform: 'Twitter', volume: 1250, positive: 650, negative: 300, neutral: 300, sentimentScore: 0.65 },
        { platform: 'Facebook', volume: 890, positive: 445, negative: 200, neutral: 245, sentimentScore: 0.60 },
        { platform: 'Instagram', volume: 650, positive: 390, negative: 130, neutral: 130, sentimentScore: 0.70 },
        { platform: 'App Store', volume: 420, positive: 252, negative: 84, neutral: 84, sentimentScore: 0.68 }
      ]);
      this.loading.set(false);
    }, 1000);
  }
}

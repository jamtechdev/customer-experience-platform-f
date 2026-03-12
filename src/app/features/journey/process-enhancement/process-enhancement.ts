import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CustomerJourneyService, ProcessEnhancementPlan } from '../../../core/services/customer-journey.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-process-enhancement',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './process-enhancement.html',
  styleUrl: './process-enhancement.css',
})
export class ProcessEnhancement {
  private journeyService = inject(CustomerJourneyService);
  private authService = inject(AuthService);

  loading = signal(false);
  plans = signal<ProcessEnhancementPlan[]>([]);
  error = signal<string | null>(null);

  loadPlans(): void {
    const companyId = this.authService.currentUser()?.settings?.companyId || 1;
    this.loading.set(true);
    this.error.set(null);
    this.journeyService.getEnhancementPlans(companyId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.plans.set(res.data);
        } else {
          this.plans.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load enhancement plans');
        this.plans.set([]);
        this.loading.set(false);
      },
    });
  }

  getPriorityColor(p: string): string {
    switch (p) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }
}

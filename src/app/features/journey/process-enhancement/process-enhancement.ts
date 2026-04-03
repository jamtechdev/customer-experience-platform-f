import { Component, computed, inject, signal, OnInit } from '@angular/core';
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
export class ProcessEnhancement implements OnInit {
  private journeyService = inject(CustomerJourneyService);
  private authService = inject(AuthService);

  loading = signal(false);
  plans = signal<ProcessEnhancementPlan[]>([]);
  error = signal<string | null>(null);
  readonly pageSize = 20;
  page = signal(1);
  pagedPlans = computed(() => {
    const all = this.plans();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.plans().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.plans().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  ngOnInit(): void {
    // Auto-generate on page open so admin sees full plans immediately.
    this.loadPlans();
  }

  loadPlans(): void {
    const companyId = this.authService.currentUser()?.settings?.companyId || 1;
    this.loading.set(true);
    this.error.set(null);
    this.journeyService.getEnhancementPlans(companyId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.plans.set(res.data);
          this.page.set(1);
        } else {
          this.plans.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load enhancement plans');
        this.plans.set([]);
        this.page.set(1);
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

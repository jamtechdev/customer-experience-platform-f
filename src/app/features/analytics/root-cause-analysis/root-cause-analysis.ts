import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface RootCause {
  id: number;
  title: string;
  category: string;
  priority: string;
  severity: number;
  frequency: number;
  description: string;
}

@Component({
  selector: 'app-root-cause-analysis',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './root-cause-analysis.html',
  styleUrl: './root-cause-analysis.css',
})
export class RootCauseAnalysis implements OnInit {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  loading = signal(false);
  rootCauses = signal<RootCause[]>([]);
  displayedColumns: string[] = ['title', 'category', 'priority', 'frequency', 'severity', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  ngOnInit(): void {
    this.loadRootCauses();
  }

  loadRootCauses(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    
    this.analysisService.getRootCauses(companyId).subscribe({
      next: (response) => {
        if (response.success) {
          // Map API response to component interface
          const mapped = (response.data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category || 'Other',
            priority: item.priority || 'medium',
            severity: item.severity || 0,
            frequency: item.frequency || 0,
            description: item.description || ''
          }));
          this.rootCauses.set(mapped);
          this.totalItems = this.rootCauses().length;
        } else {
          this.rootCauses.set([]);
          this.totalItems = 0;
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load root causes:', error);
        this.loading.set(false);
        this.rootCauses.set([]);
        this.totalItems = 0;
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load root causes', 'Close', { duration: 3000 });
        }
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedData(): RootCause[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.rootCauses().slice(start, end);
  }
}

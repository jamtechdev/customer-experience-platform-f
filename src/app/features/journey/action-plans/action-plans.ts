import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface ActionPlan {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: Date;
}

@Component({
  selector: 'app-action-plans',
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
  templateUrl: './action-plans.html',
  styleUrl: './action-plans.css',
})
export class ActionPlans implements OnInit {
  private journeyService = inject(CustomerJourneyService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  actionPlans = signal<ActionPlan[]>([]);
  displayedColumns: string[] = ['title', 'priority', 'status', 'dueDate', 'actions'];

  ngOnInit(): void {
    this.loadActionPlans();
  }

  loadActionPlans(): void {
    this.loading.set(true);
    // Mock data - in real app, this would come from API
    setTimeout(() => {
      this.actionPlans.set([
        { id: 1, title: 'Improve Customer Support Response Time', description: 'Reduce average response time', priority: 'High', status: 'In Progress', dueDate: new Date() },
        { id: 2, title: 'Enhance Product Documentation', description: 'Create comprehensive user guides', priority: 'Medium', status: 'Planned', dueDate: new Date() }
      ]);
      this.loading.set(false);
    }, 1000);
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      default: return 'primary';
    }
  }
}

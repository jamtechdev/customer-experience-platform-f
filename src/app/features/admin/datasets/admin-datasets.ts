import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CSVService, CSVImport } from '../../../core/services/csv.service';

@Component({
  selector: 'app-admin-datasets',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './admin-datasets.html',
  styleUrl: './admin-datasets.css',
})
export class AdminDatasets implements OnInit {
  private csvService = inject(CSVService);

  loading = signal(true);
  imports = signal<CSVImport[]>([]);
  displayedColumns: string[] = ['filename', 'rowCount', 'status', 'createdAt'];

  ngOnInit(): void {
    this.loadImports();
  }

  loadImports(): void {
    this.loading.set(true);
    this.csvService.getImports().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.imports.set(res.data);
        } else {
          this.imports.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.imports.set([]);
        this.loading.set(false);
      },
    });
  }

  formatDate(d: Date | string): string {
    if (!d) return 'N/A';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString();
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    if (status === 'completed') return 'primary';
    if (status === 'failed') return 'warn';
    return undefined;
  }
}

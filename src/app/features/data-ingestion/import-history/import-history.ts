import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CSVService, CSVImport } from '../../../core/services/csv.service';
import { Subscription } from 'rxjs';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './import-history.html',
  styleUrl: './import-history.css',
})
export class ImportHistory implements OnInit {
  private csvService = inject(CSVService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;
  private refreshTimer: any = null;

  loading = signal(false);
  imports = signal<CSVImport[]>([]);
  displayedColumns: string[] = ['filename', 'rowCount', 'status', 'errorMessage', 'createdAt'];

  ngOnInit(): void {
    this.loadImports();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      const { importId, status } = payload;
      if (importId == null || !status) return;

      this.imports.update((list) =>
        list.map((row) => {
          if (row.id !== importId) return row;
          const next: CSVImport = {
            ...row,
            status,
            errorMessage: payload?.errorMessage ?? row.errorMessage,
            errorDetails: payload?.errorDetails ?? row.errorDetails,
          };
          if (status === 'completed') {
            next.errorMessage = undefined;
            next.errorDetails = undefined;
          }
          if (status === 'processing' || status === 'pending') {
            next.errorMessage = undefined;
            next.errorDetails = undefined;
          }
          return next;
        })
      );
      this.syncRefreshTimer();
    });
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private syncRefreshTimer(): void {
    const hasActive = this.imports().some((r) => r.status === 'pending' || r.status === 'processing');
    if (hasActive && !this.refreshTimer) {
      // Fallback: in case websocket is delayed/missed, keep DB in sync.
      this.refreshTimer = setInterval(() => this.loadImports(), 3000);
    }
    if (!hasActive && this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
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
        this.syncRefreshTimer();
      },
      error: () => {
        this.imports.set([]);
        this.loading.set(false);
        this.syncRefreshTimer();
      },
    });
  }

  formatDate(d: Date | string): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString();
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    if (status === 'completed') return 'primary';
    if (status === 'failed') return 'warn';
    return undefined;
  }
}

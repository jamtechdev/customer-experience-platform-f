import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { CSVService, CSVImport } from '../../../core/services/csv.service';
import { Subscription } from 'rxjs';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { formatApiDate } from '../../../core/utils/api-date';

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
    MatSnackBarModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './import-history.html',
  styleUrl: './import-history.css',
})
export class ImportHistory implements OnInit {
  private csvService = inject(CSVService);
  private websocket = inject(CXWebSocketService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private importStatusSub?: Subscription;
  private refreshTimer: any = null;

  loading = signal(false);
  refreshing = signal(false);
  imports = signal<CSVImport[]>([]);
  displayedColumns: string[] = ['filename', 'rowCount', 'status', 'errorMessage', 'createdAt', 'actions'];
  deletingId = signal<number | null>(null);

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
            next.errorMessage = payload?.errorMessage;
            next.errorDetails = payload?.errorDetails;
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
    const hasRows = this.imports().length > 0;
    // Show full-page loader only on first load; for polling use lightweight refresh state.
    if (hasRows) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.csvService.getImports().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.imports.set(res.data);
        } else {
          this.imports.set([]);
        }
        this.loading.set(false);
        this.refreshing.set(false);
        this.syncRefreshTimer();
      },
      error: () => {
        if (!hasRows) {
          this.imports.set([]);
        }
        this.loading.set(false);
        this.refreshing.set(false);
        this.syncRefreshTimer();
      },
    });
  }

  formatDate(d: Date | string | number | null | undefined): string {
    return formatApiDate(d, { mode: 'datetime' });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    if (status === 'completed') return 'primary';
    if (status === 'failed') return 'warn';
    return undefined;
  }

  goToUpload(): void {
    this.router.navigate(['/app/data-sources/csv-upload']);
  }

  confirmDelete(row: CSVImport): void {
    const name = row.originalFilename || row.filename || `Import #${row.id}`;
    const msg =
      `Remove "${name}" from import history?\n\n` +
      `The uploaded file will be deleted from the server. ` +
      `Customer feedback rows already saved from this import will not be removed.`;
    if (!confirm(msg)) return;

    this.deletingId.set(row.id);
    this.csvService.deleteImport(row.id).subscribe({
      next: (res) => {
        this.deletingId.set(null);
        if (res.success) {
          this.imports.update((list) => list.filter((r) => r.id !== row.id));
          this.snackBar.open('Import removed from history.', 'Close', { duration: 5000 });
          this.syncRefreshTimer();
        } else {
          this.snackBar.open(res.message || 'Could not delete import.', 'Close', { duration: 6000 });
        }
      },
      error: (err) => {
        this.deletingId.set(null);
        const api = err && typeof err === 'object' && 'error' in err ? (err as any).error : null;
        const m =
          (api && typeof api.message === 'string' && api.message) || 'Could not delete import.';
        this.snackBar.open(m, 'Close', { duration: 7000 });
      },
    });
  }
}

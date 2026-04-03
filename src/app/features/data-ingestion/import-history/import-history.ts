import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { CSVService, CSVImport } from '../../../core/services/csv.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, firstValueFrom } from 'rxjs';
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
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './import-history.html',
  styleUrl: './import-history.css',
})
export class ImportHistory implements OnInit {
  private csvService = inject(CSVService);
  private authService = inject(AuthService);
  private websocket = inject(CXWebSocketService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private importStatusSub?: Subscription;
  private refreshTimer: any = null;

  loading = signal(false);
  refreshing = signal(false);
  imports = signal<CSVImport[]>([]);
  selectedImportIds = signal<Set<number>>(new Set());
  bulkDeleting = signal(false);
  displayedColumns: string[] = [];
  deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.configureDisplayedColumns();
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
    // Never blank the page; always refresh silently in background.
    this.refreshing.set(true);
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

  isAdminUser(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  private configureDisplayedColumns(): void {
    const base = ['filename', 'rowCount', 'status', 'errorMessage', 'createdAt'];
    this.displayedColumns = this.isAdminUser()
      ? ['select', ...base, 'actions']
      : base;
  }

  toggleSelectImport(importId: number, checked: boolean): void {
    const next = new Set(this.selectedImportIds());
    if (checked) next.add(importId);
    else next.delete(importId);
    this.selectedImportIds.set(next);
  }

  isAllSelected(): boolean {
    const ids = this.imports().map((r) => r.id);
    if (ids.length === 0) return false;
    const selected = this.selectedImportIds();
    return ids.every((id) => selected.has(id));
  }

  toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedImportIds.set(new Set());
      return;
    }
    const ids = this.imports().map((r) => r.id);
    this.selectedImportIds.set(new Set(ids));
  }

  async bulkDeleteSelectedImports(): Promise<void> {
    if (!this.isAdminUser()) return;
    const ids = [...this.selectedImportIds()];
    if (ids.length === 0) return;

    const ok = confirm(
      `Delete ${ids.length} import(s) and all related feedback rows?\n\nThis action cannot be undone.`
    );
    if (!ok) return;

    this.bulkDeleting.set(true);
    try {
      for (const id of ids) {
        await firstValueFrom(this.csvService.deleteImport(id, true));
      }
      this.selectedImportIds.set(new Set());
      this.snackBar.open(`Deleted ${ids.length} imports`, 'Close', { duration: 5000 });
      this.loadImports();
    } catch (e: any) {
      this.snackBar.open(e?.message || 'Failed to delete selected imports', 'Close', { duration: 6500 });
    } finally {
      this.bulkDeleting.set(false);
    }
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
    if (!this.isAdminUser()) return;
    const name = row.originalFilename || row.filename || `Import #${row.id}`;
    const msg =
      `Delete "${name}"?\n\n` +
      `This will remove the import history entry, uploaded file, and related imported feedback rows.`;
    if (!confirm(msg)) return;

    this.deletingId.set(row.id);
    this.csvService.deleteImport(row.id, true).subscribe({
      next: (res) => {
        this.deletingId.set(null);
        if (res.success) {
          this.imports.update((list) => list.filter((r) => r.id !== row.id));
          this.snackBar.open('Import and related feedback deleted.', 'Close', { duration: 5000 });
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

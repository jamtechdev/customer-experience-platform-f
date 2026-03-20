import { Component, inject, OnInit, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CSVService, CSVImport } from '../../../core/services/csv.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';

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
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private currentUserSub?: Subscription;
  private socket: Socket | null = null;
  private joinedCompanyId: number | null = null;

  loading = signal(false);
  imports = signal<CSVImport[]>([]);
  displayedColumns: string[] = ['filename', 'rowCount', 'status', 'errorMessage', 'createdAt'];

  ngOnInit(): void {
    this.loadImports();
    if (!isPlatformBrowser(this.platformId)) return;

    // Join the user's company room once auth is ready.
    this.currentUserSub = this.authService.currentUser$.subscribe((u) => {
      const companyId = u?.settings?.companyId ?? null;
      if (!companyId) return;
      if (this.joinedCompanyId === companyId) return;
      this.joinedCompanyId = companyId;
      this.connectSocketAndJoin(companyId);
    });
  }

  ngOnDestroy(): void {
    this.currentUserSub?.unsubscribe();
    this.socket?.disconnect();
    this.socket = null;
  }

  private getSocketUrl(): string {
    const apiBase = (environment.apiUrl || '').replace(/\/api\/?$/, '');
    return apiBase || 'http://localhost:5000';
  }

  private connectSocketAndJoin(companyId: number): void {
    // Avoid creating multiple connections.
    if (this.socket) return;

    const socketUrl = this.getSocketUrl();
    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    // Join the company room used by backend emits.
    this.socket.emit('join:company', String(companyId));

    this.socket.on('csv:importStatus', (payload: any) => {
      const importId = payload?.importId;
      const status = payload?.status;
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
    });
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

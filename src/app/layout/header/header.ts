import { Component, inject, output, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { Alert, AlertService, normalizeAlertsPayload } from '../../core/services/alert.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { LanguageSwitcher } from '../../core/components/language-switcher/language-switcher';
import { TranslationService } from '../../core/services/translation.service';
import { CXWebSocketService } from '../../core/services/cx-websocket.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    LanguageSwitcher
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private alertService = inject(AlertService);
  private analysisService = inject(AnalysisService);
  private websocket = inject(CXWebSocketService);
  private llmStatusTimer: ReturnType<typeof setInterval> | null = null;
  private alertRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private alertSub?: Subscription;
  
  toggleSidenav = output<void>();

  // Controls the small green/red dot near the notifications bell.
  alertIndicator = signal<'green' | 'red'>('green');
  alertCount = signal<number>(0);
  alerts = signal<Alert[]>([]);
  llmConnected = signal<boolean>(false);
  llmModel = signal<string>('gpt-4.1-mini');
  llmProvider = signal<string>('openai');

  readonly t = (key: string): string => this.translationService.translate(key);

  get currentUser() {
    return this.authService.currentUser();
  }

  get userName(): string {
    const user = this.currentUser;
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return this.t('header.userFallbackName');
  }

  get userInitials(): string {
    const user = this.currentUser;
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  get roleLabel(): string {
    const user = this.currentUser;
    if (!user?.role) return '';
    const key = `roles.${user.role}`;
    const translated = this.t(key);
    return translated === key ? String(user.role) : translated;
  }

  llmProviderLabel(): string {
    const provider = String(this.llmProvider() || 'openai').toLowerCase();
    return provider === 'ollama' ? 'Ollama' : 'OpenAI';
  }

  llmStatusLabel(): string {
    return this.translationService.translate(
      this.llmConnected() ? 'header.llmConnected' : 'header.llmDisconnected',
      { provider: this.llmProviderLabel() }
    );
  }

  ngOnInit(): void {
    this.refreshAlerts();
    this.alertSub = this.websocket.onAlertCreated().subscribe((event) => {
      const alert = event.alert as Alert | undefined;
      if (!alert?.id) return;
      const existing = this.alerts();
      if (existing.some((item) => Number(item.id) === Number(alert.id))) return;
      const next = [alert, ...existing].slice(0, 20);
      this.alerts.set(next);
      this.refreshNotificationBadge(next);
    });
    this.refreshLlmStatus();
    this.llmStatusTimer = setInterval(() => this.refreshLlmStatus(), 30000);
    this.alertRefreshTimer = setInterval(() => this.refreshAlerts(), 60000);
  }

  ngOnDestroy(): void {
    if (this.llmStatusTimer) {
      clearInterval(this.llmStatusTimer);
      this.llmStatusTimer = null;
    }
    if (this.alertRefreshTimer) {
      clearInterval(this.alertRefreshTimer);
      this.alertRefreshTimer = null;
    }
    this.alertSub?.unsubscribe();
  }

  private refreshAlerts(): void {
    this.alertService.getAlerts(false).subscribe({
      next: (res) => {
        const { alerts } = normalizeAlertsPayload(res?.data as any);
        this.alerts.set(alerts);
        this.refreshNotificationBadge(alerts);
      },
      error: () => {
        // If alerts endpoint fails, keep indicator green.
        this.alerts.set([]);
        this.alertIndicator.set('green');
        this.alertCount.set(0);
      },
    });
  }

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  onLogout(): void {
    this.authService.logout();
  }

  onProfile(): void {
    this.router.navigate(['/app/profile']);
  }

  onNotifications(): void {
    this.markNotificationsSeen();
    this.router.navigate(['/app/alerts/alert-dashboard']);
  }

  onNotificationsMenuOpened(): void {
    this.refreshAlerts();
  }

  onClearNotifications(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.markNotificationsSeen();
  }

  private refreshNotificationBadge(alerts: Alert[] = this.alerts()): void {
    const seenIds = this.readSeenAlertIds();
    const unseenAlerts = alerts.filter((alert) => !seenIds.has(Number(alert.id)));
    this.alertCount.set(unseenAlerts.length);
    this.alertIndicator.set(unseenAlerts.length > 0 ? 'red' : 'green');
  }

  private markNotificationsSeen(alerts: Alert[] = this.alerts()): void {
    if (!alerts.length) {
      this.alertCount.set(0);
      this.alertIndicator.set('green');
      return;
    }

    const seenIds = this.readSeenAlertIds();
    alerts.forEach((alert) => {
      if (Number.isFinite(Number(alert.id))) {
        seenIds.add(Number(alert.id));
      }
    });
    this.writeSeenAlertIds(seenIds);
    alerts.forEach((alert) => {
      const id = Number(alert.id);
      if (!alert.acknowledged && Number.isFinite(id)) {
        this.alertService.acknowledgeAlert(id).subscribe({ error: () => undefined });
      }
    });
    this.alerts.set(alerts.map((alert) => ({ ...alert, acknowledged: true })));
    this.alertCount.set(0);
    this.alertIndicator.set('green');
  }

  private seenStorageKey(): string {
    const user = this.currentUser as { id?: number | string; email?: string } | null;
    const userKey = user?.id ?? user?.email ?? 'anonymous';
    return `sentimenter.seenAlertNotifications.${userKey}`;
  }

  private readSeenAlertIds(): Set<number> {
    if (typeof localStorage === 'undefined') return new Set<number>();
    try {
      const raw = localStorage.getItem(this.seenStorageKey());
      const ids = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids)) return new Set<number>();
      return new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)));
    } catch {
      return new Set<number>();
    }
  }

  private writeSeenAlertIds(ids: Set<number>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Keep storage bounded; alert IDs are enough to suppress old badge counts.
      const serialized = JSON.stringify([...ids].slice(-500));
      localStorage.setItem(this.seenStorageKey(), serialized);
    } catch {
      // Ignore storage failures; the notification count will still clear for this session.
    }
  }

  private refreshLlmStatus(): void {
    this.analysisService.getLlmStatus().subscribe({
      next: (res) => {
        const reachable = !!res?.data?.enabled && !!res?.data?.reachable;
        this.llmConnected.set(reachable);
        if (res?.data?.provider) {
          this.llmProvider.set(String(res.data.provider));
        }
        if (res?.data?.model) {
          this.llmModel.set(res.data.model);
        }
      },
      error: () => {
        this.llmConnected.set(false);
      },
    });
  }
}

import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter, Subscription } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { CXWebSocketService } from '../../core/services/cx-websocket.service';
import { TranslationService } from '../../core/services/translation.service';
import { ImportProcessingService } from '../../core/services/import-processing.service';
import { OllamaLoader } from '../../core/components/ollama-loader/ollama-loader';

@Component({
  selector: 'app-main-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    Sidebar,
    Header,
    Footer,
    OllamaLoader,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  private breakpointSub?: Subscription;
  private routerSub?: Subscription;
  private websocket = inject(CXWebSocketService);
  private translationService = inject(TranslationService);
  private importProcessing = inject(ImportProcessingService);
  private router = inject(Router);

  sidenavOpened = signal(true);
  isMobile = signal(false);
  isRTL = this.translationService.isRTL;
  private currentUrl = signal(this.router.url);

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  /** Full-screen loader while CSV / AI analysis runs — hidden on import workflow pages. */
  showImportAnalysisOverlay = computed(() => {
    if (!this.importProcessing.isActive()) return false;
    const url = this.currentUrl();
    return !url.includes('/data-sources/');
  });

  constructor() {
    // Always-on websocket connection for live status updates across the app.
    this.websocket.start();
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
    this.breakpointSub = this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet
    ]).subscribe(result => {
      this.isMobile.set(result.matches);
      if (result.matches) {
        this.sidenavOpened.set(false);
      } else {
        this.sidenavOpened.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  toggleSidenav(): void {
    this.sidenavOpened.update(value => !value);
  }

  closeSidenav(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }
}

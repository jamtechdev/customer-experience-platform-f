import { Component, inject, signal, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { CXWebSocketService } from '../../core/services/cx-websocket.service';
import { TranslationService } from '../../core/services/translation.service';
import { ImportLiveBanner } from '../../core/components/import-live-banner/import-live-banner';
import { AuthService } from '../../core/services/auth.service';
import { TwitterCxReportStore } from '../../core/services/twitter-cx-report.store';
import { resolveAppCompanyId } from '../../core/utils/company-scope';
import { filter, take } from 'rxjs/operators';

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
    ImportLiveBanner,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnDestroy, OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private breakpointSub?: Subscription;
  private websocket = inject(CXWebSocketService);
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private platformId = inject(PLATFORM_ID);

  sidenavOpened = signal(true);
  isMobile = signal(false);
  isRTL = this.translationService.isRTL;

  constructor() {
    // Always-on websocket connection for live status updates across the app.
    this.websocket.start();
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

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const warm = (): void => {
      const companyId = resolveAppCompanyId(this.authService.currentUser());
      this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe();
    };
    if (this.authService.currentUser()) {
      warm();
      return;
    }
    this.authService.currentUser$
      .pipe(filter((user) => !!user), take(1))
      .subscribe(() => warm());
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
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

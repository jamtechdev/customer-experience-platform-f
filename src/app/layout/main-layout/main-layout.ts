import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
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
import { TranslationService } from '../../core/services/translation.service';
import { ImportLiveBanner } from '../../core/components/import-live-banner/import-live-banner';
import { TwitterCxReportStore } from '../../core/services/twitter-cx-report.store';
import { AuthService } from '../../core/services/auth.service';
import { resolveAppCompanyId } from '../../core/utils/company-scope';

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
export class MainLayout implements OnInit, OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  private breakpointSub?: Subscription;
  private translationService = inject(TranslationService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private cxWarmSub?: Subscription;

  sidenavOpened = signal(true);
  isMobile = signal(false);
  isRTL = this.translationService.isRTL;

  constructor() {
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
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.cxWarmSub = this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe();
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    this.cxWarmSub?.unsubscribe();
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

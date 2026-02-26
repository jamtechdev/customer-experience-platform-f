import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

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
    Footer
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  private breakpointObserver = inject(BreakpointObserver);
  
  sidenavOpened = signal(true);
  isMobile = signal(false);

  constructor() {
    this.breakpointObserver.observe([
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

  toggleSidenav(): void {
    this.sidenavOpened.update(value => !value);
  }

  closeSidenav(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }
}

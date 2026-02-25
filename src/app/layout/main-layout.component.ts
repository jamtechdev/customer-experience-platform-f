import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService, TranslationService, MenuService, MenuStatsService } from '../core/services';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../shared/components/header/header.component';
import { MenuItem } from '../core/models';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Sidebar -->
      <app-sidebar
        [menuItems]="menuItems()"
        [user]="authService.currentUser()"
        [collapsed]="sidebarCollapsed()"
        (collapsedChange)="onCollapsedChange($event)"
        (onLogout)="handleLogout()"
      ></app-sidebar>

      <!-- Main Content Area -->
      <div class="main-area">
        <!-- Header -->
        <app-header
          [user]="authService.currentUser()"
          [breadcrumbs]="breadcrumbs()"
          [pageTitle]="pageTitle()"
          (toggleSidebar)="toggleSidebar()"
          (onLogout)="handleLogout()"
        ></app-header>

        <!-- Page Content -->
        <main class="content">
          <router-outlet></router-outlet>
        </main>

        <!-- Footer -->
        <footer class="footer">
          <div class="footer-content">
            <span>&copy; {{ currentYear }} Albaraka Türk - CX Platform</span>
            <span class="footer-links">
              <a href="#">{{t()('privacyPolicy')}}</a>
              <a href="#">{{t()('termsOfUse')}}</a>
              <a href="#">{{t()('help')}}</a>
            </span>
          </div>
        </footer>
      </div>

      <!-- Mobile Overlay -->
      @if (mobileMenuOpen()) {
        <div class="mobile-overlay" (click)="closeMobileMenu()"></div>
      }
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 260px;
      transition: margin-left 0.3s ease;
      min-width: 0;
    }

    .sidebar-collapsed .main-area {
      margin-left: 70px;
    }

    .content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .footer {
      padding: 16px 24px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .footer-links {
      display: flex;
      gap: 24px;
    }

    .footer-links a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .footer-links a:hover {
      color: var(--primary-color);
    }

    .mobile-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 90;
    }

    @media (max-width: 1024px) {
      .main-area {
        margin-left: 0;
      }

      .sidebar-collapsed .main-area {
        margin-left: 0;
      }

      .mobile-overlay {
        display: block;
      }

      .content {
        padding: 16px;
      }

      .footer-content {
        flex-direction: column;
        gap: 12px;
        text-align: center;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  readonly authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private menuService = inject(MenuService);
  private menuStatsService = inject(MenuStatsService);

  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  pageTitle = signal('Dashboard');
  breadcrumbs = signal<Breadcrumb[]>([]);
  menuItems = signal<MenuItem[]>([]);
  
  currentYear = new Date().getFullYear();
  
  t = computed(() => (key: string) => this.translationService.translate(key));
  
  private subscriptions = new Subscription();

  constructor() {
    // Update menu items when language or user changes
    effect(() => {
      this.translationService.currentLang();
      this.authService.currentUser();
      this.menuStatsService.stats();
      this.updateMenuItems();
    });
  }

  private updateMenuItems(): void {
    this.menuItems.set(this.menuService.getMenuItems());
  }

  ngOnInit(): void {
    // Load menu stats for badges
    this.menuStatsService.loadStats();
    
    // Initialize menu items
    this.updateMenuItems();
    
    // Update menu items when stats change (only in browser)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.menuStatsService.loadStats();
        this.updateMenuItems();
      }, 60000); // Refresh every minute
    }

    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter(route => route.outlet === 'primary')
      ).subscribe(route => {
        const data = route.snapshot.data;
        this.pageTitle.set(data['title'] || 'Dashboard');
        this.buildBreadcrumbs(this.activatedRoute.root);
      })
    );

    // Initial breadcrumb build
    this.buildBreadcrumbs(this.activatedRoute.root);

    // Check screen size for sidebar state
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.removeEventListener('resize', this.checkScreenSize.bind(this));
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 1024) {
      this.mobileMenuOpen.set(!this.mobileMenuOpen());
    } else {
      this.sidebarCollapsed.set(!this.sidebarCollapsed());
    }
  }

  onCollapsedChange(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private checkScreenSize(): void {
    if (window.innerWidth <= 1024) {
      this.sidebarCollapsed.set(true);
    }
  }

  private buildBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: Breadcrumb[] = []): void {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      this.breadcrumbs.set(breadcrumbs);
      return;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const label = child.snapshot.data['breadcrumb'];
      if (label) {
        breadcrumbs.push({ label, url });
      }

      this.buildBreadcrumbs(child, url, breadcrumbs);
    }
  }
}

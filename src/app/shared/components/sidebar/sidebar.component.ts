import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MenuItem, User, Notification } from '../../../core/models';
import { TranslationService, BrandingService } from '../../../core/services';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed">
      <div class="sidebar-header">
        <a [routerLink]="'/app/dashboard'" class="logo" [title]="brandingService.getCompanyName()">
          @if (!isCollapsed) {
            <img [src]="brandingService.getLogoUrl(false)" [alt]="brandingService.getCompanyName()" class="logo-full" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="logo-fallback" style="display: none;">
              <span class="logo-initials">{{getLogoInitials()}}</span>
            </div>
            <span class="logo-text">{{brandingService.getCompanyName()}}</span>
          } @else {
            <img [src]="brandingService.getLogoUrl(true)" [alt]="brandingService.getCompanyName()" class="logo-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="logo-fallback-icon" style="display: none;">
              <span class="logo-initials-small">{{getLogoInitials()}}</span>
            </div>
          }
        </a>
        <button class="toggle-btn" (click)="toggle()" [attr.aria-label]="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <i class="icon" [class.icon-chevron-left]="!isCollapsed" [class.icon-chevron-right]="isCollapsed"></i>
        </button>
      </div>

      <nav class="sidebar-nav">
        <ul class="nav-list">
          @for (item of menuItems; track item.id) {
            <li class="nav-item" [class.has-children]="item.children?.length">
              @if (item.children?.length) {
                <a class="nav-link" (click)="toggleSubmenu(item)" [class.active]="item.isExpanded || isChildActive(item)" [class.has-active-child]="isChildActive(item)">
                  <div class="nav-icon-wrapper">
                    <i class="icon icon-{{item.icon}}"></i>
                  </div>
                  @if (!isCollapsed) {
                    <span class="nav-text">{{item.label}}</span>
                    <i class="icon icon-chevron-down submenu-arrow" [class.rotated]="item.isExpanded"></i>
                  }
                  @if (item.badge && typeof item.badge === 'number' && item.badge > 0) {
                    <span class="badge">{{item.badge > 99 ? '99+' : item.badge}}</span>
                  }
                </a>
                @if (item.isExpanded && !isCollapsed) {
                  <ul class="submenu">
                    @for (child of item.children; track child.id) {
                      <li class="submenu-item">
                        <a [routerLink]="child.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}" class="submenu-link">
                          <div class="submenu-indicator"></div>
                          <i class="icon icon-{{child.icon}}"></i>
                          <span>{{child.label}}</span>
                          @if (child.badge && typeof child.badge === 'number' && child.badge > 0) {
                            <span class="badge badge-small">{{child.badge > 99 ? '99+' : child.badge}}</span>
                          }
                        </a>
                      </li>
                    }
                  </ul>
                }
              } @else {
                <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact: item.route === '/app/dashboard'}" class="nav-link">
                  <div class="nav-icon-wrapper">
                    <i class="icon icon-{{item.icon}}"></i>
                  </div>
                  @if (!isCollapsed) {
                    <span class="nav-text">{{item.label}}</span>
                  }
                  @if (item.badge && typeof item.badge === 'number' && item.badge > 0) {
                    <span class="badge">{{item.badge > 99 ? '99+' : item.badge}}</span>
                  }
                </a>
              }
            </li>
          }
        </ul>
      </nav>

      <div class="sidebar-footer">
        @if (!isCollapsed) {
          <div class="user-info">
            <div class="avatar">
              @if (user?.avatar) {
                <img [src]="user!.avatar" [alt]="user!.firstName">
              } @else {
                <span>{{user?.firstName?.[0]}}{{user?.lastName?.[0]}}</span>
              }
            </div>
            <div class="user-details">
              <span class="user-name">{{user?.firstName}} {{user?.lastName}}</span>
              <span class="user-role">{{getRoleLabel(user?.role)}}</span>
            </div>
          </div>
        }
        <button class="logout-btn" (click)="onLogout.emit()" [title]="t()('logout')">
          <i class="icon icon-logout"></i>
          @if (!isCollapsed) {
            <span>{{t()('logout')}}</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      height: 100vh;
      background: linear-gradient(180deg, #1a1f2e 0%, #151a27 100%);
      color: var(--sidebar-text, #a0aec0);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

      &.collapsed {
        width: 72px;
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.9;
      }
    }

    .logo-full {
      height: 36px;
      width: auto;
      object-fit: contain;
    }

    .logo-icon {
      height: 36px;
      width: 36px;
      object-fit: contain;
    }

    .logo-fallback, .logo-fallback-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-fallback-icon {
      width: 36px;
      height: 36px;
    }

    .logo-initials {
      color: #fff;
      font-weight: 700;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
    }

    .logo-initials-small {
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }

    .toggle-btn {
      background: transparent;
      border: none;
      color: var(--sidebar-text);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.75rem 0;
      
      /* Custom scrollbar */
      &::-webkit-scrollbar {
        width: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .nav-item {
      margin-bottom: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: var(--sidebar-text, #a0aec0);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border-radius: 0.5rem;
      margin: 0 0.5rem;

      .nav-icon-wrapper {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        transform: translateX(2px);
      }

      &.active {
        background: rgba(59, 130, 246, 0.15);
        color: #fff;
        font-weight: 500;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: var(--primary-color, #3b82f6);
          border-radius: 0 2px 2px 0;
        }

        .nav-icon-wrapper {
          color: var(--primary-color, #3b82f6);
        }
      }

      &.has-active-child {
        color: #fff;
      }
    }

    .nav-text {
      flex: 1;
    }

    .submenu-arrow {
      font-size: 0.75rem;
      transition: transform 0.2s;

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .badge {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #fff;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      min-width: 1.25rem;
      text-align: center;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
      animation: pulse 2s infinite;

      &.badge-small {
        font-size: 0.5rem;
        padding: 0.0625rem 0.375rem;
        min-width: 1rem;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }

    .submenu {
      list-style: none;
      padding: 0.25rem 0 0.5rem;
      margin: 0;
      padding-left: 2.5rem;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .submenu-item {
      margin-bottom: 0.125rem;
    }

    .submenu-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      color: var(--sidebar-text, #a0aec0);
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      border-radius: 0.375rem;
      margin: 0 0.5rem;
      position: relative;

      .submenu-indicator {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--sidebar-text, #a0aec0);
        opacity: 0.5;
        transition: all 0.2s;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;

        .submenu-indicator {
          background: #fff;
          opacity: 1;
        }
      }

      &.active {
        background: rgba(59, 130, 246, 0.1);
        color: #fff;
        font-weight: 500;

        .submenu-indicator {
          background: var(--primary-color, #3b82f6);
          opacity: 1;
          width: 6px;
          height: 6px;
        }
      }
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 600;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 500;
      color: #fff;
    }

    .user-role {
      font-size: 0.75rem;
      text-transform: capitalize;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;

      &:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fff;
        border-color: rgba(239, 68, 68, 0.4);
        transform: translateY(-1px);
      }
    }

    .icon {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class SidebarComponent {
  private translationService = inject(TranslationService);
  readonly brandingService = inject(BrandingService);
  private router = inject(Router);
  
  @Input() menuItems: MenuItem[] = [];
  @Input() user?: User | null;
  @Input() set collapsed(value: boolean) {
    this._collapsed.set(value);
  }
  @Output() onLogout = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  private _collapsed = signal(false);
  currentRoute = signal<string>('');
  
  t = computed(() => (key: string) => this.translationService.translate(key));
  
  // Expose as a computed for template usage
  readonly collapsedState = this._collapsed.asReadonly();
  
  // Getter for template compatibility
  get isCollapsed(): boolean {
    return this._collapsed();
  }

  constructor() {
    // Track current route for active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute.set(event.urlAfterRedirects);
    });
    
    // Initialize current route
    if (typeof window !== 'undefined') {
      this.currentRoute.set(this.router.url);
    }
  }

  toggle(): void {
    this._collapsed.update(v => !v);
    this.collapsedChange.emit(this._collapsed());
  }

  toggleSubmenu(item: MenuItem): void {
    item.isExpanded = !item.isExpanded;
  }

  isChildActive(item: MenuItem): boolean {
    if (!item.children) return false;
    const currentUrl = this.currentRoute();
    return item.children.some(child => child.route && currentUrl.startsWith(child.route));
  }

  getLogoInitials(): string {
    const companyName = this.brandingService.getCompanyName();
    const words = companyName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  }

  getRoleLabel(role?: string): string {
    if (!role) return '';
    const roleMap: Record<string, string> = {
      'ADMIN': 'Admin',
      'MANAGER': 'Manager',
      'ANALYST': 'Analyst',
      'VIEWER': 'Viewer',
      'MAKER': 'Maker',
      'CHECKER': 'Checker'
    };
    return roleMap[role] || role;
  }
}

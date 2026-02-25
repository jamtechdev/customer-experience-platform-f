import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';

export interface BrandingConfig {
  logoUrl?: string;
  logoIconUrl?: string;
  companyName?: string;
  primaryColor?: string;
  sidebarBg?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private authService = inject(AuthService);

  // Default branding
  private defaultBranding: BrandingConfig = {
    logoUrl: '/assets/images/logo.svg',
    logoIconUrl: '/assets/images/logo-icon.svg',
    companyName: 'Sentimenter CX',
    primaryColor: '#3b82f6',
    sidebarBg: '#1a1f2e'
  };

  // Get branding from user settings or company settings
  readonly branding = computed<BrandingConfig>(() => {
    const user = this.authService.currentUser();
    
    // Try to get from user settings
    if (user?.settings?.branding) {
      return {
        ...this.defaultBranding,
        ...user.settings.branding
      };
    }

    // Try to get from company settings (if available)
    // This would come from a company service in a real app
    
    return this.defaultBranding;
  });

  getLogoUrl(collapsed: boolean): string {
    const branding = this.branding();
    return collapsed ? (branding.logoIconUrl || this.defaultBranding.logoIconUrl!) : (branding.logoUrl || this.defaultBranding.logoUrl!);
  }

  getCompanyName(): string {
    return this.branding().companyName || this.defaultBranding.companyName!;
  }
}

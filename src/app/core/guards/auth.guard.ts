import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn, CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const hasToken = authService.getToken() !== null;

  if (hasToken) {
    return true;
  }

  router.navigate(['/login'], { replaceUrl: true });
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const hasToken = authService.getToken() !== null;

  // Guest routes: allow only if NOT logged in
  if (!hasToken) {
    return true;
  }

  // If token exists, always send user to main dashboard
  router.navigate(['/app/dashboard'], { replaceUrl: true });
  return false;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as UserRole[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (authService.hasRole(requiredRoles)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'] as string;
  
  if (!requiredPermission) {
    return true;
  }

  if (authService.hasPermission(requiredPermission)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const checkerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  
  // Only admin can access checker routes (or we can remove this guard if not needed)
  if (user && user.role === UserRole.ADMIN) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

/** Allows Admin and CX Manager (analyst). Redirects Executive (viewer) to dashboard. Client §13. */
export const analystOrAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/app/dashboard'], { replaceUrl: true });
    return false;
  }
  if (user.role === UserRole.ADMIN || user.role === UserRole.ANALYST) {
    return true;
  }
  router.navigate(['/app/dashboard'], { replaceUrl: true });
  return false;
};

/** Executive Dashboard: only Executive (viewer) role. Others redirect to main dashboard. */
export const executiveOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/app/dashboard'], { replaceUrl: true });
    return false;
  }
  if (user.role === UserRole.VIEWER) {
    return true;
  }
  router.navigate(['/app/dashboard'], { replaceUrl: true });
  return false;
};

/** Redirect Executive (viewer) to executive-dashboard when they try to open main dashboard. */
export const dashboardRedirectGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (user?.role === UserRole.VIEWER) {
    router.navigate(['/app/executive-dashboard'], { replaceUrl: true });
    return false;
  }
  return true;
};

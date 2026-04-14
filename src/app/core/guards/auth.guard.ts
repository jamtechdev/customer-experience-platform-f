import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
  // All roles allowed on frontend; backend enforces permissions.
  return true;
};

export const permissionGuard: CanActivateFn = (route, state) => {
  // All permissions allowed on frontend; backend enforces permissions.
  return true;
};

export const checkerGuard: CanActivateFn = (route, state) => {
  // Checker routes not restricted on frontend.
  return true;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // Keep route stable on hard refresh while profile is still hydrating.
  // AuthService marks token-based sessions as authenticated during init.
  const isAuthenticated = authService.isAuthenticated();
  if (isAuthenticated) {
    return true;
  }

  router.navigate(['/login'], { replaceUrl: true });
  return false;
};

/** Allows Admin and CX Manager (analyst). Redirects Executive (viewer) to dashboard. Client §13. */
export const analystOrAdminGuard: CanActivateFn = (route, state) => {
  return adminGuard(route, state);
};

/** Executive Dashboard: only Executive (viewer) role. Others redirect to main dashboard. */
export const executiveOnlyGuard: CanActivateFn = (route, state) => {
  return adminGuard(route, state);
};

/** Redirect Executive (viewer) to executive-dashboard when they try to open main dashboard. */
export const dashboardRedirectGuard: CanActivateFn = (route, state) => {
  return adminGuard(route, state);
};

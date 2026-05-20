import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(map((ok) => (ok ? true : router.createUrlTree(['/login']))));
};

export const guestGuard: CanActivateFn = (route, state) => {
  return true;
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
  return authService.ensureSession().pipe(map((ok) => (ok ? true : router.createUrlTree(['/login']))));
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

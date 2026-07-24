import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthSessionBootstrap } from '../services/auth-session-bootstrap.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const bootstrap = inject(AuthSessionBootstrap);

  return authService.ensureSession().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/login']);
      bootstrap.startIfNeeded();
      return true;
    })
  );
};

/** Redirect authenticated users away from login/forgot/reset pages. */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only use in-memory session here. Do not call /auth/profile on the login page —
  // a logged-out visit would always 401 and confuse the console / UX.
  if (authService.currentUser()) {
    return router.createUrlTree(['/app/dashboard']);
  }
  return true;
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data?.['roles'] as UserRole[] | undefined) ?? [];

  return authService.ensureSession().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/login']);
      if (!allowed.length) return true;
      return authService.hasRole(allowed)
        ? true
        : router.createUrlTree(['/app/reports/dashboard-reports']);
    })
  );
};

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const required = (route.data?.['permissions'] as string[] | undefined) ?? [];

  return authService.ensureSession().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/login']);
      if (!required.length) return true;
      const allowed = required.every((p) => authService.hasPermission(p));
      return allowed ? true : router.createUrlTree(['/app/reports/dashboard-reports']);
    })
  );
};

export const checkerGuard: CanActivateFn = (route, state) => {
  return authGuard(route, state);
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const bootstrap = inject(AuthSessionBootstrap);
  return authService.ensureSession().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/login']);
      bootstrap.startIfNeeded();
      return authService.currentUser()?.role === UserRole.ADMIN
        ? true
        : router.createUrlTree(['/login'], { queryParams: { reason: 'admin-required' } });
    })
  );
};

export const analystOrAdminGuard: CanActivateFn = (route, state) => {
  return authGuard(route, state);
};

export const executiveOnlyGuard: CanActivateFn = (route, state) => {
  return authGuard(route, state);
};

export const dashboardRedirectGuard: CanActivateFn = (route, state) => {
  return authGuard(route, state);
};

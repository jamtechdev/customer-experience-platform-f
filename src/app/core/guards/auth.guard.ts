import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

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
  return authService.ensureSession().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/login']);
      return authService.currentUser()?.role === UserRole.ADMIN
        ? true
        : router.createUrlTree(['/app/reports/dashboard-reports']);
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

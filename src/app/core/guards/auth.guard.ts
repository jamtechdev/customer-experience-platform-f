import { inject } from '@angular/core';
import { Router, CanActivateFn, CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Only redirect to login if trying to access protected routes
  if (state.url.startsWith('/app')) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  } else {
    router.navigate(['/']);
  }
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/app/dashboard']);
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
  
  if (user && (user.role === UserRole.CHECKER || user.role === UserRole.ADMIN)) {
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

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';
import { map, take, filter, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization to complete (with timeout to prevent hanging)
  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    timeout(5000), // 5 second timeout
    catchError(() => {
      // If timeout, allow access
      return of(true);
    }),
    map(() => {
      const hasToken = authService.getToken() !== null;
      const isAuthenticated = authService.isAuthenticated();
      const currentUser = authService.currentUser();

      // If no token, allow access to admin login
      if (!hasToken) {
        return true;
      }

      // If token exists but user not fully loaded yet, allow access temporarily
      if (hasToken && !isAuthenticated) {
        return true;
      }

      // User is fully authenticated
      if (isAuthenticated && currentUser) {
        // If admin, redirect to admin dashboard
        if (currentUser.role === UserRole.ADMIN) {
          router.navigate(['/admin/dashboard'], { replaceUrl: true });
          return false;
        } else {
          // Not admin, redirect to user dashboard
          router.navigate(['/app/dashboard'], { replaceUrl: true });
          return false;
        }
      }

      return true;
    })
  );
};

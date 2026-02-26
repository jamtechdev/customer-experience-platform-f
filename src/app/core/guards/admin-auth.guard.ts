import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';
import { map, take, filter, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization to complete (with timeout to prevent hanging)
  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    timeout(5000), // 5 second timeout
    catchError(() => {
      // If timeout, deny access
      return of(false);
    }),
    map(() => {
      const hasToken = authService.getToken() !== null;
      const isAuthenticated = authService.isAuthenticated();
      const currentUser = authService.currentUser();

      // Check if user is admin
      if (isAuthenticated && hasToken && currentUser) {
        const isAdmin = currentUser.role === UserRole.ADMIN;
        
        if (isAdmin) {
          return true;
        } else {
          // Not admin, redirect to user dashboard
          router.navigate(['/app/dashboard'], { replaceUrl: true });
          return false;
        }
      }

      // Not authenticated, redirect to admin login
      router.navigate(['/admin/login'], { replaceUrl: true });
      return false;
    })
  );
};

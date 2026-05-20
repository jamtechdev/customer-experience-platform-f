import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const adminAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((ok) => {
      const currentUser = authService.currentUser();
      if (!ok) return router.createUrlTree(['/manage/login']);
      if (currentUser && currentUser.role !== UserRole.ADMIN) return router.createUrlTree(['/app/dashboard']);
      return true;
    })
  );
};

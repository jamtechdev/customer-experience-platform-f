import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const adminAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasToken = authService.getToken() !== null;
  const currentUser = authService.currentUser();

  if (!hasToken) {
    router.navigate(['/manage/login'], { replaceUrl: true });
    return false;
  }

  if (currentUser && currentUser.role !== UserRole.ADMIN) {
    router.navigate(['/app/dashboard'], { replaceUrl: true });
    return false;
  }

  return true;
};

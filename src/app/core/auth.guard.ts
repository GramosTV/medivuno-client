import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRoles = route.data?.['roles'] as Array<string>;
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = authService.getCurrentUserRole();
      if (userRole && requiredRoles.includes(userRole)) {
        return true; // User is authenticated and has the required role
      }
      // User does not have the required role, redirect to login or an unauthorized page
      router.navigate(['/auth/login']); // Or a specific unauthorized page
      return false;
    }
    return true; // Route does not require specific roles, just authentication
  }

  // Not authenticated, redirect to login page
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

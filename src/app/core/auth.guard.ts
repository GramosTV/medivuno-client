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

  console.log(`[AuthGuard] Checking route: ${state.url}`);
  console.log(`[AuthGuard] isAuthenticated: ${authService.isAuthenticated()}`);
  console.log(`[AuthGuard] currentRole: ${authService.getCurrentUserRole()}`);
  console.log(`[AuthGuard] requiredRoles:`, route.data?.['roles']);

  if (authService.isAuthenticated()) {
    const requiredRoles = route.data?.['roles'] as Array<string>;
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = authService.getCurrentUserRole();
      console.log(
        `[AuthGuard] User role: ${userRole}, Required roles:`,
        requiredRoles
      );

      if (userRole && requiredRoles.includes(userRole)) {
        console.log(
          `[AuthGuard] Access GRANTED: User has required role: ${userRole}`
        );
        return true; // User is authenticated and has the required role
      }

      console.log(
        `[AuthGuard] Access DENIED: User role ${userRole} not in required roles`
      );
      // User does not have the required role, redirect to login or an unauthorized page
      router.navigate(['/auth/login']); // Or a specific unauthorized page
      return false;
    }
    console.log(`[AuthGuard] Access GRANTED: No specific roles required`);
    return true; // Route does not require specific roles, just authentication
  }

  // Not authenticated, redirect to login page
  console.log(`[AuthGuard] Access DENIED: User is not authenticated`);
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

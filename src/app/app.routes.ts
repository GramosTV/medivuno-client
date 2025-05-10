import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'auth', 
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) 
  },
  { 
    path: 'patient', 
    loadChildren: () => import('./patient/patient.module').then(m => m.PatientModule) 
    // Add a guard here later: canActivate: [AuthGuard], data: { roles: ['patient'] }
  },
  // Add other top-level routes here, e.g., for patient and doctor dashboards
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/auth/login' } // Wildcard route for 404s
];

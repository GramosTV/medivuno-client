import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'auth', 
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) 
  },
  // Add other top-level routes here, e.g., for patient and doctor dashboards
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/auth/login' } // Wildcard route for 404s
];

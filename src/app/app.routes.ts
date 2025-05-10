import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { ComingSoonComponent } from './shared/coming-soon/coming-soon.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'patient',
    loadChildren: () =>
      import('./patient/patient.module').then((m) => m.PatientModule),
    canActivate: [authGuard],
    data: { roles: ['patient'] },
  },
  {
    path: 'doctor',
    loadChildren: () =>
      import('./doctor/doctor.module').then((m) => m.DoctorModule),
    canActivate: [authGuard],
    data: { roles: ['doctor'] },
  },
  { path: 'coming-soon', component: ComingSoonComponent },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' },
];

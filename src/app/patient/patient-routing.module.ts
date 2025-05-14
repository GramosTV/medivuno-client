import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { MedicalRecordsComponent } from './medical-records/medical-records.component';
// import { MessagesComponent } from './messages/messages.component'; // Using HTTP version instead
import { MessagesComponent } from './messages/messages-http.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'appointments',
    loadComponent: () =>
      import('./appointments/appointments.component').then(
        (c) => c.AppointmentsComponent
      ),
  },
  { path: 'book-appointment', component: BookAppointmentComponent },
  { path: 'medical-records', component: MedicalRecordsComponent },
  { path: 'messages', component: MessagesComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientRoutingModule {}

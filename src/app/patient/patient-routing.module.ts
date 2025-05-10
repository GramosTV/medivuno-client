import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AppointmentsComponent } from './appointments/appointments.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { MedicalRecordsComponent } from './medical-records/medical-records.component';
import { MessagesComponent } from './messages/messages.component'; // Added import

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'appointments', component: AppointmentsComponent },
  { path: 'book-appointment', component: BookAppointmentComponent },
  { path: 'medical-records', component: MedicalRecordsComponent },
  { path: 'messages', component: MessagesComponent }, // Added route
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default to patient dashboard
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientRoutingModule {}

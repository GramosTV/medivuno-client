import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AppointmentsComponent } from './appointments/appointments.component';
import { ScheduleComponent } from './schedule/schedule.component';
// import { MessagesComponent } from './messages/messages.component'; // Using HTTP version instead
import { MessagesComponent } from './messages/messages-http.component';
import { DoctorMedicalRecordsComponent } from './doctor-medical-records/doctor-medical-records.component';
import { CreateMedicalRecordComponent } from './create-medical-record/create-medical-record.component';
import { PatientsListComponent } from './patients-list/patients-list.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'appointments', component: AppointmentsComponent },
  { path: 'schedule', component: ScheduleComponent },
  { path: 'messages', component: MessagesComponent },
  { path: 'patients', component: PatientsListComponent },
  {
    path: 'patients/:patientId/records',
    component: DoctorMedicalRecordsComponent,
  },
  {
    path: 'patients/:patientId/records/create',
    component: CreateMedicalRecordComponent,
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default to doctor dashboard
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorRoutingModule {}

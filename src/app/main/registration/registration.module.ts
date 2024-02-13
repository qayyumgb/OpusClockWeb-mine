import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RegistrationRoutingModule } from './registration-routing.module';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TasksComponent } from './time-registration/sub-components/tasks/tasks.component';
import { TimeOffComponent } from './time-registration/sub-components/time-off/time-off.component';
import { CalendarComponent } from './time-registration/sub-components/calendar/calendar.component';


@NgModule({
  declarations: [
    TimeRegistrationComponent,
    TasksComponent,
    TimeOffComponent,
    CalendarComponent
  ],
  imports: [
    CommonModule,
    RegistrationRoutingModule,
    SharedModule
  ]
})
export class RegistrationModule { }

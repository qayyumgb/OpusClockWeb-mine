import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { SharedModule } from '../shared/shared.module';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';
import { TaskComponent } from './time-registration/task/task.component';
import { InputTimeComponent } from '../common/components/input-time/input-time.component';


@NgModule({
  declarations: [
    TimeRegistrationComponent,
    TaskComponent,
    InputTimeComponent
  ],
  imports: [
    CommonModule,
    MainRoutingModule,
    SharedModule
  ]
})
export class MainModule { }

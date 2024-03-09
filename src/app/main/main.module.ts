import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { SharedModule } from '../shared/shared.module';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';
import { TaskComponent } from './time-registration/task/task.component';
import { InputTimeComponent } from '../common/components/input-time/input-time.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { NavbarComponent } from '../common/navbar/navbar.component';
import {AuthService} from '../common/services/auth.service';


@NgModule({
  declarations: [
    TimeRegistrationComponent,
    TaskComponent,
    InputTimeComponent,
    MainLayoutComponent,
    NavbarComponent
  ],
  imports: [
    CommonModule,
    MainRoutingModule,
    SharedModule,
  ],
  providers: [
    AuthService,
  ],
})
export class MainModule { }

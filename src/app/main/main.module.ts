import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { SharedModule } from '../shared/shared.module';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';
import { TaskComponent } from './time-registration/task/task.component';
import { InputTimeComponent } from '../common/components/input-time/input-time.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { NavbarComponent } from '../common/navbar/navbar.component';
<<<<<<< HEAD
import {AuthService} from '../common/services/auth.service';
=======
>>>>>>> mukhtar_branch


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
    SharedModule
<<<<<<< HEAD
  ],
  providers: [
    AuthService,
  ],
=======
  ]
>>>>>>> mukhtar_branch
})
export class MainModule { }

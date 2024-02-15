import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';

const routes: Routes = [
  {
    path:'',
    component: TimeRegistrationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }

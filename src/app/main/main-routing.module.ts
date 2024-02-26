<<<<<<< HEAD
import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TimeRegistrationComponent} from './time-registration/time-registration.component';
import {MainLayoutComponent} from './main-layout/main-layout.component';
import {AuthGuard} from '../common/guards/auth.guard';

const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'time-registration'},
=======
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimeRegistrationComponent } from './time-registration/time-registration.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'time-registration' },
>>>>>>> mukhtar_branch
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
<<<<<<< HEAD
        path: 'time-registration',
        component: TimeRegistrationComponent,
        canActivate: [AuthGuard]
      }
    ]

=======
        path:'time-registration',
      component: TimeRegistrationComponent
      },
    ]
    
>>>>>>> mukhtar_branch
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
<<<<<<< HEAD
export class MainRoutingModule {
}
=======
export class MainRoutingModule { }
>>>>>>> mukhtar_branch

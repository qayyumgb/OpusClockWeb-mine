import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TimeRegistrationComponent} from './time-registration/time-registration.component';
import {MainLayoutComponent} from './main-layout/main-layout.component';
import {AuthGuard} from '../common/guards/auth.guard';

const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'time-registration'},
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'time-registration',
        component: TimeRegistrationComponent,
        canActivate: [AuthGuard]
      }
    ]

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule {
}

import { Component } from '@angular/core';
import { workerOptions } from 'src/app/common/helpers/data';

@Component({
  selector: 'app-time-registration',
  templateUrl: './time-registration.component.html',
  styleUrls: ['./time-registration.component.scss']
})
export class TimeRegistrationComponent {
  workerSelected = workerOptions[0];
  workerOptions = workerOptions;
  pauseCount: number = 0;
  lastSelectedTask: number = 0;
  saveDisabled: boolean = true;

}

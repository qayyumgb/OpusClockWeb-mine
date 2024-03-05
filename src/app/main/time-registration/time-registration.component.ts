import { Component } from '@angular/core';

@Component({
  selector: 'app-time-registration',
  templateUrl: './time-registration.component.html',
  styleUrls: ['./time-registration.component.scss']
})
export class TimeRegistrationComponent {
  pauseCount: number = 0;
  lastSelectedTask: number = 0;
  saveDisabled: boolean = true;

}

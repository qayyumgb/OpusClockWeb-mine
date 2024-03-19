import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import moment from 'moment';

@Component({
  selector: 'app-time-off',
  templateUrl: './time-off.component.html',
  styleUrls: ['./time-off.component.scss']
})
export class TimeOffComponent {

  dateToday: Date = new Date();
  toggleAccordion: string = 'DAY';
  timeOfftypeSelected: any;
  timeOffNotes: any;

  timeOffOptions: any[] = [
    { id: '0', name: 'Holiday leave' },
    { id: '1', name: 'Parental leave' },
    { id: '2', name: 'Maternity leave' },
    { id: '3', name: 'Exceptional leave' },
  ];
  workingDays: number = 12;

  day = new FormGroup({
    date: new FormControl<Date | null>(new Date()),
    startTime: new FormControl<string | null>('07:00'),
    endTime: new FormControl<string | null>('16:00'),
  });

  period = new FormGroup({
    startDate: new FormControl<Date | null>(new Date()),
    endDate: new FormControl<Date | null>(new Date()),
  });

  ngOnInit() {
    this.period.controls.startDate.valueChanges.subscribe((value) => {
      this.setWorkingDays(
        this.period.controls.startDate.value,
        this.period.controls.endDate.value
      );
    });

    this.period.controls.endDate.valueChanges.subscribe((value) => {
      this.setWorkingDays(
        this.period.controls.startDate.value,
        this.period.controls.endDate.value
      );
    });
  }

  onSelectTimeoffType(){
    console.log("time off type = ",this.timeOfftypeSelected.name);
  }

  setWorkingDays(start: Date | null, end: Date | null) {
    // const daysDiff = end?.diff(start, 'days');
    // this.workingDays = daysDiff ? daysDiff + 1 : 1;
  }


  presenceDayLengthUpdated(updatedTime: string, fieldName: string) {

  }

  dateIsForPastNSaved() {
    return false;
  }

  futureFilter = (d: Date | null): boolean => {
    return d ? d <= this.dateToday : true;
  };

  onSaveTimeOffDay(){
    console.log("selected day =",this.day.value.date);
    console.log("Day start time =",this.day.value.startTime);
    console.log("Day end time =",this.day.value.endTime);
  }
  onCancelTimeOffDay(){

  }
  onSaveTimeOffPeriod(){
    console.log("Period start date =",this.period.value.startDate);
    console.log("Period end date =",this.period.value.endDate);
  }
  onCancelTimeOffPeriod(){

  }

  onInputChange(){
    console.log("time off notes = ",this.timeOffNotes)
  }
}

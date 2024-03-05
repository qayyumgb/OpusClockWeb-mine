import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDialog} from '@angular/material/dialog';
import * as moment from 'moment';
import {breakScheme} from 'src/app/common/helpers/data';
import {TIME_FORMAT, time, timeAddDate, timeAsSeconds, dateIsToday} from 'src/app/common/helpers/time';
import {BreakScheme, TaskOption,LocationOption, TaskRegn} from 'src/app/common/interfaces/time-interface';
import {Subscription} from 'rxjs';
import {AuthService} from '../../../common/services/auth.service';
import {FirestoreService} from '../../../common/services/firestore.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import momentDurationFormatSetup from "moment-duration-format";

momentDurationFormatSetup(moment);

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {
  dateToday: Date = new Date();

  breakSchemeSelected: BreakScheme;

  taskRegns: TaskRegn[] = [];
  workerLocation:LocationOption[] = [
    {'id':'00-111-111','name':'new york, united state'},
    {'id':'00-111-222','name':'albama, united state'},
    {'id':'00-111-333','name':'Amsterdam, Netherland'}
  ]
  presenceForm = new FormGroup({
    date: new FormControl<Date | null>(new Date()),
    location: new FormControl<string | null>(''),
    startTime: new FormControl<string | null>('07:00'),
    endTime: new FormControl<string | null>('16:00'),
  });

  dateHint: string;
  presenceStartTimeBefore = '07:00';
  presenceEndTimeBefore = '16:01';
  presenceTotalTime = '00:00';
  totalTimeBreaksSpecified = '00:00';
  totalTimeTasksSpecified = '00:00';
  totalTimeSpecified = '00:00';
  totalTimeRemaining = '00:00';
  totalTimeBreak = '00:00';

  pauseCount: number = 0;
  lastSelectedTaskRegn: number = 0;
  saveDisabled: boolean = true;
  loggedInUserFromAuthServiceSubscription: Subscription;
  loggedInUserDocData: any;
  presenceDocForSelectedDate: any;
  allTasksSubscription: Subscription;
  allTasksList: any[];
  presenceDocSubscription: Subscription;
  taskRegnsSubscription: Subscription;
  private creatingPresenceDoc = false;
  updateInProgress = false;
  tasksStateChangesSubscription: Subscription;
  dateSelected: Date | null;
  filteredLocationOptions: LocationOption[]=[];
  constructor(
    public dialog: MatDialog,
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar
  ) {
    this.breakSchemeSelector();
    this.presenceTotalTime = time(this.presenceForm.controls['endTime'].value)
      .subtract(this.presenceForm.controls['startTime'].value)
      .format(TIME_FORMAT);
    this.updateTaskRegnsFromTo(false);
    this._locale = 'nl';
    this._adapter.setLocale(this._locale);
    this.loggedInUserFromAuthServiceSubscription = this.authService.loggedInUserFromAuthService$.subscribe(
      (userDocData: any) => {
        this.loggedInUserDocData = userDocData;
        this.loadTasks();
        this.dateSelected = this.dateToday;
        this.setDateHint();
        this.fetchPresenceNTaskRegns();
      });

      this.filteredLocationOptions = this.workerLocation.slice();
  }

  filterLocation(event:any): void {
    console.log('eventtt',event.target.value)
    const filterValue = event.target.value.toLowerCase();
    this.filteredLocationOptions = this.workerLocation.filter(o => o.name.toLowerCase().includes(filterValue));
  }
  firstLoadOfTaskRegns(taskRegns: any) {
    //console.log('No of tasks:' + taskRegns?.length);
    this.taskRegns = taskRegns.map((taskRegn: any) => {
      if (taskRegn.startTimestamp) {
        taskRegn.startTime = moment(taskRegn.startTimestamp.toDate()).format(TIME_FORMAT);
      }

      if (taskRegn.endTimestamp) {
        taskRegn.endTime = moment(taskRegn.endTimestamp.toDate()).format(TIME_FORMAT);
      }

      if (taskRegn.startTime && taskRegn.endTime) {
        //taskRegn.duration = `${moment.duration(taskRegn.durationTotal, 'seconds').get('hours')}:${moment.duration(taskRegn.durationTotal, 'seconds').get('minutes')}`;
        taskRegn.duration = moment.duration(taskRegn.durationTotal * 1000).format("hh:mm", {trim: false})
      }

      taskRegn.selectedOption = {
        id: taskRegn.taskId,
        name: taskRegn.taskName,
        type: taskRegn.taskType
      };
      taskRegn.name = taskRegn.taskName;
      return {
        ...taskRegn
      }
    });
  }

  loadTasks() {
    this.allTasksSubscription = this.firestoreService.getTasksForClockWeb(this.loggedInUserDocData.associatedWorkerClientId)
      .subscribe(tasks => {
        this.allTasksList = tasks;
      });
  }

  ngOnDestroy(): void {
    this.loggedInUserFromAuthServiceSubscription?.unsubscribe();
    this.presenceDocSubscription?.unsubscribe();
    this.allTasksSubscription?.unsubscribe();
    this.taskRegnsSubscription?.unsubscribe();
    this.tasksStateChangesSubscription?.unsubscribe();
  }
  ngOnInit() {
    this.presenceForm.controls.date.valueChanges.subscribe((dateSelected) => {
      this.dateSelected = dateSelected;
      this.presenceDocSubscription?.unsubscribe();
      this.taskRegnsSubscription?.unsubscribe();

      this.taskRegns = [];
      this.presenceDocForSelectedDate = null;

      this.setDateHint();
      if (dateSelected) {
        this.fetchPresenceNTaskRegns()
      }
    });

    this.presenceForm.controls.startTime.valueChanges.subscribe((value) => {
      this.recalculateTotalTime();
    });

    this.presenceForm.controls.endTime.valueChanges.subscribe((value) => {
      this.recalculateTotalTime();
    });

    //this.presenceForm.controls.date.setValue(new Date());
  }

  recalculateTotalTime() {
    this.presenceTotalTime = time(this.presenceForm.controls['endTime'].value)
      .subtract(this.presenceForm.controls['startTime'].value)
      .format(TIME_FORMAT);
  }

  ngAfterViewInit() {
  }

  setDateHint() {
    this.dateHint = moment(this.presenceForm.controls.date.value).format(
      'dddd [week] W'
    );
  }

  futureFilter = (d: Date | null): boolean => {
    return d ? d <= this.dateToday : true;
  };

  tasksFilter(e: any, i: number): void {
    console.log('taskFilter:' + i);
    const filterValue = e.target.value.toLowerCase();
    this.taskRegns[i].filteredOptions = this.allTasksList.filter((o) =>
      o.name.toLowerCase().includes(filterValue)
    );
    //this.updateTaskRegnsFromTo(); //TODO(Dhruv) -- see why this is needed
  }
 

  breakSchemeSelector() {
    this.breakSchemeSelected = breakScheme;

    this.totalTimeBreak = '00:00';
    breakScheme.scheme.forEach(
      (brk) =>
        (this.totalTimeBreak = time(this.totalTimeBreak)
          .add(brk.duration)
          .format(TIME_FORMAT))
    );
    //console.log(this.totalTimeBreak);

    breakScheme.scheme.map((brk) => {
      brk.fromMoment = time(brk.from);
      brk.till = time(brk.from)
        .add(moment.duration(brk.duration))
        .format(TIME_FORMAT);
      brk.tillMoment = time(brk.from).add(moment.duration(brk.duration));
    });
  }

  fetchPresenceNTaskRegns() {
    this.presenceDocSubscription =
      this.firestoreService.getPresenceDocForDate(this.dateSelected, this.loggedInUserDocData.associatedWorkerId, this.loggedInUserDocData.associatedWorkerClientId)
        .subscribe(async (presenceDocs) => {
          //console.log(`Number of presenceDocs found:` + presenceDocs.length);
          if (presenceDocs.length > 0) {
            this.presenceDocForSelectedDate = presenceDocs[0];
            console.log('Presence ID:' + this.presenceDocForSelectedDate.id);
            this.continueListeningToTaskRegnChanges();
          } else if (!this.presenceDocForSelectedDate?.id) {
            console.log('Presence doc not found for selected date. Creating one...');
            if (!this.creatingPresenceDoc) {
              this.creatingPresenceDoc = true;
              await this.firestoreService.createPresenceDocForSelectedDate(this.dateSelected, this.loggedInUserDocData);
              this.creatingPresenceDoc = false;
            }
          }
        });
  }

  tasksGenerator() {
    this.breakSchemeSelector();
    let lastFrom = this.presenceForm.controls['startTime'].value;
    let proceed = true;

    while (proceed) {
      let nextBreak = this.breakSchemeSelected.scheme.filter((brk) => {
        if (!brk.fromMoment) return;
        return brk.fromMoment > time(lastFrom);
      })[0];

      if (nextBreak) {
        const taskFrom = lastFrom;
        const durationTillBreak = time(nextBreak.from)
          .subtract(moment.duration(lastFrom))
          .format(TIME_FORMAT);

        const durationTaskTillPresenceEnd = time(
          this.presenceForm.controls['endTime'].value
        )
          .subtract(moment.duration(taskFrom))
          .format(TIME_FORMAT);

        const durationTaskMinimum = moment
          .min(time(durationTillBreak), time(durationTaskTillPresenceEnd))
          .format(TIME_FORMAT);

        const taskTill = time(lastFrom)
          .add(moment.duration(durationTaskMinimum))
          .format(TIME_FORMAT);

        console.log({
          presenceTotal: this.presenceTotalTime,
          nextBreak,
          durationTillBreak,
          durationTaskTillPresenceEnd,
          durationTaskMinimum,
          taskTill,
          taskFrom,
          lastFrom,
        });

        if (
          time(lastFrom).add(durationTaskMinimum).format('X') >=
          time(this.presenceForm.controls['endTime'].value).format('X')
        )
          break;
        // Task
        this.taskRegns.push({
          startTime: lastFrom ? lastFrom : '',
          endTime: '',
          selectedOption: {id: '', name: '', type: ''},
          duration: durationTaskMinimum,
        });

        if (
          time(durationTillBreak).format('X') >=
          time(durationTaskTillPresenceEnd).format('X')
        )
          break;

        const durationPauseTillPresenceEnd = moment(
          this.presenceForm.controls['endTime'].value,
          TIME_FORMAT
        )
          .subtract(moment.duration(nextBreak.from))
          .format(TIME_FORMAT);

        const durationBreakMinimum = moment
          .min(time(nextBreak.duration), time(durationPauseTillPresenceEnd))
          .format(TIME_FORMAT);

        if (
          time(lastFrom).add(durationBreakMinimum).format('X') >=
          time(this.presenceForm.controls['endTime'].value).format('X')
        )
          break;
        // Pause
        this.taskRegns.push({
          duration: durationBreakMinimum,
          endTime: '',
          startTime: '',
          selectedOption: this.allTasksList[0] as TaskOption, //TODO -- check this logic - if it has to be a break type
        });
        lastFrom = nextBreak.till ? nextBreak.till : '';
      } else {
        const remaining = time(this.presenceForm.controls['endTime'].value)
          .subtract(moment.duration(lastFrom))
          .format(TIME_FORMAT);
        this.taskRegns.push({
          startTime: '',
          endTime: '',
          selectedOption: {id: '', name: '', type: ''},
          duration: remaining,
        });
        proceed = false;
      }
    }
    this.updateTaskRegnsFromTo(true);
  }

  displayTaskName(value: any) {
    if (value) {
      return value.name;
    }
  }

  dropTask(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.taskRegns, event.previousIndex, event.currentIndex);
    this.updateTaskRegnsFromTo(true);
  }

  setLastSelectedTaskRegn(i: number) {
    this.lastSelectedTaskRegn = i;
    this.taskRegns.map((taskRegn) => (taskRegn.class = ''));
    this.taskRegns[i].class = 'task-regn-card-selected';
    //console.log(i);
  }

  addTaskRegn(i: number | 'AUTO') {
    //this.updateTaskRegnsFromTo();
    const remainingMinusPause = time(this.totalTimeRemaining)
      .subtract(this.totalTimeBreak)
      .format(TIME_FORMAT);

    if (i !== 'AUTO') {
      this.taskRegns.splice(Number(i) + 1, 0, {
        startTime: '',
        endTime: '',
        duration: remainingMinusPause,
      });
    } else {
      this.taskRegns.splice(this.lastSelectedTaskRegn + 1, 0, {
        startTime: '',
        endTime: '',
        duration: remainingMinusPause,
      });
    }
    this.updateTaskRegnsFromTo(true);
  }

  trackByTask(index: number, task: any): any {
    return task.id;
  }

  presenceDayLengthUpdated(updatedTime: string, fieldName: string) {

  }

  taskTimeUpdated(updatedTime: string, idx: number) {
    this.updateTaskRegnsFromTo(true, idx);
  }

  addRemainingAsPause() {
    //this.updateTaskRegnsFromTo();
    this.taskRegns.push({
      startTime: this.taskRegns[this.taskRegns.length - 1].startTime,
      endTime: '',
      selectedOption: this.allTasksList[0],//TODO -- check this logic
      duration: this.totalTimeBreak,
    });
    this.updateTaskRegnsFromTo(true);
  }

  removeTaskRegn(i: number | 'AUTO') {
    if (i !== 'AUTO') {
      if (this.taskRegns[i].id) {
        this.firestoreService.deleteTaskRegn(this.taskRegns[i], this.presenceDocForSelectedDate.id);
      }
      this.taskRegns.splice(Number(i), 1);
    } else {
      if (this.taskRegns[0].id) {
        this.firestoreService.deleteTaskRegn(this.taskRegns[0], this.presenceDocForSelectedDate.id);
      }
      this.taskRegns.splice(0, 1);
    }
    this.updateTaskRegnsFromTo(true);
  }

  async clearTasks() {
    this.updateInProgress = true;
    try {
      await this.firestoreService.deleteAllTaskRegnsForPresenceId(this.taskRegns, this.presenceDocForSelectedDate.id);
      //this.taskRegns = [];
    } catch (error: any) {
      this.updateInProgress = false;
    }

    //this.updateTaskRegnsFromTo();
  }

  changedTaskRegnDuration(e: any) {
    //console.log(this.taskRegns);
    this.updateTaskRegnsFromTo(true);
  }

  presenceFromBeforeChange(e: any) {
    this.presenceStartTimeBefore = e.target.value;
  }

  presenceTillBeforeChange(e: any) {
    this.presenceEndTimeBefore = e.target.value;
  }

  updateTaskRegnsFromTo(toBeSaved = false, updateFromIndex = 0) {
    //console.log('To be saved:' + toBeSaved)
    let previousTill = time(this.presenceForm.controls['startTime'].value).format(
      TIME_FORMAT
    );
    this.totalTimeSpecified = '00:00';
    this.totalTimeBreaksSpecified = '00:00';
    this.totalTimeTasksSpecified = '00:00';
    this.pauseCount = 0;

    this.taskRegns.map((taskRegn) => {
      const duration = taskRegn.duration;
      this.totalTimeSpecified = time(this.totalTimeSpecified)
        .add(moment.duration(duration))
        .format(TIME_FORMAT);
      if (taskRegn.selectedOption?.type === 'BREAK') {
        this.pauseCount++;
        this.totalTimeBreaksSpecified = time(this.totalTimeBreaksSpecified)
          .add(moment.duration(duration))
          .format(TIME_FORMAT);
      } else {
        this.totalTimeTasksSpecified = time(this.totalTimeTasksSpecified)
          .add(moment.duration(duration))
          .format(TIME_FORMAT);
      }
      const till = time(previousTill)
        .add(moment.duration(duration))
        .format(TIME_FORMAT);
      taskRegn.startTime = previousTill;
      taskRegn.endTime = till;
      previousTill = till;
    });
    this.presenceTotalTime = time(this.presenceForm.controls['endTime'].value)
      .subtract(moment.duration(this.presenceForm.controls['startTime'].value))
      .format(TIME_FORMAT);
    this.totalTimeRemaining =
      time(this.presenceTotalTime).format('X') >=
      time(this.totalTimeSpecified).format('X')
        ? time(this.presenceTotalTime)
          .subtract(moment.duration(this.totalTimeSpecified))
          .format(TIME_FORMAT)
        : 'over due';
    const emptyTasks = this.taskRegns.filter(
      (task) => ((task.selectedOption?.name === undefined) || (task.selectedOption?.name === ''))
    ).length;
    this.saveDisabled = this.totalTimeRemaining !== '00:00' || emptyTasks > 0;
    if (toBeSaved) {
      this.saveTasks(updateFromIndex);
    }
  }
  selectedLocation:string='Select Location'
  onchangeLocation(event:any){
   
    const worker:any = this.workerLocation.find(worker => worker.id === event);
    
    this.selectedLocation = worker?.name
    console.log('change location',event)
  }

  async onTaskSelectionInTaskRegn($event: any, idx: any) {
    let taskId = $event;
    let selectedTask: any = this.allTasksList.filter(task => task.id === taskId)[0];

    if (this.taskRegns[idx]?.selectedOption?.id === taskId) {//selected value is same as before - saving a call to backend
      return;
    }
    this.updateInProgress = true;
    try {
      await this.firestoreService.updateTaskInTaskRegn(this.taskRegns[idx].id, {
        id: taskId,
        name: selectedTask.name,
        type: selectedTask.type
      }, this.presenceDocForSelectedDate.id);
      this.updateInProgress = false;
    } catch (error: any) {
      this.updateInProgress = false;
      console.log('Error in updating task regn:' + JSON.stringify(error));
      //TODO -- decide if error needs to be shown
    }
    this.updateTaskRegnsFromTo(false);
  }

  async saveTasks(updateFromIndex = 0) {
    const userName = this.loggedInUserDocData?.name ?? '';
    const userId = this.loggedInUserDocData?.id;
    const workerName = this.firestoreService.clientWorker.worker.name ?? '';
    const workerId = this.firestoreService.clientWorker.worker.id;
    const deviceType = 'browser';
    const locationId = 'TODO';
    const locationName = 'TODO';

    // FS Location: client/{clientId}/presence/{presenceId}

    /*const presence = {
      userName,
      userId,
      workerName,
      workerId,
      deviceType,
      locationId,
      locationName,
      isArchived: false,
      date: moment(this.presence.controls['date'].value).toDate(),
      startTimestamp: timeAddDate(
        moment(this.presence.controls['date'].value).toDate(),
        this.presence.controls['startTime'].value
      ),
      endTimestamp: timeAddDate(
        moment(this.presence.controls['date'].value).toDate(),
        this.presence.controls['endTime'].value
      ),
      durationTotal: timeAsSeconds(this.totalTimeSpecified),
      durationBreaks: timeAsSeconds(this.totalTimeBreaksSpecified),
      durationTasks: timeAsSeconds(this.totalTimeTasksSpecified),
      creationTimestamp: new Date(),
      updatedTimestamp: new Date(),
    };*/

    // FS Location: client/{clientId}/presence/{presenceId}/taskRegnsToSave/{tasksId}
    let taskRegnsToSave: any = this.taskRegns.slice(updateFromIndex);
    taskRegnsToSave = taskRegnsToSave.map((taskRegn: any) => ({
      id: taskRegn.id ?? null,
      taskName: taskRegn.selectedOption?.name ?? null,
      taskId: taskRegn.selectedOption?.id ?? null,
      createdByUserId: userId,
      createdByUserName: userName ?? '',
      workerName,
      workerId,
      deviceType,
      locationId,
      locationName,
      isArchived: false,
      date: moment(this.presenceForm.controls['date'].value).toDate(),
      startTimestamp: timeAddDate(
        moment(this.presenceForm.controls['date'].value).toDate(),
        taskRegn.startTime
      ),
      endTimestamp: timeAddDate(
        moment(this.presenceForm.controls['date'].value).toDate(),
        taskRegn.endTime
      ),
      durationTotal: timeAsSeconds(taskRegn.duration),
      creationTimestamp: new Date(),
      updatedTimestamp: new Date(),
    }));

    //console.log(JSON.stringify({presence, taskRegnsToSave}));
    try {
      console.log(`updateFromIndex:${updateFromIndex}, tasks saved:${taskRegnsToSave.length}`);
      await this.firestoreService.createNUpdateTasksUnderPresence(taskRegnsToSave, this.presenceDocForSelectedDate.id);
      console.log('Tasks are saved to Firestore');
    } catch (error: any) {
      console.log('Error in saving taskRegns:' + JSON.stringify(error));
    }

  }

  async setPresenceAsSaved() {
    try {
      await this.firestoreService.markPresenceAsSaved(this.presenceDocForSelectedDate.id);

      this.snackBar.open('Your presence has been marked as saved', '', {
        duration: 5000,
        panelClass: ['snackbar-success'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    } catch (error: any) {
      this.snackBar.open('Error in marking your presence as saved:' + error.message, '', {
        duration: 5000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  async cancelTasks() {
    try {
      await this.firestoreService.deleteAllTaskRegnsNPresence(this.taskRegns, this.presenceDocForSelectedDate);
      this.taskRegns = [];
      this.snackBar.open('Data for today has been cleared', '', {
        duration: 5000,
        panelClass: ['snackbar-success'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      console.log('Creating new presence doc...');
      await this.firestoreService.addPresenceDoc(this.dateSelected, this.loggedInUserDocData);
    } catch (error: any) {
      this.snackBar.open('Error in clearing data for today:' + error.message, '', {
        duration: 5000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  isTodaySelected() {
    return moment().startOf('day').isSame(moment(this.presenceForm.controls.date.value).startOf('day'));
  }

  isCancellable() {
    return this.isTodaySelected();
  }

  continueListeningToTaskRegnChanges() {
    this.taskRegnsSubscription = this.firestoreService.getAllTaskRegnsForPresence(this.presenceDocForSelectedDate).subscribe(taskRegns => {
      this.taskRegnsSubscription?.unsubscribe();
      this.firstLoadOfTaskRegns(taskRegns)
      this.updateTaskRegnsFromTo(false, 0);
      this.tasksStateChangesSubscription = this.firestoreService
        .getAllTaskRegnsStateChangesForPresence(this.presenceDocForSelectedDate, this.taskRegns?.map(tr => tr.id))
        .subscribe(taskRegns => {
          let anyTaskRegnAffected = false;
          for (const taskRegn of taskRegns) {
            switch (taskRegn.changeType) {
              case 'added': {
                const addedIndex = this.taskRegns.findIndex(tr => tr.id === taskRegn.id);
                if (addedIndex === -1) {
                  anyTaskRegnAffected = true;
                  this.taskRegns.push(this.mapTaskRegnFromFSToUI(taskRegn));
                }
                break;
              }
              case 'modified': {
                anyTaskRegnAffected = true;
                const modifiedIndex = this.taskRegns.findIndex(tr => tr.id === taskRegn.id);
                this.taskRegns[modifiedIndex] = this.mapTaskRegnFromFSToUI(taskRegn);
                break;
              }
              case 'removed': {
                const removedIndex = this.taskRegns.findIndex(tr => tr.id === taskRegn.id);
                if (removedIndex !== -1) {
                  this.taskRegns.filter(tr => !tr.id || (tr.id !== taskRegn.id));
                }
                break;
              }
            }
          }
          if (anyTaskRegnAffected) {
            this.updateTaskRegnsFromTo(false);
          }
        });
    });
  }

  dateIsForPastNSaved() {
    if (!this.presenceDocForSelectedDate) {
      return false;
    } else {
      return (this.presenceDocForSelectedDate.saved && !this.isTodaySelected());
    }
  }

  mapTaskRegnFromFSToUI(taskRegn: any) {
    if (taskRegn.startTimestamp) {
      taskRegn.startTime = moment(taskRegn.startTimestamp.toDate()).format(TIME_FORMAT);
    }

    if (taskRegn.endTimestamp) {
      taskRegn.endTime = moment(taskRegn.endTimestamp.toDate()).format(TIME_FORMAT);
    }

    if (taskRegn.startTime && taskRegn.endTime) {
      //taskRegn.duration = `${moment.duration(taskRegn.durationTotal, 'seconds').get('hours')}:${moment.duration(taskRegn.durationTotal, 'seconds').get('minutes')}`;
      taskRegn.duration = moment.duration(taskRegn.durationTotal * 1000).format("hh:mm", {trim: false})
    }

    taskRegn.selectedOption = {
      id: taskRegn.taskId,
      name: taskRegn.taskName,
      type: taskRegn.taskType
    };
    taskRegn.name = taskRegn.taskName;
    return {
      ...taskRegn
    }
  }

}

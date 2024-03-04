import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDialog} from '@angular/material/dialog';
import * as moment from 'moment';
import {breakScheme, workerOptions} from 'src/app/common/helpers/data';
import {TIME_FORMAT, time, timeAddDate, timeAsSeconds, dateIsToday} from 'src/app/common/helpers/time';
import {BreakScheme, TaskRegn} from 'src/app/common/interfaces/time-interface';
import {Subscription} from 'rxjs';
import {AuthService} from '../../../common/services/auth.service';
import {FirestoreService} from '../../../common/services/firestore.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {

  states: string[] = [
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
  ];



  dateToday: Date = new Date();
  workerSelected = workerOptions[0];
  workerOptions = workerOptions;

  breakSchemeSelected: BreakScheme;

  taskRegns: TaskRegn[] = [];

  presence = new FormGroup({
    date: new FormControl<Date | null>(new Date()),
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
  lastSelectedTask: number = 0;
  saveDisabled: boolean = true;
  loggedInUserFromAuthServiceSubscription: Subscription;
  loggedInUserDocData: any;
  presenceDocForToday: any;
  allTasksSubscription: Subscription;
  allTasksList: any[];
  presenceDocSubscription: Subscription;

  constructor(
    public dialog: MatDialog,
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar
  ) {
    this.breakSchemeSelector();
    this.presenceTotalTime = time(this.presence.controls['endTime'].value)
      .subtract(this.presence.controls['startTime'].value)
      .format(TIME_FORMAT);
    this.updateTasksFromTo();
    this._locale = 'nl';
    this._adapter.setLocale(this._locale);
    this.loggedInUserFromAuthServiceSubscription = this.authService.loggedInUserFromAuthService$.subscribe(
      (userDocData: any) => {
        this.loggedInUserDocData = userDocData;
        this.loadTasks();
        this.presenceDocSubscription = this.firestoreService.getPresenceDocForToday(userDocData.associatedWorkerId, userDocData.associatedWorkerClientId)
          .subscribe(async (presenceDocs) => {
            console.log(JSON.stringify(presenceDocs));
            if (presenceDocs.length > 0) {
              this.presenceDocForToday = presenceDocs[0];
            } else {
              await this.firestoreService.createPresenceDocForToday(this.loggedInUserDocData);
            }
          });
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
  }

  ngOnInit() {
    this.presence.controls.date.valueChanges.subscribe((value) => {
      this.setDateHint();
    });
    this.presence.controls.date.setValue(new Date());
  }

  ngAfterViewInit() {
  }

  setDateHint() {
    this.dateHint = moment(this.presence.controls.date.value).format(
      'dddd [week] W'
    );
  }

  futureFilter = (d: Date | null): boolean => {
    return d ? d <= this.dateToday : true;
  };

  tasksFilter(e: any, i: number): void {
    const filterValue = e.target.value.toLowerCase();
    this.taskRegns[i].filteredOptions = this.allTasksList.filter((o) =>
      o.name.toLowerCase().includes(filterValue)
    );
    this.updateTasksFromTo();
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
    console.log(this.totalTimeBreak);

    breakScheme.scheme.map((brk) => {
      brk.fromMoment = time(brk.from);
      brk.till = time(brk.from)
        .add(moment.duration(brk.duration))
        .format(TIME_FORMAT);
      brk.tillMoment = time(brk.from).add(moment.duration(brk.duration));
    });
  }

  tasksGenerator() {
    this.breakSchemeSelector();
    let lastFrom = this.presence.controls['startTime'].value;
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
          this.presence.controls['endTime'].value
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
          time(this.presence.controls['endTime'].value).format('X')
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
          this.presence.controls['endTime'].value,
          TIME_FORMAT
        )
          .subtract(moment.duration(nextBreak.from))
          .format(TIME_FORMAT);

        const durationBreakMinimum = moment
          .min(time(nextBreak.duration), time(durationPauseTillPresenceEnd))
          .format(TIME_FORMAT);

        if (
          time(lastFrom).add(durationBreakMinimum).format('X') >=
          time(this.presence.controls['endTime'].value).format('X')
        )
          break;
        // Pause
        this.taskRegns.push({
          duration: durationBreakMinimum,
          endTime: '',
          startTime: '',
          selectedOption: this.allTasksList[0], //TODO -- check this logic
        });
        lastFrom = nextBreak.till ? nextBreak.till : '';
      } else {
        const remaining = time(this.presence.controls['endTime'].value)
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
    this.updateTasksFromTo();
  }

  displayTaskName(value: any) {
    if (value) {
      return value.name;
    }
  }

  dropTask(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.taskRegns, event.previousIndex, event.currentIndex);
    this.updateTasksFromTo();
  }

  setLastSelectedTask(i: number) {
    this.lastSelectedTask = i;
    this.taskRegns.map((task) => (task.class = ''));
    this.taskRegns[i].class = 'task-card-selected';
    console.log(i);
  }

  addTask(i: number | 'AUTO') {
    this.updateTasksFromTo();
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
      this.taskRegns.splice(this.lastSelectedTask + 1, 0, {
        startTime: '',
        endTime: '',
        duration: remainingMinusPause,
      });
    }
    this.updateTasksFromTo();
  }

  addRemainingAsPause() {
    this.updateTasksFromTo();
    this.taskRegns.push({
      startTime: this.taskRegns[this.taskRegns.length - 1].startTime,
      endTime: '',
      selectedOption: this.allTasksList[0],//TODO -- check this logic
      duration: this.totalTimeBreak,
    });
    this.updateTasksFromTo();
  }

  removeTask(i: number | 'AUTO') {
    if (i !== 'AUTO') {
      this.taskRegns.splice(Number(i), 1);
    } else {
      this.taskRegns.splice(this.lastSelectedTask, 1);
    }
    this.updateTasksFromTo();
  }

  clearTasks() {
    this.taskRegns = [];
    this.updateTasksFromTo();
  }

  changedTaskDuration(e: any) {
    console.log(this.taskRegns);
    this.updateTasksFromTo();
  }

  presenceFromBeforeChange(e: any) {
    this.presenceStartTimeBefore = e.target.value;
  }

  presenceTillBeforeChange(e: any) {
    this.presenceEndTimeBefore = e.target.value;
  }

  updateTasksFromTo() {
    let previousTill = time(this.presence.controls['startTime'].value).format(
      TIME_FORMAT
    );
    this.totalTimeSpecified = '00:00';
    this.totalTimeBreaksSpecified = '00:00';
    this.totalTimeTasksSpecified = '00:00';
    this.pauseCount = 0;

    this.taskRegns.map((task) => {
      const duration = task.duration;
      this.totalTimeSpecified = time(this.totalTimeSpecified)
        .add(moment.duration(duration))
        .format(TIME_FORMAT);
      if (task.selectedOption?.type === 'break') {
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
      task.startTime = previousTill;
      task.endTime = till;
      previousTill = till;
    });
    this.presenceTotalTime = time(this.presence.controls['endTime'].value)
      .subtract(moment.duration(this.presence.controls['startTime'].value))
      .format(TIME_FORMAT);
    this.totalTimeRemaining =
      time(this.presenceTotalTime).format('X') >=
      time(this.totalTimeSpecified).format('X')
        ? time(this.presenceTotalTime)
          .subtract(moment.duration(this.totalTimeSpecified))
          .format(TIME_FORMAT)
        : 'over due';
    const emptyTasks = this.taskRegns.filter(
      (task) => task.selectedOption?.name === undefined
    ).length;
    this.saveDisabled = this.totalTimeRemaining !== '00:00' || emptyTasks > 0;
  }

  saveTasks() {
    const userName = 'Rose W';
    const userId = 'ea5be0b5-a148-4f5a-940b-4a842fc5bf12';
    const workerName = 'Rose W';
    const workerId = 'b46c0d0e-b0e5-40ce-a3a7-53079d8a597b';
    const deviceType = 'browser';
    const locationId = 'wdVU3jfywCLOU3uLTdHM';
    const locationName = 'De Bruidsbogerd';

    // FS Location: client/{clientId}/presence/{presenceId}
    const presence = {
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
    };

    // FS Location: client/{clientId}/presence/{presenceId}/tasks/{tasksId}
    const tasks = this.taskRegns.map((task) => ({
      task: task.selectedOption?.name,
      taskId: task.selectedOption?.id,
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
        task.startTime
      ),
      endTimestamp: timeAddDate(
        moment(this.presence.controls['date'].value).toDate(),
        task.endTime
      ),
      durationTotal: timeAsSeconds(task.duration),
      creationTimestamp: new Date(),
      updatedTimestamp: new Date(),
    }));

    console.log(JSON.stringify({presence, tasks}));
    console.log('Tasks are saved to Firestore');
  }

  async cancelTasks() {
    try {
      await this.firestoreService.deleteAllTaskRegnsNPresence(this.taskRegns, this.presenceDocForToday);
      this.taskRegns = [];
      this.snackBar.open('Data for today has been cleared', '', {
        duration: 5000,
        panelClass: ['snackbar-success'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    } catch (error: any) {
      //TODO -- show error snackbar
    }
  }

  isCancellable() {
    return true;
    //TODO -- dateIsToday(this.dateToday)
  }
}

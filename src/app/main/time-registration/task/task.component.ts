import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDialog} from '@angular/material/dialog';
import * as moment from 'moment';
import {TIME_FORMAT, time, timeAddDate, timeAsSeconds, dateIsToday, TIME_ZONE} from 'src/app/common/helpers/time';
import {BreakScheme, TaskOption, LocationOption, TaskRegn} from 'src/app/common/interfaces/time-interface';
import {Subscription} from 'rxjs';
import {AuthService} from '../../../common/services/auth.service';
import {FirestoreService} from '../../../common/services/firestore.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {v4 as uuidv4} from 'uuid';
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

  clientLocations: LocationOption[] = [];

  presenceForm = new FormGroup({
    date: new FormControl<Date | null>(new Date()),
    locationId: new FormControl<string | null>(null),
    startTime: new FormControl<string | null>(null),
    endTime: new FormControl<string | null>(null),
  });

  dateHint: string;
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
  filteredLocationOptions: LocationOption[] = [];
  locationListSubscription: Subscription;
  worker: any;
  workerSubscription: Subscription;
  taskFilterOption: any = []
  client: any;
  clientSubscription: Subscription;

  constructor(
    public dialog: MatDialog,
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar
  ) {
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

        this.clientSubscription = this.firestoreService.getClientById(this.loggedInUserDocData.associatedWorkerClientId)
          .subscribe((clientDS: any) => {
            this.client = clientDS.data();
            this.breakSchemeSelector();
          });


        this.workerSubscription = this.firestoreService.getWorkerByIdForClientId(this.loggedInUserDocData.associatedWorkerId, this.loggedInUserDocData.associatedWorkerClientId)
          .subscribe((workerDS: any) => {
            this.worker = workerDS.data();
            this.fetchPresenceNTaskRegns();
            this.locationListSubscription = this.firestoreService
              .getAllLocationsForClientId(this.loggedInUserDocData.associatedWorkerClientId)
              .subscribe((locationsList) => (this.clientLocations = locationsList
                .filter((loc: any) => this.worker.locationIds?.includes(loc.id))
                .sort((locA: any, locB: any) => {
                  return locA.name?.toLowerCase() < locB.name?.toLowerCase() ? -1 : locA.name?.toLowerCase() > locB.name?.toLowerCase() ? 1 : 0;
                })));
          });
      });

  }

  filterLocation(event: any): void {
    //console.log('event', event.target.value)
    const filterValue = event.target.value.toLowerCase();
    this.filteredLocationOptions = this.clientLocations.filter(o => o.name.toLowerCase().includes(filterValue));
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
        this.taskFilterOption = this.allTasksList.slice()
      });
  }

  ngOnDestroy(): void {
    this.loggedInUserFromAuthServiceSubscription?.unsubscribe();
    this.presenceDocSubscription?.unsubscribe();
    this.allTasksSubscription?.unsubscribe();
    this.taskRegnsSubscription?.unsubscribe();
    this.tasksStateChangesSubscription?.unsubscribe();
    this.workerSubscription.unsubscribe();
    this.clientSubscription.unsubscribe();
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

    this.presenceForm.controls.locationId.valueChanges.subscribe(async (newLocationId) => {
      //console.log('newLocationId:' + newLocationId);
      //console.log('Existing locationId in presence doc:' + this.presenceDocForSelectedDate.locationId);
      if (this.presenceDocForSelectedDate.locationId === newLocationId) {
        //console.log('returning without setting locationId');
        return;
      }
      let selectedLocation = null;
      if (newLocationId) {
        selectedLocation = this.clientLocations.find(loc => loc.id === newLocationId);
      }

      await this.firestoreService.updatePresenceById(this.presenceDocForSelectedDate.id, this.loggedInUserDocData.associatedWorkerClientId, {
        locationId: selectedLocation ? selectedLocation.id : null,
        locationName: selectedLocation ? selectedLocation.name : null
      });
    });
    this.presenceForm.controls.startTime.valueChanges.subscribe((value) => {
      console.log('startTime new value:' + value);
      this.recalculateTotalTime();
      this.updateStartTimeInPresence();
    });

    this.presenceForm.controls.endTime.valueChanges.subscribe((value) => {
      console.log('endTime new value:' + value);
      this.recalculateTotalTime();
      this.updateEndTimeInPresence();
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
    // const filterValue = event.target.value.toLowerCase();
    // this.filteredLocationOptions = this.workerLocation.filter(o => o.name.toLowerCase().includes(filterValue));
    //console.log('taskFilter:' + i, e.target.value.length);
    const filterValue = e.target.value.toLowerCase();
    this.taskRegns[i].filteredOptions = this.allTasksList.filter((o) =>
      o.name.toLowerCase().includes(filterValue)
    );

    if (e.target.value.length <= 0) {
      const breakOption: TaskOption = {
        id: '',
        name: '',
        type: ''
      };
      this.onTaskSelectionInTaskRegn(breakOption, i)
    }
    //this.updateTaskRegnsFromTo(); //TODO(Dhruv) -- see why this is needed
  }


  breakSchemeSelector() {
    this.breakSchemeSelected = this.client.autoBreakOptions;

    this.totalTimeBreak = '00:00';
    this.breakSchemeSelected.scheme.forEach(
      (brk) =>
        (this.totalTimeBreak = time(this.totalTimeBreak)
          .add(brk.duration)
          .format(TIME_FORMAT))
    );
    //console.log(this.totalTimeBreak);

    this.breakSchemeSelected.scheme.map((brk) => {
      brk.fromMoment = time(brk.from);
      brk.till = time(brk.from)
        .add(moment.duration(brk.duration))
        .format(TIME_FORMAT);
      brk.tillMoment = time(brk.from).add(moment.duration(brk.duration));
    });
  }

  fetchPresenceNTaskRegns() {
    this.presenceDocSubscription =
      this.firestoreService.getPresenceDocForDate(this.dateSelected, this.loggedInUserDocData.associatedWorkerId,
        this.loggedInUserDocData.associatedWorkerClientId)
        .subscribe(async (presenceDocs) => {
          //console.log(`Number of presenceDocs found:` + presenceDocs.length);
          if (presenceDocs.length > 0) {
            this.presenceDocForSelectedDate = presenceDocs[0];
            console.log('Presence ID:' + this.presenceDocForSelectedDate.id);
            if (presenceDocs[0].locationId) {
              this.presenceForm.controls.locationId.setValue(presenceDocs[0].locationId, {emitEvent: false});
            }
            if (presenceDocs[0].startTimestamp) {
              const startTimestampStr = (moment(presenceDocs[0].startTimestamp.toDate()).tz(TIME_ZONE).format(TIME_FORMAT));
              //console.log('Setting startTimestamp in UI:' + startTimestampStr);
              if (this.presenceForm.controls.startTime.value !== startTimestampStr) {
                this.presenceForm.controls.startTime.setValue(startTimestampStr, {emitEvent: false});
              }
            }
            if (presenceDocs[0].presenceEndTimestamp) {
              const endTimestampStr = (moment(presenceDocs[0].presenceEndTimestamp.toDate()).tz(TIME_ZONE).format(TIME_FORMAT));
              if (this.presenceForm.controls.endTime.value !== endTimestampStr) {
                this.presenceForm.controls.endTime.setValue(endTimestampStr, {emitEvent: false});
              }
            }
            this.continueListeningToTaskRegnChanges();
          } else if (!this.presenceDocForSelectedDate?.id) {
            console.log('Presence doc not found for selected date. Creating one...');
            if (!this.creatingPresenceDoc) {
              this.creatingPresenceDoc = true;
              await this.firestoreService.addPresenceDoc(this.dateSelected, this.loggedInUserDocData, this.worker);
              this.creatingPresenceDoc = false;
            }
          }
        });
  }

  tasksGenerator() {
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
          uuid: uuidv4()
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
          selectedOption: this.allTasksList.filter(task => task.id === this.client.pauseTaskId)[0] as TaskOption,
          uuid: uuidv4()
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
          uuid: uuidv4()
        });
        proceed = false;
      }
    }
    this.updateTaskRegnsFromTo(true);
  }

  displaySelectedName(value: any) {
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
        uuid: uuidv4()
      });
    } else {
      this.taskRegns.splice(this.lastSelectedTaskRegn + 1, 0, {
        startTime: '',
        endTime: '',
        duration: remainingMinusPause,
        uuid: uuidv4()
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
      selectedOption: this.allTasksList.filter(task => task.id === this.client.pauseTaskId)[0] as TaskOption,
      duration: this.totalTimeBreak,
      uuid: uuidv4()
    });
    this.updateTaskRegnsFromTo(true);
  }

  async removeTaskRegn(i: number | 'AUTO') {
    if (i !== 'AUTO') {
      if (this.taskRegns[i].id) {
        await this.firestoreService.deleteTaskRegn(this.taskRegns[i], this.presenceDocForSelectedDate.id);
        this.taskRegns.splice(Number(i), 1);
      }
    } else {
      if (this.taskRegns[0].id) {
        await this.firestoreService.deleteTaskRegn(this.taskRegns[0], this.presenceDocForSelectedDate.id);
        this.taskRegns.splice(0, 1);
      }
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

  selectedTask: any = []

  onAutocompleteClosed(event: any, idx: any,inputTarget:any) {
    if (event.length > 0)
    inputTarget.value = this.taskRegns[idx].selectedOption?.name;
  }

  getselectedId: string = ''

  async onTaskSelectionInTaskRegn($event: any, idx: any) {
    this.getselectedId = idx
    let taskId = $event.id;
    let selectedTask: any = this.allTasksList.filter(task => task.id === taskId)[0];


    if (this.taskRegns[idx]?.selectedOption?.id === taskId) {//selected value is same as before - saving a call to backend
      return;
    }
    this.updateInProgress = true;
    try {
    if (taskId === '') {
      await this.firestoreService.updateTaskInTaskRegn(this.taskRegns[idx].id, {
        id: '',
        name: '',
        type: ''
      }, this.presenceDocForSelectedDate.id);
        return;
    }

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
    this.selectedTask = this.taskRegns[idx].selectedOption;
    this.updateTaskRegnsFromTo(false);
  }

  async saveTasks(updateFromIndex = 0) {
    const userName = this.loggedInUserDocData?.name ?? '';
    const userId = this.loggedInUserDocData?.id;
    const workerName = this.firestoreService.clientWorker.worker.name ?? '';
    const workerId = this.firestoreService.clientWorker.worker.id;
    const deviceType = 'CLOCKWEB';
    const locationId = this.presenceForm.controls.locationId.value ?? null;
    let locationName: string | null = null;
    if (locationId) {
      locationName = this.clientLocations.filter(loc => loc.id === locationId)[0].name ?? '';
    }

    // FS Location: client/{clientId}/presence/{presenceId}/taskRegnsToSave/{tasksId}
    let taskRegnsToSave: any = this.taskRegns.slice(updateFromIndex);
    taskRegnsToSave = taskRegnsToSave.map((taskRegn: any) => ({
      uuid: taskRegn.uuid,
      id: taskRegn.id ?? null,
      taskName: taskRegn.selectedOption?.name ?? null,
      taskId: taskRegn.selectedOption?.id ?? null,
      taskType: taskRegn.selectedOption?.type ?? null,
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

  async cancelTasksNPresence() {
    try {
      this.updateInProgress = true;
      await this.firestoreService.deleteAllTaskRegnsNPresence(this.taskRegns, this.presenceDocForSelectedDate);
      this.presenceForm.controls.locationId.setValue(null);
      this.taskRegns = [];
      this.presenceDocSubscription?.unsubscribe();
      this.taskRegnsSubscription?.unsubscribe();
      this.tasksStateChangesSubscription?.unsubscribe();
      this.fetchPresenceNTaskRegns();
      this.snackBar.open('Data for today has been cleared', '', {
        duration: 5000,
        panelClass: ['snackbar-success'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      console.log('Creating new presence doc...');
      await this.firestoreService.addPresenceDoc(this.dateSelected, this.loggedInUserDocData, this.worker);
      this.updateInProgress = false;
    } catch (error: any) {
      this.updateInProgress = false;
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
    let that = this;
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
                const addedIndex = that.taskRegns.findIndex(tr => tr.id === taskRegn.id
                  || (taskRegn.uuid && (tr.uuid === taskRegn.uuid)));
                if (addedIndex === -1) {
                  anyTaskRegnAffected = true;
                  that.taskRegns.push(this.mapTaskRegnFromFSToUI(taskRegn));
                } else {
                  if (!this.taskRegns[addedIndex].id) {
                    that.taskRegns[addedIndex].id = taskRegn.id;
                    that.taskRegns[addedIndex] = this.mapTaskRegnFromFSToUI(taskRegn);
                  }
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

  async updateStartTimeInPresence() {
    await this.firestoreService.updatePresenceById(this.presenceDocForSelectedDate.id, this.loggedInUserDocData.associatedWorkerClientId, {
      startTimestamp: timeAddDate(
        moment(this.presenceForm.controls['date'].value).toDate(),
        this.presenceForm.controls['startTime'].value
      ),
      presenceDurationTotal: timeAsSeconds(this.totalTimeSpecified) ?? null,
      presenceDurationBreaks: timeAsSeconds(this.totalTimeBreaksSpecified) ?? null,
      presenceDurationTasks: timeAsSeconds(this.totalTimeTasksSpecified) ?? null,
    });
  }

  async updateEndTimeInPresence() {
    await this.firestoreService.updatePresenceById(this.presenceDocForSelectedDate.id, this.loggedInUserDocData.associatedWorkerClientId, {
      presenceEndTimestamp: timeAddDate(
        moment(this.presenceForm.controls['date'].value).tz(TIME_ZONE).toDate(),
        this.presenceForm.controls['endTime'].value
      ) ?? null,
      presenceDurationTotal: timeAsSeconds(this.totalTimeSpecified) ?? null,
      presenceDurationBreaks: timeAsSeconds(this.totalTimeBreaksSpecified) ?? null,
      presenceDurationTasks: timeAsSeconds(this.totalTimeTasksSpecified) ?? null,
    });
  }
}

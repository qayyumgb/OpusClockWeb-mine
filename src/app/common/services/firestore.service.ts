import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AuthService} from './auth.service';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import firebase from 'firebase/compat/app';
import {Timestamp} from 'firebase/firestore'
import * as moment from 'moment-timezone';
import {user} from '@angular/fire/auth';
import {TIME_ZONE} from '../helpers/time';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  clientWorker: any;

  constructor(private afs: AngularFirestore,
              private angularFireFunctions: AngularFireFunctions,
              private authService: AuthService,
              public http: HttpClient) {
    this.loadClientWorker();
  }

  async loadClientWorker() {
    this.authService.loggedInClientWorkerFromAuthService$.subscribe(clientWorker => {
      if (clientWorker) {
        this.clientWorker = clientWorker;
      }
    });
  }

  getWorkerByIdForClientId(workerId: string, clientId: string): Observable<any> {
    return this.afs.collection('clients').doc(clientId).collection('workers').doc(workerId).get();
  }

  getClientById(clientId: string): Observable<any> {
    return this.afs.collection('clients').doc(clientId).get();
  }

  getPresenceDocForDate(date: Date | null, workerId: string, clientId: string): Observable<any> {
    const fromMoment = Timestamp.fromDate(moment(date).startOf('day').toDate());
    const toMoment = Timestamp.fromDate(moment(date).endOf('day').toDate());
    return this.afs
      .collection('clients')
      .doc(clientId)
      .collection('presences', (ref) =>
        ref.where('workerId', '==', workerId)
          .where('startTimestamp', '>=', fromMoment).where('startTimestamp', '<', toMoment)
          .orderBy('startTimestamp', 'asc')
          .limit(1)
      ).valueChanges({idField: 'id'});
  }

  async deleteAllTaskRegnsForPresenceId(taskRegns: any[], presenceId: string): Promise<any> {
    for (const taskRegn of taskRegns) {
      if (taskRegn.id) {
        await this.afs
          .collection('clients').doc(this.clientWorker.client.id)
          .collection('presences').doc(presenceId)
          .collection('registrations').doc(taskRegn.id)
          .delete();
      }
    }
  }

  testDate() {
    this.afs.collection('workers').doc('00').update({
      testTs: moment().tz('Europe/Amsterdam').set('hours', 7).set('minutes', 0).toDate()
    })
  }

  addPresenceDoc(date: Date | null, userDocData: any, worker: any, startTime = '07:00', endTime = '16:00'): Promise<any> {
    let startTimes = startTime.split(':');
    let startHours = +startTimes[0];
    let startMinutes = +startTimes[1];
    let endTimes = endTime.split(':');
    let endHours = +endTimes[0];
    let endMinutes = +endTimes[1];
    return this.afs.collection('clients').doc(userDocData.associatedWorkerClientId).collection('presences').add({
      workerId: userDocData.associatedWorkerId,
      workerName: worker.name ?? '',
      workerGroupId: worker.workerGroupId ?? null,
      workerGroupName: worker.workerGroupName ?? null,
      deviceType: 'CLOCKWEB',
      locationId: null,
      locationName: null,
      isArchived: false,
      clientId: userDocData.associatedWorkerClientId,
      //clientName: this.clientWorker.client.name,
      startTimestamp: moment(date).tz(TIME_ZONE).set('hours', startHours).set('minutes', startMinutes).set('seconds', 0).toDate(),
      endTimestamp: moment(date).tz(TIME_ZONE).set('hours', endHours).set('minutes', endMinutes).set('seconds', 0).toDate(),
      date: date,
      createdByUserId: userDocData.id ?? null,
      createdByUserName: userDocData.name ?? null,
      creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      updatedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  getTasksForClockWeb(clientId: string): Observable<any> {
    return this.afs
      .collection('clients')
      .doc(clientId)
      .collection('tasks', (ref) =>
        ref.where('deviceTarget', 'array-contains', 'CLOCKWEB')
      ).valueChanges({idField: 'id'});
  }

  createTaskRegn(taskRegn: any, presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations')
      .add(taskRegn);
  }

  updateTaskInTaskRegn(taskRegnId: any, selectedOption: any, presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations')
      .doc(taskRegnId)
      .update({
        taskId: selectedOption.id,
        taskName: selectedOption.name,
        taskType: selectedOption.type,
        taskFunction: selectedOption.func,
        updatedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
  }

  markPresenceAsSaved(presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .update({
        saved: true,
        savedTimestamp: new Date()
      });
  }

  deleteTaskRegn(taskRegn: any, presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations')
      .doc(taskRegn.id)
      .delete();
  }

  createNUpdateTasksUnderPresence(tasksRegns: any[], presenceId: string): Promise<any> {
    let regnsCollectionRef = this.afs.firestore
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations');

    let batch = this.afs.firestore.batch();
    for (const taskRegn of tasksRegns) {
      if (taskRegn.id) { //updates
        batch.update(regnsCollectionRef.doc(taskRegn.id), taskRegn);
      } else { //creations
        delete taskRegn.id;
        batch.set(regnsCollectionRef.doc(), taskRegn);
      }
    }
    return batch.commit();
  }

  getAllTaskRegnsForPresence(presence: any): Observable<any> {
    return this.afs
      .collection('clients').doc(presence.clientId)
      .collection('presences').doc(presence.id)
      .collection('registrations', (ref) =>
        ref.orderBy('startTimestamp', 'asc')
      ).valueChanges({idField: 'id'});
  }

  getAllTaskRegnsStateChangesForPresence(presence: any, currentRegnIds: any[]): Observable<any> {
    return this.afs
      .collection('clients').doc(presence.clientId)
      .collection('presences').doc(presence.id)
      .collection('registrations', (ref) =>
        ref.orderBy('startTimestamp', 'asc')
      ).stateChanges().pipe(
        map(actions => {
          //console.log('actions:' + actions.map(ac => ac.type));

          return actions.filter(a => a.payload.doc.metadata.hasPendingWrites).map((a: any) => {
            //console.log('pending writes:' + JSON.stringify(a.payload.doc.metadata.hasPendingWrites));

            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return {
              id,
              changeType: a.type,
              ...data
            };
          });
        })
      );
  }

  async deleteAllTaskRegnsNPresence(taskRegns: any[], presence: any): Promise<any> {
    for (const taskRegn of taskRegns) {
      if (taskRegn.id) {
        await this.afs
          .collection('clients').doc(this.clientWorker.client.id)
          .collection('presences').doc(presence.id)
          .collection('registrations').doc(taskRegn.id)
          .delete();
      }
    }
    return await this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presence.id)
      .delete();
  }

  getAllLocationsForClientId(clientId: string): Observable<any> {
    return this.afs.collection('clients').doc(clientId).collection('locations').valueChanges({idField: 'id'});
  }

  updatePresenceById(presenceId: string, clientId: string, updateObject: any): Promise<any> {
    updateObject.updatedTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    return this.afs.collection('clients').doc(clientId).collection('presences').doc(presenceId).update(updateObject);
  }

  async updateLocationForAllTaskRegns(presenceId: string, clientId: string, updateObject: any, taskRegns: any[]): Promise<any> {
    updateObject.updatedTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    for (const taskRegn of taskRegns) {
      try {
        await this.afs.collection('clients').doc(clientId)
          .collection('presences').doc(presenceId)
          .collection('registrations').doc(taskRegn.id)
          .update(updateObject)
      } catch (error) {}//take no action as task could have been deleted before all tasks can be updated with new location
    }
    return this.afs.collection('clients').doc(clientId).collection('presences').doc(presenceId).update(updateObject);
  }
}

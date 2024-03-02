import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AuthService} from './auth.service';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import firebase from 'firebase/compat/app';
import {Timestamp} from 'firebase/firestore'
import * as moment from 'moment-timezone';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  clientWorker: any;
  workerLocation: any;

  constructor(private afs: AngularFirestore,
              private angularFireFunctions: AngularFireFunctions,
              private authService: AuthService,
              public http: HttpClient) {
    authService.loggedInClientWorkerFromAuthService$.subscribe(clientWorker => {
      if (clientWorker) {
        this.clientWorker = clientWorker;
        if (clientWorker.worker.locationIds && clientWorker.worker.locationIds.length > 0) {
          this.afs.collection('clients').doc(clientWorker.client.id)
            //Note - this assumption of using 1st location from array will be removed when location selection is added to ClockWeb
            .collection('locations').doc(this.clientWorker.worker.locationIds[0])
            .get().subscribe(locationDS => {
            this.workerLocation = {
              ...locationDS.data(),
              id: this.clientWorker.worker.locationIds[0]
            };
          });
        }
      }
    });
  }

  getPresenceDocForToday(workerId: string, clientId: string): Observable<any> {
    const fromMoment = Timestamp.fromDate(moment().startOf('day').toDate());
    const toMoment = Timestamp.fromDate(moment().endOf('day').toDate());
    return this.afs
      .collection('clients')
      .doc(clientId)
      .collection('presences', (ref) =>
        ref.where('workerId', '==', workerId)
          .where('startTimestamp', '>=', fromMoment).where('startTimestamp', '<=', toMoment)
      ).valueChanges({idField: 'id'});
  }

  async createPresenceDocForToday(userDocData: any): Promise<any> {
    return this.afs.collection('clients').doc(userDocData.associatedWorkerClientId).collection('presences').add({
      workerId: userDocData.associatedWorkerId,
      workerName: this.clientWorker.worker.name,
      deviceType: 'CLOCKWEB',
      locationId: this.workerLocation.id ?? null,
      locationName: this.workerLocation.name ?? null,
      isArchived: false,
      clientId: userDocData.associatedWorkerClientId,
      clientName: this.clientWorker.client.name,
      startTimestamp: new Date(),
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

  deleteTaskRegn(taskRegn: any, presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations')
      .doc(taskRegn.id)
      .delete();
  }

  async deleteAllTaskRegnsNPresence(taskRegns: any[], presence: any): Promise<any> {
    for (const taskRegn of taskRegns) {
      await this.afs
        .collection('clients').doc(this.clientWorker.client.id)
        .collection('presences').doc(presence.id)
        .collection('registrations').doc(taskRegn.id)
        .delete();
    }
    return await this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presence.id)
      .delete();
  }
}

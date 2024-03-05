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
    this.loadClientWorker();
  }

  async loadClientWorker() {
    this.authService.loggedInClientWorkerFromAuthService$.subscribe(clientWorker => {
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

  getPresenceDocForDate(date: Date | null, workerId: string, clientId: string): Observable<any> {
    const fromMoment = Timestamp.fromDate(moment(date).startOf('day').toDate());
    const toMoment = Timestamp.fromDate(moment(date).endOf('day').toDate());
    //Note - using creationTimestamp instead of startTimestamp in this query because when all regns are deleted onWriteRegn sets startTimestamp to null
    return this.afs
      .collection('clients')
      .doc(clientId)
      .collection('presences', (ref) =>
        ref.where('workerId', '==', workerId)
          .where('creationTimestamp', '>=', fromMoment).where('creationTimestamp', '<', toMoment)
          .orderBy('creationTimestamp', 'asc')
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

  async createPresenceDocForSelectedDate(date: Date | null, userDocData: any): Promise<any> {
    if (!this.clientWorker || !this.clientWorker.worker || !this.clientWorker.workerLocation) {
      this.authService.loggedInClientWorkerFromAuthService$.subscribe(clientWorker => {
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
              return this.addPresenceDoc(date, userDocData);
            });
          }
        }
      });
    } else {
      return this.addPresenceDoc(date, userDocData);
    }
  }

  addPresenceDoc(date: Date | null, userDocData: any): Promise<any> {
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
      date: date,
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

  updateTaskInTaskRegn(taskRegnId: any, selectedOption:any, presenceId: string): Promise<any> {
    return this.afs
      .collection('clients').doc(this.clientWorker.client.id)
      .collection('presences').doc(presenceId)
      .collection('registrations')
      .doc(taskRegnId)
      .update({
        taskId: selectedOption.id,
        taskName: selectedOption.name,
        taskType: selectedOption.type,
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
}

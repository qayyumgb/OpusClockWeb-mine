import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import firebase from 'firebase/compat/app';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';

import {BehaviorSubject, Observable, of, Subscription} from 'rxjs';
import {switchMap} from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  loggedInUserFromAuthService$: Observable<any>;
  loggedInClientWorkerFromAuthService$: BehaviorSubject<any> = new BehaviorSubject(null);
  isAnonymous: boolean;
  private loggedInUserFromAuthServiceSubscription: Subscription;
  private loggedInWorkerClientFromAuthSrvcSubscription: Subscription;
  private loggedInUserDocData: any;

  constructor(private afAuth: AngularFireAuth,
              private afs: AngularFirestore,
              private router: Router,
              private route: ActivatedRoute) {
    this.loggedInUserFromAuthService$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          this.isAnonymous = user.isAnonymous;
          this.fetchWorkerNClientInfo(user);
          return this.afs.doc<any>(`users/${user.uid}`).valueChanges({idField: 'id'});
        } else {
          return of(null);
        }
      })
    );
    this.loggedInUserFromAuthServiceSubscription = this.loggedInUserFromAuthService$.subscribe(userDocData => {
      this.loggedInUserDocData = userDocData;
      this.afs.doc(`clients/${userDocData.associatedWorkerClientId}`).get().subscribe(clientDS => {
        let clientDocData: any = clientDS.data();
        this.afs.doc(`clients/${userDocData.associatedWorkerClientId}/workers/${userDocData.associatedWorkerId}`).get().subscribe(workerDS => {
          let workerDocData: any = workerDS.data();
          this.loggedInClientWorkerFromAuthService$.next({
            client: {
              ...clientDocData,
              id: userDocData.associatedWorkerClientId
            },
            worker: {
              ...workerDocData,
              id: userDocData.associatedWorkerId
            }
          });
        });
      });
    });
  }

  fetchWorkerNClientInfo(user: any) {
  }

  // Users can have 3 roles - admin(type=client), manager(type=client), developer(type=developer)

  get isAuthenticated(): boolean {
    return this.loggedInUserFromAuthService$ !== null;
  }


  async emailPasswordSignIn(email: string, password: string) {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async resetPassword(email: string) {
    return this.afAuth.sendPasswordResetEmail(email)
  }

  async signOut() {
    this.afAuth.signOut().then(() => {

      console.log('signed out');
      this.router.navigate(['']);
    });
  }

}

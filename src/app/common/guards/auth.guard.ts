import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {FirestoreService} from '../services/firestore.service';
import {AuthService} from '../services/auth.service';
import {of, take, tap} from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService: AuthService = inject(AuthService)
  const router: Router = inject(Router);
  const firestoreService: FirestoreService = inject(FirestoreService);

  //return false;
  return authService.loggedInUserFromAuthService$.pipe(
    take(1),
    tap((isAuthenticated: boolean) => {
      if (!isAuthenticated) {
        router.navigate(['auth']);
      }
    }),
  );

}

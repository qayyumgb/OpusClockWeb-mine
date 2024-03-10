import {Component, EventEmitter, Output} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {Subscription} from 'rxjs';
import {AuthService} from '../../common/services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  public form: UntypedFormGroup = new UntypedFormGroup({
    email: new UntypedFormControl(''),
    password: new UntypedFormControl(''),
  });

  @Output() submitEM = new EventEmitter();
  loggedInUserFromAuthServcSubConstuctor: Subscription;
  loggedInUserFromAuthServiceSubscription: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loggedInUserFromAuthServcSubConstuctor = this.authService.loggedInUserFromAuthService$.subscribe((userRecord) => {
      //console.log(JSON.stringify(userRecord))
      if (userRecord && userRecord.associatedWorkerId) {
        this.router.navigate([`time-registration`]);
      } else if(userRecord) {
        this.snackBar.open('This user is not authorized to access Clock Web App as it is not associated with a worker', '', {
          duration: 6000,
          panelClass: ['snackbar-error'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
        this.authService.signOut();
      }
    });
  }

  ngOnInit(): void {
  }

  async loginUser() {
    if (this.form.valid) {
      this.submitEM.emit(this.form.value);
    }

    if (!this.form.value?.email?.trim() || !this.form.value?.password?.trim()) {
      this.snackBar.open('Please enter both email and password!', '', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }

    try {
      await this.authService.emailPasswordSignIn(
        this.form.value.email,
        this.form.value.password
      );
      this.loggedInUserFromAuthServiceSubscription = this.authService.loggedInUserFromAuthService$.subscribe((userRecord) => {
        console.log(JSON.stringify(userRecord))
        if (userRecord && userRecord.associatedWorkerId) {
          this.router.navigate([`time-registration`]);
        } else if(userRecord) {
          this.snackBar.open('This user is not authorized to access Clock Web App as it is not associated with a worker', '', {
            duration: 6000,
            panelClass: ['snackbar-error'],
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.authService.signOut();
        }
      });
    } catch (error: any) {
      let errorMessage;
      if (error?.code === 'auth/invalid-email') {
        errorMessage = `Please pass a valid email value`;
      } else {
        errorMessage = 'Incorrect login credentials entered!';
      }
      this.snackBar.open(errorMessage, '', {
        duration: 6000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  async initiatePasswordRecovery($event: Event) {
    $event?.stopPropagation();
    $event?.preventDefault();
    const formValue = this.form.value;
    if (!formValue.email) {
      this.snackBar.open('Email needs to be filled-in to initiate password recovery', '', {
        duration: 6000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }
    const email = formValue.email.trim();
    try {
      await this.authService.resetPassword(email);
    } catch (error: any) {
      let errorMessage = `An error occurred while resetting password for ${email}. Please try again!`;
      if (error?.code === 'auth/user-not-found') {
        errorMessage = `Email '${email}' not found`;
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = `Please pass a valid email value`;
      }
      this.snackBar.open(errorMessage, '', {
        duration: 6000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }
    this.snackBar.open(`Password reset email sent to ${email}`, '', {
      duration: 5000,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  ngOnDestroy(): void {
    this.loggedInUserFromAuthServiceSubscription?.unsubscribe();
    this.loggedInUserFromAuthServcSubConstuctor?.unsubscribe();
  }
}


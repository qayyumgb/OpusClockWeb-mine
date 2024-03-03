import { Component, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild('installDesktopApp') installDesktopApp : any;
  title = 'opus-clock-web';
  checked = false;
  showInstallAppAwareness: boolean = false;
  currentPath: string;

  constructor(private snackBar: MatSnackBar, private router: Router) {

  }

  ngOnInit() {

    this.router.events.subscribe((val) => {
      this.currentPath = this.router.url;
    });

    if(window.innerWidth > 992){
      const remindMeLater = localStorage.getItem('remindMeLater');
      if (remindMeLater !== null) {
        localStorage.removeItem('remindMeLater');
      } else {
        this.showInstallAppAwareness = true;
        setTimeout(() => {
          this.showInstallDesktopDialog();
        }, 1000);
      }
    }
  }

  showInstallDesktopDialog(){
    this.snackBar.openFromTemplate(this.installDesktopApp, {
      verticalPosition: "top",
      horizontalPosition: "right",
      panelClass: ["app-install-desktop"]
    });
  }

  closeInstallDesktopDialog(){
    this.snackBar.dismiss();
    this.showInstallAppAwareness = false;
  }

  remindMeLater() {
    setTimeout(() => {
      this.snackBar.dismiss();
    }, 500);
    localStorage.setItem('remindMeLater', 'true');
  }
}

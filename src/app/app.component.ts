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
  currentPath: string;
  deferredPrompt: any;
  isAppInstalled: boolean = false;

  constructor(private snackBar: MatSnackBar, private router: Router) {

  }

  ngOnInit() {

    this.router.events.subscribe((val) => {
      this.currentPath = this.router.url;
    });

    const remindMeLater = localStorage.getItem('remindMeLater');
    if (remindMeLater !== null) {
      localStorage.removeItem('remindMeLater');
    } 
    else {
      setTimeout(() => {
        this.showInstallDesktopDialog();
      }, 1000);
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
    });
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
  }

  remindMeLater() {
    setTimeout(() => {
      this.snackBar.dismiss();
    }, 500);
    localStorage.setItem('remindMeLater', 'true');
  }

  installDesktop(){
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.isAppInstalled = true;
          this.snackBar.dismiss();
        } else {
          this.isAppInstalled = false;
        }
        this.deferredPrompt = null;
      });
    }
  }
  
}

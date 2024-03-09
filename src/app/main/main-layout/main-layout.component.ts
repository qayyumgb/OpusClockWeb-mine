import { Component, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { DataSharingService } from 'src/app/services/data-sharing.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {

  @ViewChild('installDesktopApp') installDesktopApp : any;
  checked = false;
  deferredPrompt: any;
  isAppInstalled: boolean = false;

  constructor(private snackBar: MatSnackBar, private dataSharingService: DataSharingService) {

  }

  ngOnInit() {

    const remindMeLater = localStorage.getItem('remindMeLater');
    if (remindMeLater !== null) {
      localStorage.removeItem('remindMeLater');
    } 
    else {
      if(!this.isAppInstalled){
        setTimeout(() => {
          this.showInstallDesktopDialog();
        }, 1000);
      }
    }
    this.deferredPrompt = this.dataSharingService.getData()
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

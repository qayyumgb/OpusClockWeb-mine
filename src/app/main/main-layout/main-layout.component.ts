import { Component, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/common/services/auth.service';
import { DataSharingService } from 'src/app/common/services/data-sharing.service';

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
  userId:any
  showInstallAppAwareness:boolean

  constructor(private snackBar: MatSnackBar, private dataSharingService: DataSharingService, private authService: AuthService) {
     
  }

  async getUserId(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.authService.loggedInUserFromAuthService$.subscribe((userDocData: any) => {
        this.userId = userDocData.id;
        this.showInstallAppAwareness = this.getRememberedItem(`remembered_${this.userId}`);
        resolve();
      }, (error) => {
        // Handle error if necessary
        reject(error);
      });
    });
  }

  async ngOnInit() {
    await this.getUserId()
    this.checked = this.showInstallAppAwareness
    this.isAppInstalled = true
    if( this.showInstallAppAwareness !== null){
      this.isAppInstalled = this.showInstallAppAwareness
    }
    
    await console.log('this.showInstallAppAwareness',this.showInstallAppAwareness)
    this.deferredPrompt = this.dataSharingService.getData()
    if(this.deferredPrompt){
      setTimeout(() => {
        this.showInstallDesktopDialog();
      }, 1000);
    }
   
  }
  onRememberMeChange(checked: any): void {
    this.showInstallAppAwareness = checked.target.checked
    const userId = this.userId; // Replace 'yourUserId' with the actual user ID
    this.setRememberedItem(`remembered_${userId}`, this.showInstallAppAwareness);
    
  }

  setRememberedItem(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getRememberedItem(key: string): any {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
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
    // if(this.showInstallAppAwareness)
    if(this.showInstallAppAwareness !== null)
    this.setRememberedItem(`remembered_${this.userId}`, this.showInstallAppAwareness);
  else
  this.setRememberedItem(`remembered_${this.userId}`, false);
  }

  installDesktop(){
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.isAppInstalled = false;
          this.snackBar.dismiss();
        } else {
          this.isAppInstalled = true;
        }
        this.deferredPrompt = null;
      });
    }
  }

}

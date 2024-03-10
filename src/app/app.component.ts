import { Component, ViewChild } from '@angular/core';
import { DataSharingService } from './common/services/data-sharing.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'opus-clock-web';
  checked = false;
  currentPath: string;
  deferredPrompt: any;
  isAppInstalled: boolean = false;

  constructor(private dataSharingService: DataSharingService) {

  }

  ngOnInit() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.dataSharingService.setData(this.deferredPrompt);
    });

  }
  
}

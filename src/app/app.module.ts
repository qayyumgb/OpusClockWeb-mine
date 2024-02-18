import {APP_INITIALIZER, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {AngularFireModule} from '@angular/fire/compat';
import {AngularFirestoreModule} from '@angular/fire/compat/firestore';
import {AngularFireStorageModule} from '@angular/fire/compat/storage';
import {AngularFireAuth, AngularFireAuthModule} from '@angular/fire/compat/auth';
import {environment} from "../environments/environment.development";
import { NavbarComponent } from './common/components/navbar/navbar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule} from '@angular/material/button';
import {MatBadgeModule} from '@angular/material/badge';
import { ReactiveFormsModule } from '@angular/forms';
import { SideNavbarComponent } from './common/components/side-navbar/side-navbar.component';



export function initializeApp(afAuth: AngularFireAuth): () => Promise<null> {
  return () => {
    return new Promise((resolve) => {
        return resolve(null);
    });
  };
}

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    SideNavbarComponent,
  ],
  imports: [
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule
    
  ],
  providers: [{
    provide: APP_INITIALIZER,
    multi: true,
    deps: [AngularFireAuth],
    useFactory: initializeApp
  },],
  bootstrap: [AppComponent]
})
export class AppModule { }

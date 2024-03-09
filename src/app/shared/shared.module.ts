import { MatTooltipModule } from '@angular/material/tooltip';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MatTabsModule} from '@angular/material/tabs';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatDialogModule} from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';



const MODULES = [
  ReactiveFormsModule,
  MatToolbarModule,
  CommonModule,
  MatCardModule,
  MatFormFieldModule,
  MatSelectModule,
  FormsModule,
  MatTabsModule,
  MatMenuModule,
  MatIconModule,
  MatButtonModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatAutocompleteModule,
  MatDialogModule,
  MatInputModule,
  DragDropModule,
  MatCheckboxModule,
  MatSnackBarModule,
  MatTooltipModule
  
]

@NgModule({
  declarations: [],

  providers: [  
    MatDatepickerModule,
  ],

  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  
  imports: [...MODULES],
  exports: [...MODULES],
})
export class SharedModule { }

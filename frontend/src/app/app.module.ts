import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {HttpClient, HttpClientModule, HttpHandler} from "@angular/common/http";
import { PyspelComponent } from './pyspel/pyspel.component';
import { EditorComponent } from './editor/editor.component';
import { AngularSplitModule } from 'angular-split';
import { TerminalComponent } from './terminal/terminal.component';
import { AtomComponent } from './atom/atom.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FieldComponent } from './field/field.component';
import { CommandComponent } from './command/command.component';
import { AppRoutingModule } from './app-routing.module';
import { MainComponent } from './main.component';
@NgModule({
  imports: [
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    HttpClientModule,
    AngularSplitModule,
    AppRoutingModule
  ],
  declarations: [
    MainComponent,
    PyspelComponent,
    EditorComponent,
    EditorComponent,
    TerminalComponent,
    AtomComponent,
    FieldComponent,
    CommandComponent
  ],
  bootstrap: [MainComponent],
})
export class AppModule {}

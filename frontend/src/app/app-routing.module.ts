import { NgModule } from '@angular/core';
import { RouterModule,Routes } from '@angular/router';
import { PyspelComponent } from './pyspel/pyspel.component';



const routes: Routes = [
  { path: 'editor/:userid', component: PyspelComponent },
  { path: 'editor', component: PyspelComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

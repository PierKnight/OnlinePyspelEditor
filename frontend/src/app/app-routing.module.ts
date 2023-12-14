import { NgModule } from '@angular/core';
import { RouterModule,Routes } from '@angular/router';
import { PyspelComponent } from './pyspel/pyspel.component';
import { AboutComponent } from './about/about.component';



const routes: Routes = [
  { path: 'editor/:userid', component: PyspelComponent },
  { path: 'editor', component: PyspelComponent },
  { path: 'about', component: AboutComponent},
  { path: '', redirectTo: "/editor" ,pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

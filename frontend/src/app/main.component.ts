import { Component } from '@angular/core';
import { ApptoastService } from './service/toast/apptoast.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {

  constructor(public toastService: ApptoastService)
  {
    
  }

}

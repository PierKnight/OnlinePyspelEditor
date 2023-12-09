import { Component } from '@angular/core';
import { ApptoastService } from './service/toast/apptoast.service';
import { SettingsService } from './service/settings/settings.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {

  constructor(public toastService: ApptoastService, public settingsService: SettingsService)
  {
    settingsService.mode.subscribe(mode => {
      const node = document.createAttribute("data-bs-theme");
      node.value = mode
      document.body.attributes.setNamedItem(node)
    })
  }

}

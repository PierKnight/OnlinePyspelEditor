import { Component, Input } from '@angular/core';
import { ApptoastService } from '../service/toast/apptoast.service';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent {

  log : string = "";


  constructor(private toastService: ApptoastService)
  {

  }


  clear()
  {
    this.log = ""
  }


  appendString(string: string)
  {
    this.log += string
  }

  copyToClipboard()
  {
    navigator.clipboard.writeText(this.log);
    this.toastService.success("Copied terminal content in clipboard")
  }
}

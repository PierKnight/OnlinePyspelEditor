import { AfterViewChecked, Component, DoCheck, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ApptoastService } from '../service/toast/apptoast.service';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent implements AfterViewChecked   {


  @Output() onLogUpdate = new EventEmitter<void>();

  log : string = "";
  preLog?: string;


  constructor(private toastService: ApptoastService)
  {

  }
  ngAfterViewChecked(): void {
    if(this.log != this.preLog)
    {
      this.onLogUpdate.emit()
      this.preLog = this.log
    }
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

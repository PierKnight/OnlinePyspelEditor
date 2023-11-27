import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css']
})
export class TerminalComponent {

  @Input() strings : string = "";



  clearTerminal()
  {
    this.strings = ""
  }


  copyToClipboard()
  {
    navigator.clipboard.writeText(this.strings);
  }
}

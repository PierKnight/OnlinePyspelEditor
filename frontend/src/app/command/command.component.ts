import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PipCommand, PipRequest } from '../model/model';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-command',
  templateUrl: './command.component.html',
  styleUrls: ['./command.component.css']
})
export class CommandComponent {


  pipCommandArgs = new FormControl("")

  @Input()  pipRequest!: PipRequest;
  @Output() pipRequestChange = new EventEmitter<PipRequest>();


  getPipCommands(): PipCommand[]
  {
    return Object.values(PipCommand)
  }

  selectPipCommand(pipCommand: PipCommand)
  {
    this.pipRequest.command = pipCommand
    if(pipCommand === PipCommand.FREEZE)
      this.pipCommandArgs.disable()
    else
      this.pipCommandArgs.enable()
  }

  selectPipArgument(pipArgs: string)
  {
    this.pipRequest.args = [pipArgs]
  }

}

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


  e : string = ""

  @Input()  pipRequest!: PipRequest;
  @Output() pipRequestChange = new EventEmitter<PipRequest>();


  getPipCommands(): PipCommand[]
  {
    return Object.values(PipCommand)
  }

  selectPipCommand(pipCommand: PipCommand)
  {
    this.pipRequest.command = pipCommand
  }

  selectPipArgument(pipArgs: string)
  {
    this.pipRequest.args = [pipArgs]
  }

  areArgsDisabled() : boolean
  {
    return this.pipRequest.command === PipCommand.FREEZE
  }

}

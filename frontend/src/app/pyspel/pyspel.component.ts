import {Component, Host, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SocketService} from "../service/code/socket.service";
import { EditorComponent } from '../editor/editor.component';
import { Atom, BaseAtom } from '../service/completions';
import { PipCommand, PipRequest, SandboxInfo } from '../model/model';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { SettingsService } from '../service/settings/settings.service';
import { editorThemes } from '../service/settings/settings.service';

@Component({
  providers: [SocketService],
  selector: 'app-pyspel',
  templateUrl: './pyspel.component.html',
  styleUrls: ['./pyspel.component.css']
})
export class PyspelComponent implements OnInit {




  //the available editor themes sorted by letter
  public editorThemes = Array.from(editorThemes.keys()).sort()
  public showAtoms = true;
  public showOutput = true


  log: string = ""

  @ViewChild("editorElement") editorComponent !: EditorComponent;

  isRunning: Boolean = false;
  atomSearch = ""
  pipRequest: PipRequest = {args: [],command: PipCommand.INSTALL}

  sandboxInfo?: SandboxInfo

  sandboxEmail?: string

  constructor(private offcanvasService: NgbOffcanvas,@Host() public socketService: SocketService,private _location: Location,public router : Router,public route: ActivatedRoute, public settingsService: SettingsService) {
    this.socketService.stoutFromSocket.subscribe(data => {
      this.log += `${data}`
    })

    this.socketService.sandboxInfo.subscribe(data => {
      this._location.replaceState(`/editor/${data.userId}`)
      this.sandboxInfo = data
      this.sandboxEmail = this.sandboxInfo.persistanceInfo?.email
    })
    this.showOutput = (localStorage.getItem("showOutput") || "1") === "1"
    this.showAtoms = (localStorage.getItem("showAtoms") || "1") === "1"

  }
  ngOnInit(): void {

  }


  toggleAtoms()
  {
    this.showAtoms = !this.showAtoms
    localStorage.setItem("showAtoms", this.showAtoms ? "1" : "0")
  }

  toggleOutput()
  {
    this.showOutput = !this.showOutput
    localStorage.setItem("showOutput", this.showOutput ? "1" : "0")
  }
  addNewAtom() {
    this.editorComponent.addNewAtom()
  }

  runCode()
  {
    if(!this.editorComponent.editor) return;
    const sourceCode = this.editorComponent.editor.state.doc.toString();
    if(this.socketService.runJob<any>("codeRequest", {sourceCode: sourceCode},(res) => {}))
    {
      this.log = ""
      this.showOutput = true
    }
  }

  runPip()
  {
    if(!this.editorComponent.editor) return;
    this.offcanvasService.dismiss()
    this.socketService.runJob<PipRequest>("pipRequest", this.pipRequest,(res) => {
      //if(res.code != 0)
      //  this.log = res.message
    })

    this.log = ""
    this.showOutput = true

  }

  stopCode()
  {
    this.socketService.stopProcess()
  }

  trackByMethod(index:number, el:Atom)
  {
    return index
  }


  makePersistent()
  {
    if(!this.sandboxEmail) return;
    this.socketService.makePersistent(this.sandboxEmail)
  }

  getFilteredAtoms(atoms?: Atom[]) : Atom[] | undefined
  {
    if(this.atomSearch.length === 0)
      return atoms
    const regexp = new RegExp(this.atomSearch,"i")
    return this.editorComponent.currentAtoms.filter(atom => regexp.test(atom.name as string))

  }

  open(content: any) {
		this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title' }).result.then(
			(result) => {
				//this.closeResult = `Closed with: ${result}`;
			},
			(reason) => {
				//this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
			},
		);
	}


  updateTabSize(value: string)
  {
    const tabSize = Number.parseInt(value)
    this.settingsService.updateSize(tabSize)
  }




}

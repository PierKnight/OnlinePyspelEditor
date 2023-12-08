import { Injectable, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import {io, Socket} from "socket.io-client";
import { CodeDiagnostic, CodePosition, RequestResponse, SandboxInfo, SandboxStatus } from 'src/app/model/model';
import { ApptoastService } from '../toast/apptoast.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnInit {


  private _stoutFromSocket: Subject<string> = new Subject<string>()
  stoutFromSocket = this._stoutFromSocket.asObservable()
  private isRunningTask = false
  private isStoppingTask = false

  private _sandboxInfo: Subject<SandboxInfo> = new Subject<SandboxInfo>()
  sandboxInfo = this._sandboxInfo.asObservable()


  private _sandboxCode: Subject<string> = new Subject<string>()
  sandboxCode = this._sandboxCode.asObservable()

  private _codeDiagnostics: Subject<CodeDiagnostic[]> = new Subject<CodeDiagnostic[]>()
  codeDiagnostics = this._codeDiagnostics.asObservable()


  private socket : Socket
  constructor(public toastService: ApptoastService,public route: ActivatedRoute) {

    const userid = route.snapshot.params['userid']
    const extraHeader = userid ? {userid: userid} : undefined
    this.socket = io("ws://Localhost:5000",{
      extraHeaders: extraHeader,
      autoConnect: false
    }).connect();


    this.socket.on("connect_error",error => {
      this.toastService.error("Failed sandbox connection, refresh page")
    })


    this.socket.on("stout",(data) => {
      this._stoutFromSocket.next(data)
    })

    this.socket.on("codeDiagnostics",(diagnostics) => {
      console.log(diagnostics)
      this._codeDiagnostics.next(diagnostics)
    })

    this.socket.once("sandboxStatus",(status: SandboxStatus) => {
      this._sandboxInfo.next(status.sandboxInfo)
      this._sandboxCode.next(status.code)

    })


  }
  ngOnInit(): void {

  }

  runJob<T>(event: JobType, request: T, onResponse: (response: any) => void) : boolean
  {
    if(this.isRunningTask) return false

    this.isRunningTask = true
    this.socket.emit(event, request, (response : any) => {
      this.isRunningTask = false;
      onResponse(response)
    })
    return true
  }

  stopProcess() : boolean
  {

    this.isStoppingTask = true
    this.socket.emit("killJob","", (response : any) => {
      this.isStoppingTask = false
    })
    return true
  }

  get connected(): boolean
  {
    return this.socket.connected
  }

  makePersistent(email: string)
  {

    this.socket.emit("makePersistent", email,(resp: RequestResponse<SandboxInfo>) => {
      this._sandboxInfo.next(resp.info)
      if(resp.isError)
        this.toastService.error("Failed sandbox persistance operation")
      else
        this.toastService.success("Updated Sandbox Persistence")
    })
  }

  makeTemporary()
  {
    this.socket.emit("makeTemporary","",(resp: RequestResponse<SandboxInfo>) => {
      this._sandboxInfo.next(resp.info)
      if(resp.isError)
        this.toastService.error("Failed sandbox persistance operation")
      else
        this.toastService.success("Your sandbox is now temporary")
    })
  }

  sendEditorCode(code: CodePosition)
  {
    this.socket.emit("sendCode",code, () => {})
  }


  get isTaskRunning() : boolean
  {
    return this.isRunningTask
  }
  get isTaskStopping() : boolean
  {
    return this.isStoppingTask
  }
}

export type JobType = 'codeRequest' | 'pipRequest';

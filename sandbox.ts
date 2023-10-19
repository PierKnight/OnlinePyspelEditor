import {ChildProcessWithoutNullStreams, exec,execSync,spawn} from "child_process"
import fs from "fs-extra"
import { randomBytes } from "crypto"
import { UserSocket } from "./socket"
import treeKill from "tree-kill"


const sanBoxes = new Map()
const isolatePath = "/isolate"


export function init()
{
  console.log("Sandbox Cleanup")
  fs.emptyDirSync(isolatePath)
}

function generateRandomId() : string
{
  const bytes = randomBytes(64)
  const token = bytes.toString('hex');
  return token;
}

export function initSandbox(
  socket: UserSocket,
  onComplete : (sandbox: Sandbox) => void,
  pyrightData : (json: string) => void)
{
  const userId = generateRandomId()
  exec(`isolate --share-net --cg -p -b ${sanBoxes.size} --init`, (error, out, sterr) => {
    if (error == null) {
      
      const sandbox = new Sandbox(sanBoxes.size, userId,pyrightData)
      onComplete(sandbox)
      sanBoxes.set(userId, sanBoxes.size)
      
    }
  })
}
 function executeProcess(
  command: string,
  sendData: (data: string) => void,
  onStop: (code: number) => void = () => {},
  args : ReadonlyArray<string> = [""],
  ) : ChildProcessWithoutNullStreams
{
  const runCode = spawn(command,args,{shell: true,detached: true});
  runCode.stdout.on('data', (data) => { sendData(data.toString()) });
  runCode.stderr.on('data', (data) => { sendData(data.toString()) });
  runCode.on("close", (code) => {
    onStop(code!)
  })
  return runCode 
}


export function runSandboxCode(sandbox : Sandbox, sourceCode : string,stdout: (data: string) => void,stop: (code?: number) => void) : ChildProcessWithoutNullStreams
{
  console.log(sourceCode)
  fs.writeFileSync(`${isolatePath}/${sandbox.id}/box/main.py`,sourceCode)
  return executeProcess(`isolate -b ${sandbox.id} --cg --dir=/etc --share-net -p --run -- /bin/python3 -u main.py`,stdout,stop)
}

export function runPipCommand(sandbox : Sandbox,command: string, args: string[],stdout: (data: string) => void,stop: (code?: number) => void) : ChildProcessWithoutNullStreams
{

  if(args[0] === "uninstall")
    args.push("-y")

  return executeProcess(`isolate -b ${sandbox.id} --cg --dir=/etc --share-net -p --run -- /usr/bin/pip`, stdout,stop,[...args])
}


/**
 * removes the Sandbox file permanently
 * @param {Sandbox} sandbox  
 */
export function destroySandBox(sandbox: Sandbox)
{
  sandbox.destroy();
  fs.removeSync(`${isolatePath}/${sandbox.id}`);
  console.log(`Removed sandbox ${isolatePath}/${sandbox.id}`)
  sanBoxes.delete(sandbox.userId)
}


export interface Job 
{
  run: (end: () => void) => void,
  kill: () => boolean
}

export class ProcessJob implements Job
{
  process ?: ChildProcessWithoutNullStreams
  private provider: () => ChildProcessWithoutNullStreams 

  constructor(processProvider: () => ChildProcessWithoutNullStreams)
  {
    this.provider = processProvider
  }
  run(end: () => void)
  {
    this.process = this.provider()
    this.process.on("close", (code) => {
      end()
    })
    console.log(this.process.pid)
  }
  kill() : boolean{

    if(!this.process)
      return false;
    if(this.process.pid)
    {
      const e = execSync(`pkill -P ${this.process.pid}`)
      return e.toString().length == 0;
    }
    return true;
  }
  
}

export class Sandbox {
  userId: string
  id: number
  private currentJob?: Job 
  private pyrightProcess: ChildProcessWithoutNullStreams

  constructor(id : number,userId : string, pyright: (data: string) => void)
  {
    this.userId = userId
    this.id = id
    this.pyrightProcess = executeProcess(`pyright --watch --outputjson /isolate/${this.id}/`,pyright)
  }




  scheduleJob(job : Job) : boolean
  {
    console.log(`Scheduling Job of of user ${this.userId}`);  
    if(this.currentJob)
    {
      return false;
    }

    this.currentJob = job;
    job.run(() => {this.currentJob = undefined})
    return true
  }

  killJob() : boolean
  {
    if(!this.currentJob)
    {
      return false;
    }
    const killed = this.currentJob.kill()
    if(killed)
      this.currentJob = undefined
    return killed
  }


  destroy()
  {

    console.log(`Destroy sandbox ${this.pyrightProcess?.pid}`)
    this.killJob()
    if(this.pyrightProcess.pid)
      treeKill(this.pyrightProcess?.pid)
  }
}
import {ChildProcessWithoutNullStreams, execSync,spawn} from "child_process"
import fs from "fs-extra"
import { randomBytes } from "crypto"
import treeKill from "tree-kill"
import { CodePosition, PipCommand, PipRequest, SandboxInfo } from "../model"
import * as database from "./database"
import process from "process"
import moment from "moment"
import { ISOLATE_PATH, MAX_CPU_TIME_LIMIT, MAX_MAX_PROCESSES_AND_OR_THREADS, MAX_MEM, MAX_STACK_LIMIT, PYRIGHT_PATH, PYTHON_PATH } from "./config"



const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
fs.mkdir(ISOLATE_PATH, {recursive: true}, (error) => {console.log(`${ISOLATE_PATH} folder not created`)})
const sessions = new Map<string,SandboxSession>()

export function init()
{
  console.log("Sandbox Cleanup")
  database.cleanupTemporarySandboxes()
}

function generateRandomId() : string
{
  const bytes = randomBytes(32)
  const token = bytes.toString('hex');
  return token;
}

async function getNewSandboxId()
{
  let sandboxId;
  do
    sandboxId = Math.floor(Math.random() * 2147483648)

  while(await database.getBySandboxId(sandboxId) != null)
  return sandboxId
}

function getSandboxMainScript(sandbox: SandboxInfo): string
{
  return `${ISOLATE_PATH}/${sandbox.sandboxId}/box/main.py`
}

/**
 * Creates a new sandbox session 
 * @param pyrightData callback that returns diagnostic of the main script file inside the sandbox
 * @param userId the sandbox id
 * @returns the new sandbox session 
 */
export async function initSandbox(
  pyrightData : (json: string) => void,
  userId: string) : Promise<{session: SandboxSession, currenctCode: string}>
{
  let sandboxInfo : SandboxInfo = {sandboxId: 0,userId: userId}

  try
  {
    const info = await database.getPersistentSandbox(userId)
    sandboxInfo = info
    
  }
  catch
  {
    console.log("GENERATE NEW USER")
    sandboxInfo.userId = generateRandomId()
    sandboxInfo.sandboxId = await getNewSandboxId()
    try
    {
      await database.insert({
        id: sandboxInfo.userId,
        sandboxId: sandboxInfo.sandboxId
      })
      execSync(`isolate --share-net --cg -p -b ${sandboxInfo.sandboxId} --init`)
    }
    catch(error)
    {
      console.log(error)
    }
  }

  let currentCode = ""
  try 
  {
    currentCode = fs.readFileSync(getSandboxMainScript(sandboxInfo)).toString()
  }
  catch(error)
  {}
  const session = new SandboxSession(sandboxInfo,pyrightData,"")
  return {session: session,currenctCode: currentCode}
}

/**
 * Generic method to run a process
 * @param command the command to run
 * @param sendData callback to receive stout and sterr data
 * @param onStop callback when the process is stopped
 * @param args optional command arguments
 * @returns 
 */
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

/**
 * Runs source code inside the sandbox
 * @param sandbox the sandbox session
 * @param sourceCode The source code to process
 * @param stdout Stout and Sterr given by the code process
 * @param stop called when the process stops for whatever reason
 * @returns info about the current sandbox
 */
export function runSandboxCode(sandbox : SandboxSession, sourceCode : string,stdout: (data: string) => void,stop: (code?: number) => void) : ChildProcessWithoutNullStreams
{
  sandbox.writeToFile()
  return executeProcess(`isolate -E HOME=\"/box\" -E PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\" 
  -p ${MAX_MAX_PROCESSES_AND_OR_THREADS}
  -m ${MAX_MEM}
  -k ${MAX_STACK_LIMIT}
  -t ${MAX_CPU_TIME_LIMIT}
  -b ${sandbox.info.sandboxId} --cg --dir=/etc --share-net -p --run -- ${PYTHON_PATH} -u main.py`,stdout,stop)
}

/**
 * Runs a pip command inside the sandbox
 * @param sandbox the sandbox session
 * @param stdout Stout and Sterr given by the pip process
 * @param stop called when the process stops for whatever reason
 * @returns info about the current sandbox
 */
export function runPipCommand(sandbox : SandboxSession,pipRequest: PipRequest,stdout: (data: string) => void,stop: (code?: number) => void) : ChildProcessWithoutNullStreams
{
  const confirmAttribute = pipRequest.command === PipCommand.UNINSTALL ? "-y" : ""
  return executeProcess(`isolate -E HOME=\"/box\" -E PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\" -b ${sandbox.info.sandboxId} --cg --dir=/etc --share-net -p --run -- pip`, stdout,stop,[pipRequest.command.toString(),confirmAttribute, ...pipRequest.args])
}


/**
 * Makes this sandbox persistent by setting expirations about notifications and the sandbox itself
 * @param sandbox the sandbox session
 * @param userEmail the email used to notify the user on creation,destruction of this sandbox
 * @returns info about the current sandbox
 */
export async function makeSandboxPersistent(sandbox: SandboxSession,userEmail: string) : Promise<SandboxInfo>
{

  console.log(userEmail)
  if(userEmail && !emailRegex.test(userEmail))
        throw new Error("Invalid Email")
  
  const now = moment()
  const expiration = now.add(48,"hours")
  const totalNotifications = Number.parseInt(process.env.NOTIFICATIONS_NUM || "2")
  const notifications : Date[] = []
  for(let i = 1;i <= totalNotifications ;i++)
  {
    notifications.push(now.add((48 / (totalNotifications + 1)) * i,"hours").toDate())
  }

  console.log(now.toDate()) 
  console.log(expiration.toDate())
  const outputSandbox = await database.makeSandboxPersistent(sandbox.info.userId,userEmail,expiration.toDate(), notifications)
  const sandboxInfo = {
    sandboxId: outputSandbox.sandboxId,
    userId: outputSandbox.id, persistanceInfo: {
    email: userEmail,
    expiration: expiration.toDate()
  }}
  sandbox.info = sandboxInfo
  return sandboxInfo
}
/**
 * Removes the persistent info regarding this sandbox
 * @param sandbox the sandbox session
 * @returns info about the current sandbox
 */
export async function makeSandboxTemporary(sandbox: SandboxSession) : Promise<SandboxInfo>
{
  const outputSandbox = await database.makeSandboxTemporary(sandbox.info.userId)
  const sandboxInfo = {
    sandboxId: outputSandbox.sandboxId,
    userId: outputSandbox.id
  }
  sandbox.info = sandboxInfo
  return sandboxInfo
}

/**
 * Updates the sandbox code inside the sandbox folder
 * In this way you don't send the code at every character typing
 * @param code the code submitted by the sandbox user
 */
export async function handleNewSandboxCode(sandbox: SandboxSession,code: CodePosition)
{
  const startCode = sandbox.code.slice(0,code.from)
  const endCode = sandbox.code.slice(code.to)
  const result = startCode + code.value + endCode
  sandbox.code = result
  sandbox.resetCodeWriting()
  
}

/**
 * removes the Sandbox file permanently if temporary 
 * stops sandbox processes suck as jobs and the static code checker
 * @param {SandboxSession} sandbox  
 */
export function destroySandBox(sandbox: SandboxSession)
{
 
  if(!sandbox.info.persistanceInfo)
    database.remove(sandbox.info.userId, (removedSandbox) => {
        if(removedSandbox)
        {
          sessions.delete(sandbox.info.userId)
          sandbox.destroy();
          fs.removeSync(`${ISOLATE_PATH}/${sandbox.info.sandboxId}`);
          console.log(`Removed sandbox ${ISOLATE_PATH}/${sandbox.info.sandboxId}`)
        }
    });
  else
  {
    sandbox.destroy();
  }
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

export class SandboxSession {
  info: SandboxInfo
  private currentJob?: Job 
  private pyrightProcess?: ChildProcessWithoutNullStreams
  code: string

  codeWritingJob?: any

  pyrightFunction: any

  constructor(info: SandboxInfo, pyright: (data: string) => void, code: string)
  {
    this.info = info
    //this.pyrightProcess = executeProcess(`pyright --watch --outputjson /isolate/${this.info.sandboxId}/`,pyright)
    this.code = code
    this.pyrightFunction = pyright
    
  }

  resetCodeWriting()
  {
    clearTimeout(this.codeWritingJob)
    this.codeWritingJob = setTimeout(() => {
      this.writeToFile()
    },300)
  }

  writeToFile()
  {
    console.log(`WRITING TO FILE ${this.code}` )
    fs.writeFileSync(getSandboxMainScript(this.info),this.code)

    if(this.pyrightProcess?.pid)
    {
      treeKill(this.pyrightProcess?.pid)
      this.pyrightProcess = undefined
    }

    this.pyrightProcess = executeProcess(`isolate -b ${this.info.sandboxId} -e -E HOME=\"/box\" --cg --dir=/etc -p --run -- ${PYRIGHT_PATH} --outputjson main.py`,this.pyrightFunction)

  }

  scheduleJob(job : Job) : boolean
  {
    console.log(`Scheduling Job of of user ${this.info.userId}`);  
    if(this.currentJob)
      return false;
    this.currentJob = job;
    job.run(() => {this.currentJob = undefined})
    return true
  }

  killJob() : boolean
  {
    if(!this.currentJob)
      return false;
    const killed = this.currentJob.kill()
    if(killed)
      this.currentJob = undefined
    return killed
  }

  destroy()
  {

    console.log(`Destroy sandbox processes`)
    this.killJob()
  }

}
import {ChildProcessWithoutNullStreams, execSync,spawn} from "child_process"
import fs from "fs-extra"
import { randomBytes } from "crypto"
import treeKill from "tree-kill"
import { CodePosition, PipCommand, PipRequest, SandboxInfo } from "../model"
import * as database from "./database"
import process, { send } from "process"
import moment from "moment"
import { ISOLATE_PATH, MAX_CPU_TIME_LIMIT, MAX_MAX_PROCESSES_AND_OR_THREADS, MAX_MEM, MAX_OUT_BYTES_PER_SECOND, MAX_STACK_LIMIT, PIP_PATH, PYRIGHT_PATH, PYTHON_PATH, SCRIPT_UPDATE_DELAY, WALL_TIME } from "./config"



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
  {
    console.log("Error reading main.py in sandbox init")
  }
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
  detached: boolean = false,
  env: NodeJS.ProcessEnv | undefined = undefined
  ) : ChildProcessWithoutNullStreams
{

  const runCode = spawn(command,args,{shell: true,detached: detached,env: env});
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
  let bytesPerSecond = 0
  
  const checkInterval = setInterval(() => { bytesPerSecond = 0},1000)
  const command = `isolate -E HOME=/box -E PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\" \
  -t ${MAX_CPU_TIME_LIMIT} \
  -w ${WALL_TIME} \
  -m ${MAX_MEM} \
  -k ${MAX_STACK_LIMIT} \
  -p ${MAX_MAX_PROCESSES_AND_OR_THREADS} \
  -b ${sandbox.info.sandboxId} --cg --dir=/etc --share-net --run -- ${PYTHON_PATH} -u main.py`
  return executeProcess(command,(data) => {
    bytesPerSecond += Buffer.byteLength(data)
    if(MAX_OUT_BYTES_PER_SECOND > 0 && bytesPerSecond >= MAX_OUT_BYTES_PER_SECOND)
      sandbox.killJob()
    stdout(data)
  },(code) => {stop(code); clearInterval(checkInterval)})
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
  return executeProcess(`isolate --cg -s -b ${sandbox.info.sandboxId} -E HOME="/box" -E PATH="/box/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" -d /usr -d /etc -p --share-net --run -- ${PIP_PATH}`, stdout,(r) => {sandbox.runTypeChecker(); stop(r)},[pipRequest.command.toString(),confirmAttribute, ...pipRequest.args])
}


/**
 * Makes this sandbox persistent by setting expirations about notifications and the sandbox itself
 * @param sandbox the sandbox session
 * @param userEmail the email used to notify the user on creation,destruction of this sandbox
 * @returns info about the current sandbox
 */
export async function makeSandboxPersistent(sandbox: SandboxSession,userEmail: string) : Promise<SandboxInfo>
{
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
export async function handleNewSandboxCode(sandbox: SandboxSession,code: CodePosition,onWritingStatus: (writing: boolean) => void)
{
  const startCode = sandbox.code.slice(0,code.from)
  const endCode = sandbox.code.slice(code.to)
  const result = startCode + code.value + endCode
  sandbox.code = result
  sandbox.resetCodeWriting(onWritingStatus)
  
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
  run: () => Promise<void>,
  kill: () => Promise<boolean>
}

export class ProcessJob implements Job
{
  process ?: ChildProcessWithoutNullStreams
  private provider: () => ChildProcessWithoutNullStreams

  constructor(processProvider: () => ChildProcessWithoutNullStreams)
  {
    this.provider = processProvider
  }
  async run(): Promise<void>
  {
    this.process = this.provider()
    return new Promise((resolve => { 
      this.process!.on("close", (code) => {
        resolve()
      })
    }))
  }
  async kill() : Promise<boolean>{

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
  code: string

  codeWritingJob?: any

  pyrightFunction: any

  constructor(info: SandboxInfo, pyright: (data: string) => void, code: string)
  {
    this.info = info
    this.code = code
    this.pyrightFunction = pyright
  }
  resetCodeWriting(onWritingStatus: (writing: boolean) => void)
  {

    if(!this.codeWritingJob)
      onWritingStatus(true)
    clearTimeout(this.codeWritingJob)
    this.codeWritingJob = setTimeout(() => {
      this.writeToFile()
      this.codeWritingJob = undefined
      onWritingStatus(false)
    },SCRIPT_UPDATE_DELAY)
  }
 
  async writeToFile() : Promise<void>
  { 
    console.log(`WRITING TO FILE ${this.code}` )
    await fs.writeFile(getSandboxMainScript(this.info),this.code);  
    this.runTypeChecker()
  }

  runTypeChecker()
  {
    executeProcess(`isolate -s -b ${this.info.sandboxId} -E HOME=/box -E PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\" --cg -p -d /etc --run -- ${PYRIGHT_PATH} --outputjson`,(data) => {
      this.pyrightFunction(data)
    })
  }

  async scheduleJob(job : Job) : Promise<boolean>
  {
    console.log(`Scheduling Job of of user ${this.info.userId}`);  
    if(this.currentJob)
      return false;
    this.currentJob = job;
    await job.run()
    this.currentJob = undefined
    return true
  }

  async killJob(): Promise<boolean>
  {
    if(!this.currentJob)
      return false;
    console.log(`KILLING JOB OF SANDBOX ${this.info.userId}`)
    const killed = await this.currentJob.kill()
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
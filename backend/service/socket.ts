import {Server, Socket} from 'socket.io';
import * as sandbox from "./sandbox.js"
import { Server as HttpServer } from 'node:http';
import { ProcessJob } from './sandbox.js';
import { CodeDiagnostic, CodePosition, CodeRequest, JobResponse, KillResponse, PipCommand, PipRequest, RequestResponse, SandboxInfo, isSomeEnum, validatePipRequest } from '../model.js';
import { MAX_OUT_BYTES_PER_SECOND } from './config.js';


interface RequestJob<T>
{
    run: (socket: UserSocket, request: T,callback: (response: JobResponse) => void) => sandbox.Job | null
}

const sandboxJobs = new Map<string,RequestJob<any>>()

sandboxJobs.set("codeRequest",{run: (socket : UserSocket, request: CodeRequest, callback) => {
    return new ProcessJob(() => {
        return sandbox.runSandboxCode(socket.sandbox,request.sourceCode,(data) => sendToStout(socket,data),(code) => callback({code: code}))  
    })}   
})

sandboxJobs.set("pipRequest",{run: (socket : UserSocket, request: PipRequest, callback) => {
    try {
        validatePipRequest(request)
    }
    catch(error : any)
    {
        callback({code: 1,message: error.message})
        return null;
    }
    return new ProcessJob(() => 
        sandbox.runPipCommand(socket.sandbox,request,(data) => sendToStout(socket,data),(code) => {callback({code: code})}))
    }
})


export interface UserSocket extends Socket
{
    sandbox: sandbox.SandboxSession
}


interface ServerToClientEvents {
    sandboxStatus: (sandboxInfo: SandboxInfo) => void;
    stout: (data: string) => void
}

export function init(server: HttpServer)
{ 
    const io = new Server(server, {cors: {origin: "*"}});

    io.use(async (socket,next) => {
        const newSandbox = await sandbox.initSandbox((data) => {
            sendCodeCheckerDiagnostics(socket,data)
        },socket.handshake.headers.userid as (string));
        (socket as UserSocket).sandbox = newSandbox.session

        socket.emit("sandboxStatus", {
            sandboxInfo: newSandbox.session.info,
            code: newSandbox.currenctCode
        })
        next()
    })
    io.on('connect', (socket) => {

        //all the requests that a user can do via websocket
        
        const userSOcket = socket as UserSocket
        console.log(`connect user ${userSOcket.sandbox.info.userId}`);
        
        sandboxJobs.forEach((job, key) => {
            socket.on(key, (message,callback : (response: JobResponse) => void) => {
                const runJob = job.run(userSOcket,message,callback)
                if(runJob && !userSOcket.sandbox.scheduleJob(runJob))
                    callback({code: 1, message: "One job at a time"})
            })
        })

        registerSocketChannel<string,SandboxInfo>(userSOcket,"makePersistent", async (email) => {
            return sandbox.makeSandboxPersistent(userSOcket.sandbox,email)
        })
        registerSocketChannel<void,SandboxInfo>(userSOcket,"makeTemporary", async () => {
            return sandbox.makeSandboxTemporary(userSOcket.sandbox)
        })

        registerSocketChannel<CodePosition,RequestResponse<any>>(userSOcket,"sendCode", async (code) => {
            await sandbox.handleNewSandboxCode(userSOcket.sandbox,code)
            return {isError: false,info: {}}
        })
        //socket.on("killJob", (data,callback) => {onKillJob(userSOcket, callback)})
        registerSocketChannel<void,KillResponse>(userSOcket,"killJob", async () => {
            if(userSOcket.sandbox.killJob())
                return {message: "Killed Job", success: true}
            return {message: "Job not killed", success: false}
        })
        checkUserNetworkUsage(userSOcket)
        
        socket.on('disconnect', () => {onSocketDisconnect(userSOcket)})
    });
    return io
}



function checkUserNetworkUsage(socket: UserSocket)
{
    let bytesPerSecond = 0
    const checkInterval = setInterval(() => { bytesPerSecond = 0},1000)
    socket.onAnyOutgoing((eventName, ...args) => {
        bytesPerSecond += Buffer.byteLength(args[0])
        if(MAX_OUT_BYTES_PER_SECOND > 0 && bytesPerSecond >= MAX_OUT_BYTES_PER_SECOND)
            socket.sandbox.killJob()
    })
    socket.on('disconnect', () => {clearInterval(checkInterval)})
}

//handle user disconnection
function onSocketDisconnect(socket: UserSocket)
{
    console.log(`disconnect user ${socket.sandbox.info.userId}`);
    sandbox.destroySandBox(socket.sandbox)
}


function sendToStout(socket: UserSocket,data: string)
{
    socket.emit("stout", data)
}

function sendCodeCheckerDiagnostics(socket: Socket,data: string)
{
    try
    {
        const diagnostics = JSON.parse(data).generalDiagnostics as any[]
        socket.emit("codeDiagnostics",diagnostics.map<CodeDiagnostic>(diagnostic => {
            return {message: diagnostic.message,range: {...diagnostic.range},severity: diagnostic.severity}
        }))
    }
    catch(error){}
}


function registerSocketChannel<D,T>(socket: UserSocket,event: string, onEvent:  (request: D) => Promise<T>)
{
    socket.on(event,async(request: D, callback: (response: RequestResponse<T>) => void) => {
       
        try 
        {
            callback({isError: false, info: await onEvent(request)})
        }
        catch(error : any)
        {
            console.log(error)
            callback({isError: true,info: error.info})
        }
    })
}

import {Server, Socket} from 'socket.io';
import * as sandbox from "./sandbox.js"
import { Server as HttpServer } from 'node:http';
import { ProcessJob } from './sandbox.js';
import { CodeRequest, JobResponse, KillResponse, PipCommand, PipRequest, isSomeEnum, validatePipRequest } from './model.js';


interface RequestJob<T>
{
    run: (socket: UserSocket, request: T,callback: (response: JobResponse) => void) => sandbox.Job | null
}

const sandboxJobs = new Map<string,RequestJob<any>>()

sandboxJobs.set("codeRequest",{run: (socket : UserSocket, request: CodeRequest, callback) => {
    return new ProcessJob(() => {
        console.log(request)
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
    sandbox: sandbox.Sandbox
}


export function init(server: HttpServer)
{ 
    const io = new Server(server, {cors: {origin: "*"}});

    io.use((socket,next) => {
        sandbox.initSandbox((socket as UserSocket),(sandbox) => {
            (socket as UserSocket).sandbox = sandbox
            next()
        },json => {
            //console.log(json)
        })
    })
    io.on('connect', (socket) => {

        const userSOcket = socket as UserSocket
        console.log(`connect user ${userSOcket.sandbox.userId}`);
        
        sandboxJobs.forEach((job, key) => {
            socket.on(key, (message,callback : (response: JobResponse) => void) => {
                const runJob = job.run(userSOcket,message,callback)
                if(runJob && !userSOcket.sandbox.scheduleJob(runJob))
                    callback({code: 1, message: "Un lavoro alla volta"})
            })
        })

        socket.on("killJob", (data,callback) => {onKillJob(userSOcket, callback)})
        socket.on('disconnect', () => {onSocketDisconnect(userSOcket)})
    });
    return io
}


function onKillJob(socket : UserSocket,callback: (response: KillResponse) => void)
{
    try
    {
        if(socket.sandbox.killJob())
            callback({message: "Killed Job",success: true})
        else 
            callback({message: "Job not killed", success: false})
    }
    catch(error: any)
    {
        callback({message: error.message, success: false})
    }
}

//handle user disconnection
function onSocketDisconnect(socket: UserSocket)
{
    console.log(`disconnect user ${socket.sandbox.userId}`);
    sandbox.destroySandBox(socket.sandbox)
}


function sendToStout(socket: UserSocket,data: string)
{
    socket.emit("stout", data)
}


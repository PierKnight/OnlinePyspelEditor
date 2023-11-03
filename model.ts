
/**
 * Response Given by a generic request to the server using socket.io
 */
export interface RequestResponse<T>
{
    isError: boolean
    info: T
}

/**
 * response body returned after sending kill job request
 */
export interface KillResponse
{
    message: string
    success: boolean
}

export interface CodeRequest
{
    sourceCode: string
}

/**
 * Response given by a generic job
 * code: if the request is successful or not
 */
export interface JobResponse
{
    message?: string
    code?: number
}

/**
 * request to execute pip command 
 * args: the command args
 */
export interface PipRequest
{
    command: PipCommand
    args: string[]
}

export enum PipCommand
{
    INSTALL = "install",
    UNINSTALL = "uninstall",
    FREEZE = "freeze"
}

/**
 * used to make a sandbox persistent by given an email to send notifications to
 */
export interface PeristanceRequest
{
    email: string
}

export interface PersistanceInfo
{
    email: string
    expiration: Date
}

/**
 * Data about the current sandbox
 * userId: the persistent sandbox id
 * sandboxId: the id given to the sandbox folder
 * persistanceInfo: info about the sandbox persistance can be undefined if sandbox is temporary
 */
export interface SandboxInfo
{
    
    userId: string
    sandboxId: number
    persistanceInfo?: PersistanceInfo
}

/**
 * sandbox status given after user connects to the server
 * code: the current code saved in the sandbox
 */
export interface SandboxStatus 
{
    sandboxInfo: SandboxInfo
    code: string
}

export interface DiagnosticCodePosition
{
    line: number
    character: number
}

export interface CodePosition
{
    from: number
    to: number
    value: string
}

/**
 * diagnostic given after sending code to server, it will be validated using a static code checker
 */
export interface CodeDiagnostic
{
    severity: "warning" | "error"
    message: string
    range: {
        start: DiagnosticCodePosition
        end: DiagnosticCodePosition
    }
}

export const isSomeEnum = <T extends { [s: string]: unknown }>(e: T) => (token: unknown): token is T[keyof T] => Object.values(e).includes(token as T[keyof T]);

const argRegex = /^[\w=@]+$/

export function validatePipRequest(request: PipRequest)
{
    if(!isSomeEnum(PipCommand)(request.command))
        throw new Error("Invalid Pip Command")

    if(request.command == PipCommand.INSTALL || request.command == PipCommand.UNINSTALL)
    {
        if(!request.args || request.args.length === 0)
            throw new Error("Missing argument")
        
        if(!argRegex.test(request.args[0]))
            throw new Error("Invalid Argument")
    }
}
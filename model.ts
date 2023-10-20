
export interface KillResponse
{
    message: string
    success: boolean
}

export interface CodeRequest
{
    sourceCode: string
}

export interface JobResponse
{
    message?: string
    code?: number
}

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
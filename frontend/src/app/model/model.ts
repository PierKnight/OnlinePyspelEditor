import {SyntaxNode} from "@lezer/common";

export interface RequestResponse<T>
{
    isError: boolean
    info: T
}


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

export interface PeristanceRequest
{
    email: string

}

export interface PersistanceInfo
{
    email: string
    expiration: Date
}

export interface SandboxInfo
{

    userId: string
    sandboxId: number
    persistanceInfo?: PersistanceInfo
}

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

export interface NodeInfo
{
  name: string
  from: number
  to: number
}

export class Atom{
  fields: Map<string, string>;
  name: NodeInfo;
  node: NodeInfo;

  constructor(name: NodeInfo, fields: Map<string, string>, node: NodeInfo) {
    this.name = name;
    this.fields = fields;
    this.node = node;
  }

  getTemplate(): string {
    return `${this.name.name}(${Array.from(this.fields.entries()).map(value => `${value[0]}=\${${value[1]}}`).join(",")})`;
  }

  getDetail() {
    return `(${Array.from(this.fields.entries()).map(value => `${value[0]}: ${value[1]}`).join(",")})`;
  }

}


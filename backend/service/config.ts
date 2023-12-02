

export const SMTP_USERNAME = process.env.SMTP_USERNAME
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD
export const SMTP_URL = process.env.SMTP_URL
export const SMTP_PORT = process.env.SMTP_PORT

/**
 * Sandbox Config
 */

//Python interpreter path used inside sandbox
export const PYTHON_PATH = process.env.PYTHON_PATH || "/usr/bin/python3"

export const PYRIGHT_PATH = process.env.PYRIGHT_PATH || "/usr/local/bin/pyright"

//Folder in which run sandboxes
export const ISOLATE_PATH = "/isolate"

export const MAX_CPU_TIME_LIMIT = process.env.MAX_CPU_TIME_LIMIT || 10
//Set wall clock time limit (seconds, fractions allowed)
export const WALL_TIME = process.env.WALL_TIME || 120
//Limit address space to <size> KB
export const MAX_MEM = process.env.MAX_MEM || 512000

export const MAX_STACK_LIMIT = process.env.MAX_STACK_LIMIT || 128000
//Set extra timeout, before which a timing-out program is not yet killed,
export const  EXTRA_TIME = process.env.EXTRA_TIME || 5
//Limit stack size to <size> KB (default: 0=unlimited)
export const MAX_MAX_PROCESSES_AND_OR_THREADS = process.env.MAX_MAX_PROCESSES_AND_OR_THREADS || 0
//The time need to write the current python program inside the file
export const SCRIPT_UPDATE_DELAY = Number.parseInt(process.env.SCRIPT_UPDATE_DELAY || "300") 
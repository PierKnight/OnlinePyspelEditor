import { PrismaClient, UserSandbox } from '@prisma/client'
import fs from "fs-extra"
import { SandboxInfo } from '../model';
import moment, { now } from 'moment';
import { sendEmail } from './email';
import { cli } from 'winston/lib/winston/config';
import { ISOLATE_PATH } from './config';

export const prisma = new PrismaClient()



export async function insert(userSandbox: UserSandbox): Promise<UserSandbox> {

    const user = await prisma.userSandbox.create({
      data: userSandbox
    })
    return user
}

export async function getPersistentSandbox(userId: string): Promise<SandboxInfo> {
    const sandbox = await prisma.userSandbox.findFirstOrThrow({
        where: {
            id: userId,
            NOT: {persistent: null}
        },
        include: {persistent: true}
    })
    return {sandboxId: sandbox.sandboxId,userId: sandbox.id,persistanceInfo: {email: sandbox.persistent!.userEmail,expiration: sandbox.persistent!.expiration}}
}


export async function remove(userId: string, transaction: (sandbox: UserSandbox) => void): Promise<UserSandbox | null> {
    
    
    return prisma.$transaction<UserSandbox | null>(async client => {

        try
        {
            const sandbox = await client.userSandbox.delete({where: {
                id: userId,
                persistent: null
            }})
            transaction(sandbox)
            return sandbox
        }
        catch(error){}
        return null;
    })
} 


export async function getBySandboxId(sandboxId: number) : Promise<UserSandbox | null> {
    return prisma.userSandbox.findUnique({
        where: {
            sandboxId: sandboxId
        }
    })
}

export async function cleanupTemporarySandboxes() : Promise<void> {

    return prisma.$transaction<void>(async client => {

        const sandboxes = await client.userSandbox.findMany({
            where: {persistent: null}
        })

        fs.readdirSync(ISOLATE_PATH).forEach(a => console.log(a))

        sandboxes.forEach(sandbox => {
            console.log(`Removing ${sandbox.sandboxId} sandbox`)
            fs.rmSync(`${ISOLATE_PATH}/${sandbox.sandboxId}`,{ recursive: true, force: true })
            
        })
        const removed = await client.userSandbox.deleteMany({
            where: { persistent: null }
        })

        console.log(`Deleted ${removed.count} temp sandboxes`)
    })
}


export async function makeSandboxPersistent(userid: string,email: string,expiration: Date,notifications: Date[]): Promise<UserSandbox> {
    

    const persistentCreate = {
        expiration: expiration,
        notifications: {create: notifications.map<{expiration: Date}>(data => ({ expiration: data }))},
        userEmail: email
    }
    return prisma.$transaction(async client => {

        await client.persistent.deleteMany({where: {sandbox: {id: userid}}})
        return client.userSandbox.update({
            data: {
                persistent: {
                    upsert: {
                        create: persistentCreate,
                        update: persistentCreate
                    }
                }
            },
            where: {
                id: userid
            }
        })   
    })
}

export async function makeSandboxTemporary(userid: string): Promise<UserSandbox> {
    return prisma.userSandbox.update({
        data: {persistent: {delete: {}}
        },
        where: { id: userid }
    })   
}

export async function updateNotifications()
{
    console.log("UPDATING EXPIRATIONS")
    const now = new Date()
    const sandboxesWithExpiredNotification = await prisma.userSandbox.findMany({
        where: {persistent: {notifications: {some: {expiration: {lt:now}}}}},
        include: {persistent: {include: {notifications: {where: {expiration: {lt: now}},orderBy: {expiration: 'desc'}}}}},
    })

    //send email for the latest expired notification and remove all the expired ones
    sandboxesWithExpiredNotification.forEach(sandbox => {
        const userEmail = sandbox.persistent!.userEmail
        const lastNotification = sandbox.persistent!.notifications[0]!.expiration

        const time = moment().from(lastNotification)

        prisma.$transaction(async client => {
            sendEmail(userEmail,"Pyspel Sandbox",`Notification: Your sandbox is about to expire ${time}\nExpiration: ${sandbox.persistent?.expiration}`)
            return await client.sandboxNotification.deleteMany({where: {expiration: {lt: now},persistent: {sandbox: {id: sandbox.id}}}})
        })

    })


    
    //delete all the expired sandboxes and send email
    const expiredSandboxes = await prisma.userSandbox.findMany({
        where: {persistent: {expiration: {lt: now}}},
        include: {persistent: true}
    })

    expiredSandboxes.forEach(sandbox => {
        const userEmail = sandbox.persistent!.userEmail;
        prisma.$transaction(async client => {
            console.log("SENDING DELETE EMAIL")
            //sendEmail(userEmail,"Pyspel Sandbox",`Notification: Your sandbox ${sandbox.id} has expired`)
            return await client.userSandbox.deleteMany({where: {id: sandbox.id}})
        })
    })

}

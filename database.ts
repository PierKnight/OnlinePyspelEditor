import { PrismaClient, UserSandbox } from '@prisma/client'
import { isolatePath } from './sandbox';
import fs from "fs-extra"
import * as nodemailer from "nodemailer"

const prisma = new PrismaClient()

const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/

export async function insert(userId: string, sandboxId: number, isTemporary: boolean, userEmail?: string): Promise<UserSandbox> {

    if(userEmail && !emailRegex.test(userEmail))
        throw new Error("Invalid Email")

    const date = new Date(new Date().getTime()+(60*60*1000));

    const user = await prisma.userSandbox.create({
      data: {
  
        id: userId,
        sandboxId: sandboxId,
        expiration: date,
        userEmail: userEmail,
        temporary: isTemporary
      },
    })

    return user
}


export async function get(userId: string): Promise<UserSandbox> {
    return prisma.userSandbox.findFirstOrThrow({
        where: {
            id: userId
        }
    })
}


export async function remove(userId: string): Promise<UserSandbox | null> {
    
    try
    {

        return await prisma.userSandbox.delete({
            where: {
                id: userId,
                temporary: true
            }
        })
    }
    catch(error){}
    return null;
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
            where: {temporary: true}
        })

        sandboxes.forEach(sandbox => {
            console.log(`Removing ${sandbox.sandboxId} sandbox`)
            fs.emptyDirSync(`${isolatePath}/${sandbox.sandboxId}`)
            
        })

        const removed = await client.userSandbox.deleteMany({
            where: { temporary: true }
        })

        console.log(`Deleted ${removed.count} temp sandboxes`)
    })
}
const transporter = nodemailer.createTransport({
    auth: {
      user: 'c328d0a9f212a7',
      pass: 'c23a24315edbe0'
    },
    host: "sandbox.smtp.mailtrap.io",
    port: 2525 
  });

  var mailOptions = {
    from: 'ltmplg01l03c349j@studenti.unical.it',
    to: 'pier.altimari@libero.it',
    subject: 'Sending Email using Node.js',
    text: 'That was easy!'
  };
  
  /*
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
  */ 
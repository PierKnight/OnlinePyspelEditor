import * as nodemailer from "nodemailer"
import process from "node:process";
import test from "node:test";
const transporter = nodemailer.createTransport({
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    },
    host: process.env.SMTP_URL,
    port: Number.parseInt(process.env.SMTP_PORT!) 
  });

export function sendEmail(to: string,subject: string,text: string)
{
    const mailOptions = {
        from: 'pyspel@unical.it',
        to: to,
        subject: subject,
        text: text
      };
    
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });
}
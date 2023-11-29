import * as nodemailer from "nodemailer"
import { SMTP_PASSWORD, SMTP_PORT, SMTP_URL, SMTP_USERNAME } from "./config";
const transporter = nodemailer.createTransport({
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD
    },
    host: SMTP_URL,
    port: Number.parseInt(SMTP_PORT!) 
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
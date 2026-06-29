import * as nodemailer from 'nodemailer';
import * as sendgrid from 'nodemailer-sendgrid-transport'
import { getEnvironment } from '../environments/environment';

export class NodeMailer {

    private static transporter() {


        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: getEnvironment().auth_gmail.username,
                pass: getEnvironment().auth_gmail.password,
            }


        });
    }

    static async sendEmail(to: string, subject: string, text: string) {
        await NodeMailer.transporter().sendMail({
            from: "SwiggyApp <" + getEnvironment().auth_gmail.username + ">",
            to: to,
            subject: subject,
            html: `<h2>${text}</h2>`
        });
    }
}
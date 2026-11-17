import * as nodemailer from 'nodemailer';
import { AppError } from './AppError';


type Mail = { to: string; subject: string; html: string };

const sender = () => ({
    name: process.env.EMAIL_FROM_NAME || 'Luqma Fast',
    email: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
});

let transporter: nodemailer.Transporter | undefined;

async function sendWithSmtp({ to, subject, html }: Mail) {
    const port = Number(process.env.EMAIL_PORT) || 465;
    transporter ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const { name, email } = sender();
    await transporter.sendMail({ from: `"${name}" <${email}>`, to, subject, html });
}

async function sendWithBrevo({ to, subject, html }: Mail) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: sender(), to: [{ email: to }], subject, htmlContent: html }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
        throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
    }
}

export async function sendMail(mail: Mail) {
    if (process.env.EMAIL_PROVIDER === 'brevo') return sendWithBrevo(mail);
    return sendWithSmtp(mail);
}

export const escapeHtml = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);


const ORANGE = '#FC8019';
const DARK = '#282C3F';
const MUTED = '#686B78';

function layout(heading: string, body: string) {
    return `
<div style="background:#F5F5F6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:${DARK};">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E9E9EB;">
    <div style="background:${ORANGE};padding:20px 28px;">
      <span style="font-size:22px;font-weight:800;color:#ffffff;">Luqma Fast</span>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:${DARK};">${heading}</h2>
      ${body}
    </div>
  </div>
  <p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:12px;color:${MUTED};">
    You received this email because of activity on your Luqma Fast account.
  </p>
</div>`;
}

const paragraph = (text: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${text}</p>`;
const note = (text: string) => `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${text}</p>`;
const otpBox = (otp: string) => `
<div style="text-align:center;margin:24px 0;">
  <span style="display:inline-block;padding:14px 28px;border-radius:10px;background:#FFF5EE;border:1px dashed ${ORANGE};font-size:32px;font-weight:700;letter-spacing:8px;color:${DARK};">${otp}</span>
</div>`;


async function sendOtpMail(mail: Mail) {
    try {
        await sendMail(mail);
    } catch (error) {
        console.error(`Error sending "${mail.subject}" email to ${mail.to}:`, error);
        throw new AppError(503, "We couldn't send the email right now, please try again in a minute");
    }
}

export function sendVerifyEmail(to: string, otp: string) {
    return sendOtpMail({
        to,
        subject: 'Your verification code - Luqma Fast',
        html: layout('Welcome to Luqma Fast', paragraph('Use this code to verify your email address:') + otpBox(otp) +
            note("The code expires in 10 minutes. Don't share it with anyone.")),
    });
}

export function sendResetPasswordEmail(to: string, otp: string) {
    return sendOtpMail({
        to,
        subject: 'Reset your password - Luqma Fast',
        html: layout('Reset your password', paragraph('Use this code to reset your password:') + otpBox(otp) +
            note("The code expires in 10 minutes. If you didn't ask for this, ignore this email and nothing will change.")),
    });
}


type OrderEmail = {
    userName: string;
    restaurantName: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    deliveryCharge: number;
    grandTotal: number;
};

type OrderStatusEmail = {
    userName: string;
    restaurantName: string;
    orderId: string;
    statusLabel: string;
    reason?: string;
};

type ContactEmail = { name: string; email: string; subject: string; message: string; orderRef?: string; id: string };

export async function sendContactNotification(to: string, c: ContactEmail) {
    try {
        await sendMail({
            to,
            subject: `New message (${c.subject}) from ${c.name} - Luqma Fast`,
            html: layout('New message from the website',
                paragraph(`<strong>${escapeHtml(c.name)}</strong> &lt;${escapeHtml(c.email)}&gt;`) +
                (c.orderRef ? paragraph(`Order: #${escapeHtml(c.orderRef)}`) : '') +
                paragraph(escapeHtml(c.message).replace(/\n/g, '<br>')) +
                note(`Message ${escapeHtml(c.id)} · reply to the sender's email`)),
        });
    } catch (error) {
        console.error('Error sending contact notification:', error);
    }
}

export async function sendOrderStatusEmail(to: string, o: OrderStatusEmail) {
    try {
        await sendMail({
            to,
            subject: `Your order is ${o.statusLabel} - Luqma Fast`,
            html: layout(`Hi ${escapeHtml(o.userName)}`,
                paragraph(`Your order from <strong>${escapeHtml(o.restaurantName)}</strong> is now <strong>${escapeHtml(o.statusLabel)}</strong>.`) +
                (o.reason ? paragraph(`Reason: ${escapeHtml(o.reason)}`) : '') +
                note(`Order #${escapeHtml(o.orderId.slice(-6).toUpperCase())}`)),
        });
    } catch (error) {
        console.error(`Error sending order status email to ${to}:`, error);
    }
}

export async function sendOrderConfirmationEmail(to: string, o: OrderEmail) {
    const rows = o.items.map((i) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #F1F1F3;">${i.quantity} × ${escapeHtml(i.name)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #F1F1F3;text-align:right;">${(i.price * i.quantity).toFixed(2)}</td>
  </tr>`).join('');
    const totals = `
  <tr><td style="padding:8px 0;color:${MUTED};">Delivery</td><td style="padding:8px 0;text-align:right;color:${MUTED};">${o.deliveryCharge.toFixed(2)}</td></tr>
  <tr><td style="padding:8px 0;font-weight:700;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;">${o.grandTotal.toFixed(2)}</td></tr>`;
    try {
        await sendMail({
            to,
            subject: `Your order from ${o.restaurantName} - Luqma Fast`,
            html: layout(`Thanks ${escapeHtml(o.userName)}, your order is placed!`,
                paragraph(`<strong>${escapeHtml(o.restaurantName)}</strong> received your order:`) +
                `<table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}${totals}</table>` +
                note("We'll let you know when it's on the way.")),
        });
    } catch (error) {
        console.error(`Error sending order email to ${to}:`, error);
    }
}

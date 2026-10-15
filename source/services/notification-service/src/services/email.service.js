import nodemailer from 'nodemailer';
import {accountActivationTemplate} from '../templates/account-activation.js';
import {passwordResetTemplate} from '../templates/password-reset.js';
import {orderConfirmationTemplate} from '../templates/order-confirmation.js';

function createTransport() {
  const mode = process.env.EMAIL_TRANSPORT || (process.env.NODE_ENV === 'production' ? 'smtp' : 'json');
  if (mode === 'json') return nodemailer.createTransport({jsonTransport: true});
  if (mode !== 'smtp') throw new Error('EMAIL_TRANSPORT must be json or smtp');
  if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST required for smtp transport');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER
      ? {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}
      : undefined
  });
}

function render(job) {
  if (job.template === 'ACCOUNT_ACTIVATION') return accountActivationTemplate(job.templateData);
  if (job.template === 'PASSWORD_RESET') return passwordResetTemplate(job.templateData);
  if (job.template === 'ORDER_CONFIRMATION') return orderConfirmationTemplate(job.templateData);
  throw new Error('Unsupported email template');
}

export function createEmailService({transporter = createTransport()} = {}) {
  return {
    async send(job) {
      const message = render(job);
      return transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@example.com',
        to: job.recipientEmail,
        subject: message.subject,
        text: message.text
      });
    }
  };
}

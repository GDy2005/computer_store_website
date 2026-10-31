import {createEmailService} from '../services/notification-service/src/services/email.service.js';

const recipient = process.env.SMTP_TEST_RECIPIENT || process.env.SMTP_USER;

if (process.env.EMAIL_TRANSPORT !== 'smtp') {
  throw new Error('EMAIL_TRANSPORT must be smtp for a real delivery test');
}

if (!recipient) {
  throw new Error('SMTP_TEST_RECIPIENT or SMTP_USER is required');
}

const marker = new Date().toISOString();
const result = await createEmailService().send({
  recipientEmail: recipient,
  template: 'ORDER_CONFIRMATION',
  templateData: {
    fullName: 'SMTP Test',
    orderNumber: `SMTP-TEST-${marker}`
  }
});

const accepted = result.accepted?.length || 0;
const rejected = result.rejected?.length || 0;

if (accepted === 0 || rejected > 0) {
  throw new Error(`SMTP rejected the test email (accepted=${accepted}, rejected=${rejected})`);
}

console.log(`PASS real SMTP delivery accepted (${marker})`);

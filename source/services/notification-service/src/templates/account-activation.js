import {
  emailLayout,
  escapeHtml,
  informationCard
} from './emailLayout.js';

export function accountActivationTemplate({fullName, actionUrl}) {
  const name = fullName || 'there';
  const subject = 'Activate your Computer Store account';
  const text = [
    `Hello ${name},`,
    '',
    'Welcome to Computer Store. Use the link below to activate your account:',
    actionUrl,
    '',
    'This link expires for security. If you did not create this account, ignore this email.'
  ].join('\n');

  return {
    subject,
    text,
    html: emailLayout({
      preheader: 'Activate your Computer Store account to finish signing up.',
      eyebrow: 'Account activation',
      title: 'Welcome to Computer Store',
      content: [
        '<p style="margin:0 0 14px;">Hello <strong>',
        escapeHtml(name),
        '</strong>,</p>',
        '<p style="margin:0;">Thanks for joining us. Confirm your email address ',
        'to activate your account and start shopping.</p>'
      ].join(''),
      detail: informationCard([
        {label: 'Request', value: 'Account activation'},
        {label: 'Security', value: 'Time-limited link'}
      ]),
      action: {label: 'Activate account', url: actionUrl},
      footerNote: 'If you did not create this account, you can safely ignore this email.'
    })
  };
}

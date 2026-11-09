import {
  emailLayout,
  escapeHtml,
  informationCard
} from './emailLayout.js';

export function passwordResetTemplate({fullName, actionUrl}) {
  const name = fullName || 'there';
  const subject = 'Reset your Computer Store password';
  const text = [
    `Hello ${name},`,
    '',
    'We received a request to reset your password. Use the link below:',
    actionUrl,
    '',
    'This link expires for security. If you did not request a reset, ignore this email.'
  ].join('\n');

  return {
    subject,
    text,
    html: emailLayout({
      preheader: 'Use this secure link to reset your Computer Store password.',
      eyebrow: 'Password assistance',
      title: 'Reset your password',
      content: [
        '<p style="margin:0 0 14px;">Hello <strong>',
        escapeHtml(name),
        '</strong>,</p>',
        '<p style="margin:0;">We received a request to reset your password. ',
        'Use the secure button below to choose a new one.</p>'
      ].join(''),
      detail: informationCard([
        {label: 'Request', value: 'Password reset'},
        {label: 'Security', value: 'Single-use, time-limited link'}
      ]),
      action: {label: 'Reset password', url: actionUrl},
      footerNote: 'If you did not request this change, ignore this email and your password will remain unchanged.'
    })
  };
}

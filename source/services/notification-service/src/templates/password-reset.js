export function passwordResetTemplate({fullName, actionUrl}) {
  return {
    subject: 'Reset your password',
    text: [`Hello ${fullName},`, '', `Reset your password: ${actionUrl}`].join('\n')
  };
}

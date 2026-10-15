export function accountActivationTemplate({fullName, actionUrl}) {
  return {
    subject: 'Activate your account',
    text: [`Hello ${fullName},`, '', `Activate your account: ${actionUrl}`].join('\n')
  };
}

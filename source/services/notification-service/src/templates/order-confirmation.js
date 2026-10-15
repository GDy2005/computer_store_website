export function orderConfirmationTemplate({fullName, orderNumber}) {
  return {
    subject: `Order ${orderNumber} confirmed`,
    text: [`Hello ${fullName},`, '', `Your order ${orderNumber} has been confirmed.`].join('\n')
  };
}

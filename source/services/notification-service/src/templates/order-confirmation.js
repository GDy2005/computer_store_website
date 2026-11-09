import {
  emailLayout,
  escapeHtml,
  formatVnd,
  informationCard
} from './emailLayout.js';

function itemTable(items) {
  if (!items.length) return '';
  const visibleItems = items.slice(0, 10);
  const rows = visibleItems.map(item => [
    '<tr><td style="padding:11px 0;border-bottom:1px solid #deded8;">',
    '<div style="color:#171717;font-size:14px;font-weight:700;">',
    escapeHtml(item.productName || 'Product'),
    '</div><div style="margin-top:3px;color:#6f6f6b;font-size:12px;">Quantity: ',
    escapeHtml(item.quantity || 1),
    '</div></td><td align="right" style="padding:11px 0 11px 16px;',
    'border-bottom:1px solid #deded8;color:#171717;font-size:14px;font-weight:700;">',
    escapeHtml(formatVnd(item.lineTotal) || ''),
    '</td></tr>'
  ].join('')).join('');
  const remainder = items.length - visibleItems.length;
  const more = remainder > 0
    ? '<tr><td colspan="2" style="padding-top:10px;color:#6f6f6b;font-size:12px;">+' +
      escapeHtml(remainder) + ' more item(s)</td></tr>'
    : '';

  return [
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '<tr><td colspan="2" style="padding-bottom:5px;color:#9a6100;font-size:12px;',
    'font-weight:800;letter-spacing:1px;text-transform:uppercase;">Order items</td></tr>',
    rows, more, '</table>'
  ].join('');
}

export function orderConfirmationTemplate({
  fullName,
  orderNumber,
  items = [],
  total,
  shopUrl
}) {
  const name = fullName || 'there';
  const number = orderNumber || 'Pending';
  const formattedTotal = formatVnd(total);
  const itemLines = items.map(item => {
    const price = formatVnd(item.lineTotal);
    return `- ${item.productName || 'Product'} x${item.quantity || 1}${price ? `: ${price}` : ''}`;
  });
  const subject = `Order ${number} confirmed`;
  const text = [
    `Hello ${name},`,
    '',
    `Your order ${number} has been confirmed.`,
    ...itemLines,
    formattedTotal ? `Total: ${formattedTotal}` : '',
    '',
    'We will notify you when the order status changes.'
  ].filter(Boolean).join('\n');

  return {
    subject,
    text,
    html: emailLayout({
      preheader: `We have confirmed order ${number}.`,
      eyebrow: 'Order confirmed',
      title: 'Thank you for your order',
      content: [
        '<p style="margin:0 0 14px;">Hello <strong>',
        escapeHtml(name),
        '</strong>,</p>',
        '<p style="margin:0;">Your order has been received and confirmed. ',
        'We will let you know when its status changes.</p>'
      ].join(''),
      detail: [
        informationCard([
          {label: 'Order number', value: number},
          {label: 'Status', value: 'Confirmed'},
          {label: 'Order total', value: formattedTotal}
        ]),
        items.length ? '<div style="height:18px;"></div>' + itemTable(items) : ''
      ].join(''),
      action: shopUrl ? {label: 'Continue shopping', url: shopUrl} : null,
      footerNote: 'Please keep this email as a reference for your order.'
    })
  };
}

const colors = {
  accent: '#f6ad32',
  ink: '#171717',
  muted: '#6f6f6b',
  canvas: '#f4f4f1',
  border: '#deded8'
};

export function escapeHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return '#';
    return escapeHtml(url.toString());
  } catch {
    return '#';
  }
}

export function formatVnd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function actionButton(action) {
  if (!action) return '';
  const href = safeHttpUrl(action.url);
  if (href === '#') return '';

  return [
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0">',
    '<tr><td bgcolor="', colors.accent, '" style="border-radius:6px;">',
    '<a href="', href, '" target="_blank" style="display:inline-block;',
    'padding:14px 24px;color:#111111;font-size:15px;font-weight:700;',
    'text-decoration:none;border-radius:6px;">',
    escapeHtml(action.label), '</a></td></tr></table>'
  ].join('');
}

function fallbackLink(action) {
  if (!action) return '';
  const href = safeHttpUrl(action.url);
  if (href === '#') return '';

  return [
    '<tr><td class="email-pad" style="padding:0 44px 34px 44px;">',
    '<p style="margin:0 0 8px;color:', colors.muted,
    ';font-size:13px;line-height:20px;">If the button does not work, ',
    'copy and paste this link into your browser:</p>',
    '<p style="margin:0;word-break:break-all;font-size:13px;',
    'line-height:20px;"><a href="', href,
    '" style="color:#8a5700;">', href, '</a></p></td></tr>'
  ].join('');
}

export function informationCard(rows) {
  const content = rows
    .filter(row => row.value !== null && row.value !== undefined)
    .map(row => [
      '<tr><td style="padding:9px 0;color:', colors.muted,
      ';font-size:14px;border-bottom:1px solid ', colors.border, ';">',
      escapeHtml(row.label), '</td><td align="right" style="padding:',
      '9px 0 9px 20px;color:', colors.ink,
      ';font-size:14px;font-weight:700;border-bottom:1px solid ',
      colors.border, ';">', escapeHtml(row.value), '</td></tr>'
    ].join(''))
    .join('');

  return [
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"',
    ' border="0" style="background:#fafaf8;border:1px solid ',
    colors.border, ';border-radius:6px;"><tr><td style="padding:16px 20px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"',
    ' border="0">', content, '</table></td></tr></table>'
  ].join('');
}

export function emailLayout({
  preheader,
  eyebrow,
  title,
  content,
  action = null,
  detail = '',
  footerNote
}) {
  const button = actionButton(action);
  const detailRow = detail
    ? '<tr><td class="email-pad" style="padding:0 44px 28px 44px;">' +
      detail + '</td></tr>'
    : '';
  const buttonRow = button
    ? '<tr><td class="email-pad" style="padding:0 44px 34px 44px;">' +
      button + '</td></tr>'
    : '';

  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light only"><title>',
    escapeHtml(title), '</title><style>@media only screen and (max-width:620px)',
    '{.email-shell{width:100%!important}.email-pad{padding-left:24px!important;',
    'padding-right:24px!important}.email-title{font-size:28px!important;',
    'line-height:34px!important}}</style></head>',
    '<body style="margin:0;padding:0;background:', colors.canvas,
    ';font-family:Arial,Helvetica,sans-serif;color:', colors.ink, ';">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;',
    'color:transparent;">', escapeHtml(preheader), '</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"',
    ' border="0" bgcolor="', colors.canvas,
    '"><tr><td align="center" style="padding:32px 12px;">',
    '<table role="presentation" width="620" cellspacing="0" cellpadding="0"',
    ' border="0" class="email-shell" style="width:620px;max-width:620px;',
    'background:#ffffff;border:1px solid ', colors.border, ';">',
    '<tr><td bgcolor="', colors.ink, '" style="padding:22px 32px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"',
    ' border="0"><tr><td width="48"><div style="width:40px;height:40px;',
    'line-height:40px;text-align:center;background:', colors.accent,
    ';color:#111111;font-size:15px;font-weight:800;border-radius:6px;">CS</div>',
    '</td><td style="color:#ffffff;font-size:18px;font-weight:800;',
    'letter-spacing:1.2px;">COMPUTER STORE</td></tr></table></td></tr>',
    '<tr><td bgcolor="', colors.accent,
    '" style="height:5px;line-height:5px;font-size:0;">&nbsp;</td></tr>',
    '<tr><td class="email-pad" style="padding:42px 44px 18px 44px;">',
    '<p style="margin:0 0 12px;color:#9a6100;font-size:12px;line-height:18px;',
    'font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">',
    escapeHtml(eyebrow), '</p><h1 class="email-title" style="margin:0;',
    'font-size:34px;line-height:41px;letter-spacing:-0.7px;color:',
    colors.ink, ';">', escapeHtml(title), '</h1></td></tr>',
    '<tr><td class="email-pad" style="padding:0 44px 28px 44px;',
    'color:#3f3f3b;font-size:16px;line-height:25px;">', content, '</td></tr>',
    detailRow, buttonRow, fallbackLink(action),
    '<tr><td class="email-pad" style="padding:24px 44px;border-top:1px solid ',
    colors.border, ';color:', colors.muted, ';font-size:12px;line-height:19px;">',
    escapeHtml(footerNote),
    '<br>&copy; Computer Store. This is an automated email.</td></tr>',
    '</table></td></tr></table></body></html>'
  ].join('');
}

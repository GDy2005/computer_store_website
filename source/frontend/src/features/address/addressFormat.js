function withPrefix(value, prefix, pattern) {
  if (!value) return '';
  const normalized = String(value).trim();
  return pattern.test(normalized) ? normalized : `${prefix} ${normalized}`;
}

export function formatAddress(address = {}, locale = 'vi') {
  if (locale === 'en') {
    return [
      withPrefix(address.addressLine, 'Street', /^street\b/i),
      withPrefix(address.ward, 'Ward', /^(ward|commune)\b/i),
      withPrefix(address.district, 'District', /^district\b/i),
      address.province
    ].filter(Boolean).join(', ');
  }

  return [
    withPrefix(address.addressLine, 'Đường', /^đường\b/i),
    withPrefix(address.ward, 'Phường/Xã', /^(phường|xã|phường\/xã)\b/i),
    withPrefix(address.district, 'Quận/Huyện', /^(quận|huyện|quận\/huyện)\b/i),
    address.province
  ].filter(Boolean).join(', ');
}

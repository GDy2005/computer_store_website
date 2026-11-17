import administrativeUnits from './data/administrativeUnits.json';

export const administrativeDataMetadata = Object.freeze({
  source: administrativeUnits.source,
  license: administrativeUnits.license,
  dataThrough: administrativeUnits.dataThrough
});

export const provinces = Object.freeze(
  administrativeUnits.provinces.map(item => Object.freeze(item))
);

const provinceByCode = new Map(
  provinces.map(province => [province.code, province])
);

const wardsByProvince = new Map();
const wardByCode = new Map();

for (const ward of administrativeUnits.wards) {
  const frozenWard = Object.freeze(ward);
  wardByCode.set(ward.code, frozenWard);

  const current = wardsByProvince.get(ward.provinceCode) || [];
  current.push(frozenWard);
  wardsByProvince.set(ward.provinceCode, current);
}

for (const [provinceCode, wards] of wardsByProvince) {
  wardsByProvince.set(provinceCode, Object.freeze(wards));
}

function comparable(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(thanh pho|tinh|tp\.?|city|province|phuong|xa|ward|commune|dac khu|special zone)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function getProvince(code) {
  return provinceByCode.get(String(code || '')) || null;
}

export function getWards(provinceCode) {
  return wardsByProvince.get(String(provinceCode || '')) || [];
}

export function getWard(code) {
  return wardByCode.get(String(code || '')) || null;
}

export function resolveProvinceCode(address = {}) {
  if (provinceByCode.has(String(address.provinceCode || ''))) {
    return String(address.provinceCode);
  }

  const target = comparable(address.province);
  if (!target) return '';

  const aliases = new Map([
    ['hochiminh', '79'],
    ['hcm', '79'],
    ['saigon', '79']
  ]);

  if (aliases.has(target)) return aliases.get(target);

  return provinces.find(province => comparable(province.name) === target)?.code || '';
}

export function resolveWardCode(address = {}, provinceCode = resolveProvinceCode(address)) {
  const directCode = String(address.wardCode || '');
  const directWard = wardByCode.get(directCode);

  if (directWard?.provinceCode === provinceCode) return directCode;

  const target = comparable(address.ward);
  if (!target) return '';

  return getWards(provinceCode)
    .find(ward => comparable(ward.name) === target)?.code || '';
}

function addressLabelKind(value) {
  const label = comparable(value);

  if (['home', 'nha'].includes(label)) return 'HOME';
  if (['office', 'work', 'vanphong', 'congty'].includes(label)) return 'OFFICE';
  if (['other', 'khac'].includes(label)) return 'OTHER';

  return null;
}

export function normalizeAddressLabel(value) {
  return addressLabelKind(value) || (String(value || '').trim() ? 'OTHER' : 'HOME');
}

export function normalizeAddressForm(address = {}) {
  const provinceCode = resolveProvinceCode(address);
  const wardCode = resolveWardCode(address, provinceCode);
  const rawLabel = String(address.label || '').trim();
  const label = normalizeAddressLabel(rawLabel);

  return {
    label,
    customLabel: label === 'OTHER'
      ? String(address.customLabel || (addressLabelKind(rawLabel) ? '' : rawLabel)).trim()
      : '',
    recipientName: address.recipientName || '',
    phone: address.phone || '',
    addressLine: address.addressLine || '',
    provinceCode,
    province: getProvince(provinceCode)?.name || address.province || '',
    wardCode,
    ward: getWard(wardCode)?.name || address.ward || ''
  };
}

export const emptyAddressForm = Object.freeze(normalizeAddressForm());

export function toAddressPayload(address = {}, {includeLabel = true} = {}) {
  const normalized = normalizeAddressForm(address);
  const payload = {
    recipientName: normalized.recipientName,
    phone: normalized.phone,
    addressLine: normalized.addressLine,
    provinceCode: normalized.provinceCode,
    province: normalized.province,
    wardCode: normalized.wardCode,
    ward: normalized.ward
  };

  if (includeLabel) {
    payload.label = normalized.label === 'OTHER'
      ? normalized.customLabel.trim() || 'OTHER'
      : normalized.label;
  }

  return payload;
}

export function addressLabelText(label, t) {
  const kind = addressLabelKind(label);

  return kind
    ? t(`address.label.${kind.toLowerCase()}`)
    : String(label || '').trim() || t('address.fallbackLabel');
}

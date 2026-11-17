import {Box, MenuItem, TextField} from '@mui/material';

import {
  getProvince,
  getWard,
  getWards,
  normalizeAddressLabel,
  provinces,
  resolveProvinceCode
} from './administrativeUnits.js';
import {useLanguage} from '../i18n/LanguageContext.jsx';

export default function AddressFormFields({
  value,
  setValue,
  showLabel = true,
  showContact = true,
  singleColumn = false
}) {
  const {t} = useLanguage();
  const provinceCode = resolveProvinceCode(value);
  const wards = getWards(provinceCode);

  function change(field) {
    return event => {
      const nextValue = event.target.value;
      setValue(current => ({...current, [field]: nextValue}));
    };
  }

  function changeProvince(event) {
    const code = event.target.value;
    const province = getProvince(code);

    setValue(current => ({
      ...current,
      provinceCode: code,
      province: province?.name || '',
      wardCode: '',
      ward: ''
    }));
  }

  function changeLabel(event) {
    const label = event.target.value;

    setValue(current => ({
      ...current,
      label,
      customLabel: label === 'OTHER' ? current.customLabel || '' : ''
    }));
  }

  function changeWard(event) {
    const code = event.target.value;
    const ward = getWard(code);

    setValue(current => ({
      ...current,
      wardCode: code,
      ward: ward?.name || ''
    }));
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: singleColumn
          ? '1fr'
          : {xs: '1fr', sm: 'repeat(2,minmax(0,1fr))'},
        gap: 2
      }}
    >
      {showLabel && (
        <TextField
          select
          label={t('address.label')}
          value={normalizeAddressLabel(value.label)}
          onChange={changeLabel}
          slotProps={{inputLabel: {shrink: true}}}
        >
          <MenuItem value="HOME">{t('address.label.home')}</MenuItem>
          <MenuItem value="OFFICE">{t('address.label.office')}</MenuItem>
          <MenuItem value="OTHER">{t('address.label.other')}</MenuItem>
        </TextField>
      )}

      {showLabel && normalizeAddressLabel(value.label) === 'OTHER' && (
        <TextField
          label={t('address.customLabel')}
          required
          value={value.customLabel || ''}
          onChange={change('customLabel')}
          inputProps={{maxLength: 50}}
        />
      )}

      {showContact && (
        <>
          <TextField
            label={t('address.recipient')}
            required
            autoComplete="name"
            value={value.recipientName}
            onChange={change('recipientName')}
          />
          <TextField
            label={t('address.phone')}
            required
            autoComplete="tel"
            value={value.phone}
            onChange={change('phone')}
          />
        </>
      )}

      <TextField
        label={t('address.street')}
        required
        autoComplete="street-address"
        value={value.addressLine}
        onChange={change('addressLine')}
        sx={singleColumn ? undefined : {gridColumn: {sm: '1 / -1'}}}
      />

      <TextField
        select
        label={t('address.province')}
        required
        value={provinceCode}
        onChange={changeProvince}
        slotProps={{inputLabel: {shrink: true}, select: {displayEmpty: true}}}
      >
        <MenuItem value="" disabled>{t('address.selectProvince')}</MenuItem>
        {provinces.map(province => (
          <MenuItem key={province.code} value={province.code}>
            {province.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label={t('address.ward')}
        required
        disabled={!provinceCode}
        value={value.wardCode || ''}
        onChange={changeWard}
        slotProps={{inputLabel: {shrink: true}, select: {displayEmpty: true}}}
      >
        <MenuItem value="" disabled>
          {provinceCode ? t('address.selectWard') : t('address.selectProvinceFirst')}
        </MenuItem>
        {wards.map(ward => (
          <MenuItem key={ward.code} value={ward.code}>
            {ward.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

import {useState} from 'react';
import {IconButton,InputAdornment,TextField} from '@mui/material';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import UiIcon from './UiIcon.jsx';

export default function PasswordField({InputProps, ...props}) {
  const {t} = useLanguage();
  const [visible,setVisible] = useState(false);
  const toggleLabel = visible ? t('auth.hidePassword') : t('auth.showPassword');

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              type="button"
              edge="end"
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-pressed={visible}
              onMouseDown={event => event.preventDefault()}
              onClick={() => setVisible(current => !current)}
            >
              <UiIcon name={visible ? 'visibilityOff' : 'visibility'} sx={{fontSize:21}}/>
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  );
}

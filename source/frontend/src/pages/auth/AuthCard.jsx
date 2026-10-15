import {Paper,Stack,Typography} from '@mui/material';

export default function AuthCard({title,description,children}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{maxWidth:560,mx:'auto',p:{xs:3,sm:4}}}
    >
      <Stack spacing={3}>
        <Stack spacing={0.75}>
          <Typography component="h1" variant="h4" fontWeight={800}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary">{description}</Typography>
          )}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

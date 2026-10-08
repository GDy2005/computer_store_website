import {Box,Container,Stack,Typography} from '@mui/material';

export default function SiteFooter() {
  return (
    <Box component="footer" sx={{borderTop:'1px solid',borderColor:'divider',bgcolor:'background.paper',py:3}}>
      <Container maxWidth="lg">
        <Stack direction={{xs:'column',sm:'row'}} spacing={1} justifyContent="space-between">
          <Typography fontWeight={700}>Computer Store</Typography>
          <Typography color="text.secondary" variant="body2">Máy tính và linh kiện cho mọi cấu hình.</Typography>
        </Stack>
      </Container>
    </Box>
  );
}

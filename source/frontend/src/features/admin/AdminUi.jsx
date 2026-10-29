import {
  Box,
  Button,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Typography
} from '@mui/material';

export function AdminPageHeader({eyebrow = 'Quản trị', title, description, action}) {
  return (
    <Stack
      direction={{xs: 'column', sm: 'row'}}
      justifyContent="space-between"
      alignItems={{sm: 'flex-end'}}
      gap={2}
    >
      <Box>
        <Typography component="p" variant="overline" color="secondary.main" fontWeight={850}>
          {eyebrow}
        </Typography>
        <Typography component="h1" variant="h4" fontWeight={850}>{title}</Typography>
        {description && <Typography color="text.secondary" sx={{mt: 0.75}}>{description}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

export function AdminLoading({label = 'Đang tải dữ liệu'}) {
  return (
    <Box sx={{display: 'grid', placeItems: 'center', minHeight: 240}}>
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress aria-label={label}/>
        <Typography color="text.secondary" variant="body2">{label}</Typography>
      </Stack>
    </Box>
  );
}

export function AdminEmpty({children = 'Chưa có dữ liệu phù hợp.'}) {
  return (
    <Paper variant="outlined" sx={{p: 4, textAlign: 'center'}}>
      <Typography color="text.secondary">{children}</Typography>
    </Paper>
  );
}

export function AdminPagination({meta, page, onChange, disabled = false}) {
  const totalPages = Math.max(1, Number(meta?.totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), totalPages);

  return (
    <Stack alignItems="center" spacing={1} sx={{pt: 1}}>
      <Pagination
        count={totalPages}
        page={safePage}
        onChange={onChange}
        disabled={disabled}
        color="primary"
        showFirstButton
        showLastButton
      />
      <Typography variant="caption" color="text.secondary">
        Trang {safePage} / {totalPages} · {Number(meta?.totalItems || 0).toLocaleString('vi-VN')} kết quả
      </Typography>
    </Stack>
  );
}

export function DangerButton({children, ...props}) {
  return <Button color="error" variant="outlined" {...props}>{children}</Button>;
}

import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Box,Button,Chip,Paper,Skeleton,Stack,Typography} from '@mui/material';

function getCategoryCode(name) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0,3).toUpperCase();
}

function CategoryCard({name,description}) {
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{height:'100%',p:2.5,transition:'transform 160ms ease, box-shadow 160ms ease','&:hover':{transform:'translateY(-3px)',boxShadow:3}}}
    >
      <Stack spacing={1.5}>
        <Box
          aria-hidden="true"
          sx={{display:'grid',width:48,height:48,placeItems:'center',borderRadius:2,bgcolor:'primary.main',color:'primary.contrastText',fontSize:14,fontWeight:800}}
        >
          {getCategoryCode(name)}
        </Box>
        <Typography component="h3" variant="h6" fontWeight={700}>{name}</Typography>
        <Typography color="text.secondary" variant="body2">{description}</Typography>
      </Stack>
    </Paper>
  );
}

export default function HomePage() {
  const [categories,setCategories] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/v1/categories', {params:{featured:true}});
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error('Invalid category response');
      setCategories(items);
    } catch {
      setError('Không tải được danh mục sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <Stack spacing={{xs:5,md:8}}>
      <Paper
        component="section"
        elevation={0}
        sx={{overflow:'hidden',p:{xs:3,sm:5,md:7},color:'common.white',background:'linear-gradient(125deg, #173f35 0%, #245f50 58%, #d79537 160%)'}}
      >
        <Stack spacing={2.5} maxWidth={760}>
          <Chip label="Máy tính & linh kiện" sx={{alignSelf:'flex-start',bgcolor:'rgba(255,255,255,0.14)',color:'inherit',fontWeight:700}}/>
          <Typography component="h1" variant="h3" sx={{fontSize:{xs:'2.15rem',sm:'3rem',md:'3.65rem'},lineHeight:1.08}}>
            Không gian cho cấu hình tiếp theo của bạn.
          </Typography>
          <Typography sx={{maxWidth:620,color:'rgba(255,255,255,0.78)',fontSize:{xs:'1rem',md:'1.15rem'}}}>
            Khám phá laptop, màn hình và phụ kiện máy tính được sắp xếp rõ ràng cho từng nhu cầu.
          </Typography>
        </Stack>
      </Paper>

      <Box component="section" aria-labelledby="category-heading">
        <Stack spacing={1} sx={{mb:3}}>
          <Typography id="category-heading" component="h2" variant="h4" fontWeight={800}>Danh mục nổi bật</Typography>
          <Typography color="text.secondary">Khám phá các nhóm máy tính và linh kiện đang có tại cửa hàng.</Typography>
        </Stack>
        {loading && (
          <Box aria-label="Đang tải danh mục" sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2, 1fr)',md:'repeat(5, 1fr)'},gap:2}}>
            {Array.from({length:5}, (_, index) => <Skeleton key={index} variant="rounded" height={170}/>)}
          </Box>
        )}
        {error && (
          <Alert severity="error" action={<Button color="inherit" onClick={loadCategories}>Thử lại</Button>}>
            {error}
          </Alert>
        )}
        {!loading && !error && categories.length === 0 && <Alert severity="info">Chưa có danh mục sản phẩm.</Alert>}
        {!loading && !error && categories.length > 0 && (
          <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2, 1fr)',md:'repeat(5, 1fr)'},gap:2}}>
            {categories.map(category => <CategoryCard key={category._id || category.slug} {...category}/>)}
          </Box>
        )}
      </Box>

      <Paper component="section" variant="outlined" sx={{p:{xs:3,md:4},bgcolor:'background.paper'}}>
        <Stack spacing={1}>
          <Typography component="h2" variant="h5" fontWeight={800}>Danh mục sản phẩm đang được hoàn thiện</Typography>
          <Typography color="text.secondary">
            Sản phẩm mới và sản phẩm bán chạy sẽ được hiển thị từ Catalog Service trong giai đoạn tiếp theo.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

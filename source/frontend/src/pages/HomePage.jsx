import {useCallback,useEffect,useState} from 'react';
import {Alert,Box,Button,Chip,Paper,Skeleton,Stack,Typography} from '@mui/material';
import {Link} from 'react-router-dom';

import ProductSection from '../features/products/ProductSection.jsx';
import {
  catalogErrorMessage,
  fetchCategories,
  fetchProducts
} from '../features/products/catalogApi.js';

function getCategoryCode(name) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0,3).toUpperCase();
}

function CategoryCard({name,description,slug}) {
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{height:'100%',overflow:'hidden',transition:'transform 160ms ease, box-shadow 160ms ease','&:hover':{transform:'translateY(-3px)',boxShadow:3}}}
    >
      <Stack
        component={Link}
        to={`/products?category=${slug}`}
        spacing={1.5}
        sx={{height:'100%',p:2.5,color:'inherit',textDecoration:'none'}}
      >
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
  const [newProducts,setNewProducts] = useState([]);
  const [bestSellers,setBestSellers] = useState([]);
  const [categorySections,setCategorySections] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [items,newest,best] = await Promise.all([
        fetchCategories({featured:true}),
        fetchProducts({page:1,limit:4,sort:'newest'}),
        fetchProducts({page:1,limit:4,sort:'best_selling'})
      ]);

      const sectionResults = await Promise.all(
        items.slice(0,3).map(async category => ({
          category,
          products:(await fetchProducts({page:1,limit:4,category:category.slug,sort:'name_asc'})).items
        }))
      );

      setCategories(items);
      setNewProducts(newest.items);
      setBestSellers(best.items);
      setCategorySections(sectionResults);
    } catch (errorValue) {
      setError(catalogErrorMessage(errorValue,'Không tải được dữ liệu catalog.'));
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
        sx={{position:'relative',overflow:'hidden',p:{xs:3,sm:5,md:7},color:'common.white',background:'linear-gradient(125deg, #102f29 0%, #245f50 58%, #d79537 160%)','&::after':{content:'""',position:'absolute',width:280,height:280,borderRadius:'50%',right:-70,top:-110,border:'54px solid rgba(255,255,255,0.07)'}}}
      >
        <Stack spacing={2.5} maxWidth={760} sx={{position:'relative',zIndex:1}}>
          <Chip label="Máy tính & linh kiện" sx={{alignSelf:'flex-start',bgcolor:'rgba(255,255,255,0.14)',color:'inherit',fontWeight:700}}/>
          <Typography component="h1" variant="h3" sx={{fontSize:{xs:'2.15rem',sm:'3rem',md:'3.65rem'},lineHeight:1.08}}>
            Không gian cho cấu hình tiếp theo của bạn.
          </Typography>
          <Typography sx={{maxWidth:620,color:'rgba(255,255,255,0.78)',fontSize:{xs:'1rem',md:'1.15rem'}}}>
            Khám phá laptop, màn hình và phụ kiện máy tính được sắp xếp rõ ràng cho từng nhu cầu.
          </Typography>
          <Stack direction={{xs:'column',sm:'row'}} spacing={1.5}>
            <Button component={Link} to="/products" variant="contained" color="secondary" size="large">Khám phá sản phẩm</Button>
            <Button component={Link} to="/products?sort=best_selling" variant="outlined" size="large" sx={{color:'common.white',borderColor:'rgba(255,255,255,0.55)','&:hover':{borderColor:'common.white'}}}>Xem sản phẩm bán chạy</Button>
          </Stack>
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

      {!loading && !error && <ProductSection title="Sản phẩm mới" description="Các sản phẩm vừa được cập nhật trong catalog." products={newProducts} actionTo="/products?sort=newest"/>}
      {!loading && !error && <ProductSection title="Bán chạy" description="Những lựa chọn nổi bật theo dữ liệu bán hàng." products={bestSellers} actionTo="/products?sort=best_selling"/>}
      {!loading && !error && categorySections.map(({category,products}) => (
        <ProductSection
          key={category.slug}
          title={category.name}
          description={category.description}
          products={products}
          actionTo={`/products?category=${category.slug}`}
        />
      ))}
    </Stack>
  );
}

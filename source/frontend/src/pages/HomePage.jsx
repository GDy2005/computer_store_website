import {Box,Chip,Paper,Stack,Typography} from '@mui/material';

const categories = [
  {code:'LT',name:'Laptop',description:'Học tập, văn phòng và gaming'},
  {code:'MN',name:'Màn hình',description:'Không gian hiển thị sắc nét'},
  {code:'KB',name:'Bàn phím',description:'Làm việc và giải trí thoải mái'},
  {code:'MS',name:'Chuột',description:'Điều khiển chính xác mỗi ngày'},
  {code:'SSD',name:'Lưu trữ',description:'Nâng cấp tốc độ và dung lượng'}
];

function CategoryCard({code,name,description}) {
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
          {code}
        </Box>
        <Typography component="h3" variant="h6" fontWeight={700}>{name}</Typography>
        <Typography color="text.secondary" variant="body2">{description}</Typography>
      </Stack>
    </Paper>
  );
}

export default function HomePage() {
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
          <Typography color="text.secondary">Năm nhóm sản phẩm chính đang được chuẩn bị cho danh mục cửa hàng.</Typography>
        </Stack>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2, 1fr)',md:'repeat(5, 1fr)'},gap:2}}>
          {categories.map(category => <CategoryCard key={category.name} {...category}/>)}
        </Box>
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

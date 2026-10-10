export async function listCategories(Category, {featured} = {}) {
  const filter = {isActive:true};
  if (typeof featured === 'boolean') filter.isFeatured = featured;
  return Category.find(filter)
    .select('name slug description imageUrl isFeatured')
    .sort({name:1})
    .lean();
}

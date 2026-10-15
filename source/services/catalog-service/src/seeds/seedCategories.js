export async function seedCategories({
  Category,
  categories,
  session
}) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error(
      'categories.json must contain at least one category'
    );
  }

  const slugs = categories.map(category => category.slug);

  if (new Set(slugs).size !== slugs.length) {
    throw new Error(
      'categories.json contains duplicate slugs'
    );
  }

  await Promise.all(
    categories.map(category =>
      new Category(category).validate()
    )
  );

  await Category.bulkWrite(
    categories.map(category => ({
      updateOne: {
        filter: {slug: category.slug},
        update: {$set: category},
        upsert: true
      }
    })),
    {session}
  );

  return categories.length;
}

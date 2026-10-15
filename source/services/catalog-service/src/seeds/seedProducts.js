import mongoose from 'mongoose';

export async function seedProducts({
  Product,
  Category,
  products,
  session
}) {
  if (!Array.isArray(products) || products.length < 40) {
    throw new Error(
      'products.json must contain at least 40 products'
    );
  }

  const slugs = products.map(product => product.slug);

  if (new Set(slugs).size !== slugs.length) {
    throw new Error(
      'products.json contains duplicate product slugs'
    );
  }

  const allSkus = products.flatMap(product =>
    Array.isArray(product.variants)
      ? product.variants.map(variant =>
          String(variant.sku).trim().toUpperCase()
        )
      : []
  );

  if (new Set(allSkus).size !== allSkus.length) {
    throw new Error(
      'products.json contains duplicate variant SKUs'
    );
  }

  const categories = await Category.find()
    .session(session)
    .lean();

  const categoryMap = new Map(
    categories.map(category => [
      category.slug,
      category
    ])
  );

  for (const input of products) {
    const category = categoryMap.get(
      input.categorySlug
    );

    if (!category) {
      throw new Error(
        `Unknown category: ${input.categorySlug}`
      );
    }

    const existing = await Product.findOne({
      slug: input.slug
    }).session(session);

    const existingVariants = new Map(
      (existing?.variants || []).map(variant => [
        variant.sku.toUpperCase(),
        variant
      ])
    );

    const variants = input.variants.map(variant => {
      const sku = variant.sku.trim().toUpperCase();
      const current =
        existingVariants.get(sku);

      return {
        ...variant,
        _id: current?._id ||
          new mongoose.Types.ObjectId(),
        sku,
        stock: current?.stock ?? variant.stock,
        reservedStock:
          current?.reservedStock ?? 0
      };
    });

    const productData = {
      name: input.name,
      slug: input.slug,
      brand: input.brand,
      categoryId: category._id,
      tags: input.tags,
      shortDescription: input.shortDescription,
      description: input.description,
      images: input.images,
      variants,
      isActive: input.isActive ?? true
    };

    if (existing) {
      Object.assign(existing, productData);
      await existing.save({session});
    } else {
      await Product.create([productData], {session});
    }
  }

  return products.length;
}

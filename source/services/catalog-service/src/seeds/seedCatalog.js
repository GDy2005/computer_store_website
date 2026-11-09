import {readFileSync} from 'node:fs';
import mongoose from 'mongoose';

import {
  registerCatalogModels
} from '../config/database.js';

import {
  seedCategories
} from './seedCategories.js';

import {
  seedProducts
} from './seedProducts.js';

if (process.env.DB_NAME !== 'catalog_db') {
  throw new Error(
    'Catalog seed may only write to catalog_db'
  );
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI required');
}

function readSeedData(fileName) {
  return JSON.parse(
    readFileSync(
      new URL(`./data/${fileName}`, import.meta.url),
      'utf8'
    )
  );
}

const categories = readSeedData('categories.json');
const products = readSeedData('products.json');

const retiredProductSlugs = [
  'logitech-g560-lightsync',
  'creative-pebble-v3',
  'edifier-r1280dbs',
  'jbl-quantum-duo',
  'creator-pro-amd-desktop'
];

async function removeRetiredSeedData({
  Category,
  Product,
  session
}) {
  await Product.deleteMany(
    {slug: {$in: retiredProductSlugs}},
    {session}
  );

  const speakerCategory = await Category.findOne({
    slug: 'loa'
  }).session(session);

  if (!speakerCategory) return;

  const remainingProduct = await Product.exists({
    categoryId: speakerCategory._id
  }).session(session);

  if (!remainingProduct) {
    await Category.deleteOne(
      {_id: speakerCategory._id},
      {session}
    );
  }
}

const connection = await mongoose
  .createConnection(
    process.env.MONGODB_URI,
    {dbName: process.env.DB_NAME}
  )
  .asPromise();

try {
  const {Category, Product} =
    registerCatalogModels(connection);

  await Promise.all([
    Category.init(),
    Product.init()
  ]);

  const {categoryCount, productCount} =
    await connection.transaction(async session => {
      await removeRetiredSeedData({
        Category,
        Product,
        session
      });

      return {
        categoryCount: await seedCategories({
        Category,
        categories,
        session
      }),
        productCount: await seedProducts({
          Product,
          Category,
          products,
          session
        })
      };
    });

  console.log(
    `Seeded ${categoryCount} categories and ${productCount} products`
  );
} finally {
  await connection.close();
}

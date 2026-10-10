import {readFileSync} from 'node:fs';
import mongoose from 'mongoose';
import {getCategoryModel} from '../modules/categories/category.model.js';

if (process.env.DB_NAME !== 'catalog_db') throw new Error('Category seed may only write to catalog_db');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI required');

const categories = JSON.parse(readFileSync(new URL('./categories.json', import.meta.url), 'utf8'));
const connection = await mongoose.createConnection(process.env.MONGODB_URI, {dbName:process.env.DB_NAME}).asPromise();

try {
  const Category = getCategoryModel(connection);
  await Category.init();
  await Category.bulkWrite(categories.map(category => ({
    updateOne:{filter:{slug:category.slug},update:{$set:category},upsert:true}
  })));
  console.log(`Seeded ${categories.length} categories`);
} finally {
  await connection.close();
}

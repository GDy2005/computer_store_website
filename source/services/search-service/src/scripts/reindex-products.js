import {createCatalogClient} from '../clients/catalog-client.service.js';
import {createElasticsearchClient} from '../config/elasticsearch.js';

const searchIndex = createElasticsearchClient();
const catalogClient = createCatalogClient();

const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

async function retry(label, operation, attempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(1000 * (2 ** (attempt - 1)), 5000);
      console.warn(
        `${label} failed (${attempt}/${attempts}); retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function indexProducts(products, concurrency = 5) {
  for (let offset = 0; offset < products.length; offset += concurrency) {
    const batch = products.slice(offset, offset + concurrency);
    await Promise.all(
      batch.map(product =>
        retry(
          `Index product ${product._id || product.productId}`,
          () => searchIndex.indexProduct(product)
        )
      )
    );
  }
}

await retry('Create Elasticsearch index', () => searchIndex.ensureIndex());
await retry('Clear Elasticsearch index', () => searchIndex.clearProducts());

let page = 1;
let indexed = 0;
let totalPages = 1;

do {
  const result = await retry(
    `Read catalog page ${page}`,
    () => catalogClient.getProducts(page, 50)
  );
  await indexProducts(result.items);
  indexed += result.items.length;
  totalPages = result.meta.totalPages;
  page += 1;
} while (page <= totalPages);

console.log(`Indexed ${indexed} products into Elasticsearch`);

import {createCatalogClient} from '../clients/catalog-client.service.js';
import {createElasticsearchClient} from '../config/elasticsearch.js';

const searchIndex = createElasticsearchClient();
const catalogClient = createCatalogClient();

await searchIndex.ensureIndex();
await searchIndex.clearProducts();

let page = 1;
let indexed = 0;
let totalPages = 1;

do {
  const result = await catalogClient.getProducts(page, 50);
  await Promise.all(
    result.items.map(product =>
      searchIndex.indexProduct(product)
    )
  );
  indexed += result.items.length;
  totalPages = result.meta.totalPages;
  page += 1;
} while (page <= totalPages);

console.log(`Indexed ${indexed} products into Elasticsearch`);

import {createCatalogClient} from './clients/catalog-client.service.js';
import {createElasticsearchClient} from './config/elasticsearch.js';
import {createSearchConsumers} from './events/search.consumer.js';

export async function configureSearchRuntime() {
  const searchIndex = createElasticsearchClient();
  const catalogClient = createCatalogClient();

  return {
    models: {SearchIndex: searchIndex},
    consumers: createSearchConsumers({
      searchIndex,
      catalogClient
    }),
    start() {
      return searchIndex.ensureIndex();
    },
    ready() {
      return searchIndex.ready();
    }
  };
}

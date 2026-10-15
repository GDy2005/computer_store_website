import {readFileSync} from 'node:fs';

import {AppError} from '@store/validation';

const defaultMapping = JSON.parse(
  readFileSync(
    new URL(
      '../../../../infra/elasticsearch/product-index-mapping.json',
      import.meta.url
    ),
    'utf8'
  )
);

function toDocument(product) {
  return {
    productId: String(product._id || product.productId),
    slug: product.slug,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand,
    category:
      product.categoryId?.slug ||
      product.categorySlug ||
      String(product.categoryId || ''),
    tags: product.tags || [],
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    averageRating: product.averageRating || 0,
    ratingCount: product.ratingCount || 0,
    soldCount: product.soldCount || 0,
    isActive: product.isActive !== false,
    imageUrl: product.images?.[0]?.url || '',
    createdAt:
      product.createdAt || new Date(0).toISOString(),
    suggest: {
      input: [product.name, product.brand, ...(product.tags || [])]
    }
  };
}

function sortDefinition(sort) {
  return {
    name_asc: [{'name.keyword': 'asc'}],
    name_desc: [{'name.keyword': 'desc'}],
    price_asc: [{minPrice: 'asc'}, {'name.keyword': 'asc'}],
    price_desc: [{maxPrice: 'desc'}, {'name.keyword': 'asc'}],
    newest: [{createdAt: 'desc'}],
    best_selling: [{soldCount: 'desc'}, {createdAt: 'desc'}]
  }[sort];
}

export function createElasticsearchClient({
  baseUrl = process.env.ELASTICSEARCH_URL ||
    'http://elasticsearch:9200',
  indexName = process.env.ELASTICSEARCH_PRODUCT_INDEX ||
    'products_v1'
} = {}) {
  const root = baseUrl.replace(/\/$/, '');
  const indexPath = `/${encodeURIComponent(indexName)}`;

  async function request(path, {
    method = 'GET',
    body,
    allowNotFound = false
  } = {}) {
    let response;

    try {
      response = await fetch(`${root}${path}`, {
        method,
        headers: body
          ? {'content-type': 'application/json'}
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw new AppError(
        503,
        'SEARCH_UNAVAILABLE',
        'Search service is unavailable'
      );
    }

    if (allowNotFound && response.status === 404) {
      return undefined;
    }

    const payload = method === 'HEAD' || response.status === 204
      ? true
      : await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(
        503,
        'SEARCH_UNAVAILABLE',
        payload?.error?.reason || 'Search service is unavailable'
      );
    }

    return payload;
  }

  async function ensureIndex() {
    const exists = await request(indexPath, {
      method: 'HEAD',
      allowNotFound: true
    });

    if (!exists) {
      await request(indexPath, {
        method: 'PUT',
        body: defaultMapping
      });
    }
  }

  async function ready() {
    const result = await request(
      '/_cluster/health?wait_for_status=yellow&timeout=2s'
    );
    return ['green', 'yellow'].includes(result.status);
  }

  function indexProduct(product) {
    const document = toDocument(product);
    return request(
      `${indexPath}/_doc/${encodeURIComponent(document.productId)}?refresh=wait_for`,
      {method: 'PUT', body: document}
    );
  }

  function deleteProduct(productId) {
    return request(
      `${indexPath}/_doc/${encodeURIComponent(productId)}?refresh=wait_for`,
      {method: 'DELETE', allowNotFound: true}
    );
  }

  function updateRating({productId, averageRating, ratingCount}) {
    return request(
      `${indexPath}/_update/${encodeURIComponent(productId)}?refresh=wait_for`,
      {
        method: 'POST',
        body: {doc: {averageRating, ratingCount}},
        allowNotFound: true
      }
    );
  }

  async function clearProducts() {
    await request(
      `${indexPath}/_delete_by_query?conflicts=proceed&refresh=true`,
      {method: 'POST', body: {query: {match_all: {}}}}
    );
  }

  async function search(query) {
    const must = query.search
      ? [{
          multi_match: {
            query: query.search,
            fields: ['name^4', 'brand^2', 'tags^2', 'shortDescription', 'description'],
            fuzziness: 'AUTO'
          }
        }]
      : [];
    const filter = [{term: {isActive: true}}];

    if (query.category) {
      filter.push({term: {category: query.category}});
    }

    if (query.brand) {
      filter.push({term: {brand: query.brand}});
    }

    if (query.minPrice !== undefined) {
      filter.push({range: {maxPrice: {gte: query.minPrice}}});
    }

    if (query.maxPrice !== undefined) {
      filter.push({range: {minPrice: {lte: query.maxPrice}}});
    }

    if (query.minRating !== undefined) {
      filter.push({range: {averageRating: {gte: query.minRating}}});
    }

    const result = await request(`${indexPath}/_search`, {
      method: 'POST',
      body: {
        from: (query.page - 1) * query.limit,
        size: query.limit,
        track_total_hits: true,
        query: {bool: {must, filter}},
        sort: sortDefinition(query.sort)
      }
    });
    const totalItems = typeof result.hits.total === 'number'
      ? result.hits.total
      : result.hits.total.value;

    return {
      items: result.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.limit))
      }
    };
  }

  return {
    ensureIndex,
    ready,
    indexProduct,
    deleteProduct,
    updateRating,
    clearProducts,
    search
  };
}

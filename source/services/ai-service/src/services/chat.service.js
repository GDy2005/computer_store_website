import {extractIntent} from './intent.service.js';

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

function publicProduct(product) {
  return {
    productId: String(product.productId),
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    averageRating: product.averageRating || 0,
    ratingCount: product.ratingCount || 0,
    imageUrl: product.imageUrl || '',
    shortDescription: product.shortDescription || '',
    url: `/products/${encodeURIComponent(product.slug)}`
  };
}

function priceLabel(product) {
  if (product.minPrice === product.maxPrice) {
    return vnd.format(product.minPrice);
  }

  return `${vnd.format(product.minPrice)} – ${vnd.format(product.maxPrice)}`;
}

function answerFor(products) {
  const details = products
    .map(product => `${product.name} (${priceLabel(product)})`)
    .join('; ');

  return `Mình tìm thấy ${products.length} lựa chọn phù hợp: ${details}. ` +
    'Giá và liên kết được lấy trực tiếp từ dữ liệu cửa hàng; hãy mở sản phẩm để chọn phiên bản và kiểm tra tồn kho hiện tại.';
}

function selectProducts(candidates, selectedIds) {
  const byId = new Map(candidates.map(product => [
    String(product.productId),
    product
  ]));
  const selected = [];

  for (const id of selectedIds || []) {
    const product = byId.get(String(id));

    if (product && !selected.includes(product)) {
      selected.push(product);
    }
  }

  return selected.slice(0, 3);
}

export function createChatService({searchClient, aiProvider}) {
  return {
    async reply({message, requestId}) {
      const intent = extractIntent(message);

      if (intent.unsupported) {
        return {
          answer: 'Cửa hàng hiện chỉ tư vấn laptop, màn hình, bàn phím, chuột và SSD/lưu trữ. Mình không đề xuất sản phẩm ngoài các nhóm này.',
          products: [],
          meta: {grounded: true, strategy: 'scope-guard', intent}
        };
      }

      const filters = {
        page: 1,
        limit: 8,
        category: intent.category,
        brand: intent.brand,
        minPrice: intent.minPrice,
        maxPrice: intent.maxPrice,
        search: intent.search,
        sort: intent.maxPrice !== undefined ? 'price_desc' : 'best_selling'
      };
      let result = await searchClient.search(filters, requestId);

      if (!result.items.length && filters.search) {
        const relaxed = {...filters};
        delete relaxed.search;
        result = await searchClient.search(relaxed, requestId);
      }

      const candidates = result.items.filter(product =>
        product?.productId && product?.slug && product?.name &&
        Number.isFinite(product?.minPrice) &&
        Number.isFinite(product?.maxPrice)
      );

      if (!candidates.length) {
        return {
          answer: 'Mình chưa tìm thấy sản phẩm phù hợp trong dữ liệu cửa hàng. Bạn có thể thử nới ngân sách, bỏ bớt điều kiện thương hiệu hoặc chọn một danh mục khác.',
          products: [],
          meta: {grounded: true, strategy: 'no-results', intent}
        };
      }

      let selected = [];
      let strategy = 'deterministic-fallback';

      try {
        const selectedIds = await aiProvider.chooseProducts({
          intent,
          candidates,
          requestId
        });
        selected = selectProducts(candidates, selectedIds);
        if (selected.length) strategy = 'provider-ranked';
      } catch {
        // Provider failures are intentionally hidden and handled locally.
      }

      if (!selected.length) selected = candidates.slice(0, 3);

      const products = selected.map(publicProduct);

      return {
        answer: answerFor(products),
        products,
        meta: {grounded: true, strategy, intent}
      };
    }
  };
}

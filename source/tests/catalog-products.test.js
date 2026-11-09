import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import mongoose from 'mongoose';

import {buildApp} from '../services/catalog-service/src/app.js';
import {
  createProductService
} from '../services/catalog-service/src/services/productService.js';
import {
  createUploadController
} from '../services/catalog-service/src/controllers/uploadController.js';
import {
  seedProducts
} from '../services/catalog-service/src/seeds/seedProducts.js';

test('product catalog app and upload controller are importable', () => {
  assert.equal(typeof buildApp, 'function');
  assert.equal(typeof createUploadController, 'function');
});

test('catalog seed data lives in the data directory', () => {
  const categories = JSON.parse(
    readFileSync(
      new URL(
        '../services/catalog-service/src/seeds/data/categories.json',
        import.meta.url
      ),
      'utf8'
    )
  );

  const products = JSON.parse(
    readFileSync(
      new URL(
        '../services/catalog-service/src/seeds/data/products.json',
        import.meta.url
      ),
      'utf8'
    )
  );

  assert.equal(categories.length, 6);
  assert.ok(Array.isArray(products));
  assert.equal(products.length, 46);
  assert.equal(
    products.filter(product => product.categorySlug === 'pc').length,
    5
  );
  assert.equal(
    products.filter(product => product.categorySlug === 'laptop').length,
    9
  );
  assert.ok(products.some(product => product.slug === 'pc-omen-35l-valorant'));
  assert.ok(products.some(product => product.slug === 'combo-pc-asus-rog-hatsune-miku-edition'));
  assert.ok(products.some(product => product.slug === 'hp-hyperx-omen-16-ap1010ax-valorant-edition'));
  assert.ok(products.every(product => product.slug !== 'creator-pro-amd-desktop'));
  assert.ok(products.every(product => product.categorySlug !== 'loa'));
});

test('product seed requires at least forty products', async () => {
  await assert.rejects(
    seedProducts({products: []}),
    /at least 40 products/
  );
});

test('public product output preserves MongoDB IDs and hides cost data', async () => {
  const productId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();
  const document = {
    _id: productId,
    variants: [
      {
        _id: variantId,
        sku: 'MOUSE-BLACK',
        isActive: true,
        price: 1000000,
        costPrice: 700000,
        stock: 10,
        reservedStock: 3
      }
    ]
  };

  const query = {
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    async lean() {
      return [document];
    }
  };

  const productService = createProductService({
    Product: {
      find() {
        return query;
      },
      async countDocuments() {
        return 1;
      }
    }
  });

  const result = await productService.listPublic({
    page: 1,
    limit: 12,
    sort: 'newest'
  });

  const item = result.items[0];

  assert.equal(item._id, productId);
  assert.equal(item.variants[0]._id, variantId);
  assert.equal(item.variants[0].costPrice, undefined);
  assert.equal(item.variants[0].reservedStock, undefined);
  assert.equal(item.variants[0].availableStock, 7);
  assert.equal(
    JSON.parse(JSON.stringify(item))._id,
    productId.toHexString()
  );
});

test('product filters come from active catalog data', async () => {
  const categoryId = new mongoose.Types.ObjectId();
  const categoryQuery = {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    async lean() {
      return [{_id: categoryId, name: 'Laptop', slug: 'laptop'}];
    }
  };

  const productService = createProductService({
    Category: {
      find(filter) {
        assert.deepEqual(filter, {isActive: true});
        return categoryQuery;
      }
    },
    Product: {
      async aggregate(pipeline) {
        assert.deepEqual(pipeline[0], {$match: {isActive: true}});
        return [{
          categories: [{_id: categoryId, count: 3}],
          brands: [{_id: 'Lenovo', count: 2}, {_id: 'Apple', count: 1}],
          availability: [{_id: true, count: 2}, {_id: false, count: 1}],
          priceRange: [{minPrice: 1000000, maxPrice: 50000000}]
        }];
      }
    }
  });

  const result = await productService.getPublicFilters();

  assert.deepEqual(result, {
    categories: [{_id: categoryId, name: 'Laptop', slug: 'laptop', count: 3}],
    brands: [{name: 'Apple', count: 1}, {name: 'Lenovo', count: 2}],
    availability: {inStock: 2, outOfStock: 1},
    priceRange: {min: 1000000, max: 50000000}
  });
});

test('stock filter checks active variants after reservations', async () => {
  const captured = [];
  const query = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async lean() { return []; }
  };
  const productService = createProductService({
    Product: {
      find(filter) {
        captured.push(filter);
        return query;
      },
      async countDocuments() { return 0; }
    }
  });

  await productService.listPublic({page: 1, limit: 12, sort: 'newest', inStock: true});
  await productService.listPublic({page: 1, limit: 12, sort: 'newest', inStock: false});

  const available = captured[0].$expr;
  assert.ok(available.$anyElementTrue[0].$map);
  assert.deepEqual(
    available.$anyElementTrue[0].$map.in.$and[1].$gt[0].$subtract,
    ['$$variant.stock', {$ifNull: ['$$variant.reservedStock', 0]}]
  );
  assert.deepEqual(captured[1].$expr, {$not: [available]});
});

test('product update preserves variant IDs and reserved stock', async () => {
  const productId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const firstVariantId = new mongoose.Types.ObjectId();
  const secondVariantId = new mongoose.Types.ObjectId();

  const product = {
    _id: productId,
    slug: 'example-ssd',
    name: 'Example SSD',
    description: 'Example description',
    brand: 'Example',
    categoryId,
    tags: ['ssd'],
    minPrice: 1000000,
    maxPrice: 2000000,
    averageRating: 0,
    isActive: true,
    variants: [
      {
        _id: firstVariantId,
        sku: 'SSD-1TB',
        reservedStock: 2
      },
      {
        _id: secondVariantId,
        sku: 'SSD-2TB',
        reservedStock: 0
      }
    ],
    async save() {},
    toObject() {
      return {variants: this.variants};
    }
  };

  const productService = createProductService({
    connection: {
      transaction(handler) {
        return handler({});
      }
    },
    Product: {
      findById() {
        return {
          session() {
            return product;
          }
        };
      }
    },
    Outbox: {
      async create() {}
    }
  });

  const result = await productService.update({
    productId: productId.toHexString(),
    correlationId: 'request-1',
    input: {
      variants: [
        {
          sku: 'SSD-1TB',
          name: '1TB',
          attributes: {capacity: '1TB'},
          price: 1100000,
          costPrice: 800000,
          stock: 20,
          isActive: true
        },
        {
          sku: 'SSD-2TB',
          name: '2TB',
          attributes: {capacity: '2TB'},
          price: 2100000,
          costPrice: 1600000,
          stock: 10,
          isActive: true
        }
      ]
    }
  });

  assert.equal(result.variants[0]._id, firstVariantId);
  assert.equal(result.variants[0].reservedStock, 2);
  assert.equal(result.variants[1]._id, secondVariantId);
});

test('upload controller returns uploaded image metadata', async () => {
  const images = [
    {
      url: 'https://example.com/image.webp',
      publicId: 'products/image',
      alt: 'image.webp'
    }
  ];

  const controller = createUploadController({
    uploadService: {
      async uploadImages(files) {
        assert.equal(files.length, 1);
        return images;
      }
    }
  });

  let statusCode;
  let payload;

  await controller.upload(
    {files: [{}]},
    {
      status(value) {
        statusCode = value;
        return this;
      },
      json(value) {
        payload = value;
      }
    },
    error => {
      throw error;
    }
  );

  assert.equal(statusCode, 201);
  assert.deepEqual(payload, {
    success: true,
    message: 'Images uploaded successfully',
    data: {images}
  });
});

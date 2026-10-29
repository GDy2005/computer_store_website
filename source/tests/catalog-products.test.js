import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import mongoose from 'mongoose';

import {buildApp} from '../services/catalog-service/src/app.js';
import {
  createProductService
} from '../services/catalog-service/src/services/product.service.js';
import {
  createUploadController
} from '../services/catalog-service/src/controllers/upload.controller.js';
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

  assert.equal(categories.length, 5);
  assert.ok(Array.isArray(products));
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
  const categoryQuery = {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    async lean() {
      return [{name: 'Laptop', slug: 'laptop'}];
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
      async distinct(field, filter) {
        assert.equal(field, 'brand');
        assert.deepEqual(filter, {isActive: true});
        return ['Lenovo', 'Apple'];
      },
      async aggregate() {
        return [{minPrice: 1000000, maxPrice: 50000000}];
      }
    }
  });

  const result = await productService.getPublicFilters();

  assert.deepEqual(result, {
    categories: [{name: 'Laptop', slug: 'laptop'}],
    brands: ['Apple', 'Lenovo'],
    priceRange: {min: 1000000, max: 50000000}
  });
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
    data: {images}
  });
});

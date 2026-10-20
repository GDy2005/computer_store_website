import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateEvent} from '@store/event-contracts';

import {
  createCommentService
} from '../services/catalog-service/src/services/comment.service.js';
import {
  createRatingService
} from '../services/catalog-service/src/services/rating.service.js';

test('guest comment is sanitized, keeps email private and writes an event', async () => {
  const productId = '507f1f77bcf86cd799439011';
  let savedInput;
  let outbox;
  const comment = {
    _id: {toString: () => '507f1f77bcf86cd799439012'},
    productId: {toString: () => productId},
    displayName: 'Guest A',
    guestEmail: 'guest@example.com',
    content: 'Sản phẩm tốt',
    toObject() {
      return {...this, _id: this._id.toString(), productId};
    }
  };
  const service = createCommentService({
    connection: {transaction: handler => handler({})},
    Product: {async exists() { return true; }},
    Comment: {
      async create(rows) {
        [savedInput] = rows;
        comment.content = rows[0].content;
        return [comment];
      }
    },
    Outbox: {async create(rows) { [outbox] = rows; }},
    identityClient: {
      async getUserSummary() {
        assert.fail('Guest comment must not call Identity Service');
      }
    }
  });

  const result = await service.create({
    productId,
    input: {
      guestName: 'Guest A',
      guestEmail: 'guest@example.com',
      content: '<b>Sản phẩm tốt</b><script>alert(1)</script>'
    },
    userId: null,
    requestId: randomUUID()
  });

  assert.equal(savedInput.content, 'Sản phẩm tốt');
  assert.equal(result.guestEmail, undefined);
  assert.equal(outbox.topic, 'comments.created.v1');
  assert.equal(outbox.payload.payload.content, 'Sản phẩm tốt');
  assert.equal(outbox.payload.payload.guestEmail, undefined);
  validateEvent(outbox.topic, outbox.payload);
});

test('rating upsert recalculates cached average and writes a valid event', async () => {
  const productId = '507f1f77bcf86cd799439011';
  const product = {
    _id: {toString: () => productId},
    averageRating: 0,
    ratingCount: 0,
    async save() {}
  };
  let ratingUpdate;
  let outbox;
  const service = createRatingService({
    connection: {transaction: handler => handler({})},
    Product: {
      findOne() {
        return {session: async () => product};
      }
    },
    Rating: {
      async findOneAndUpdate(filter, update) {
        ratingUpdate = {filter, update};
      },
      aggregate() {
        return {session: async () => [{averageRating: 4.5, ratingCount: 2}]};
      }
    },
    Outbox: {async create(rows) { [outbox] = rows; }},
    identityClient: {
      async getUserSummary() { return {userId: 'user-1'}; }
    }
  });

  const result = await service.upsert({
    productId,
    userId: 'user-1',
    stars: 5,
    requestId: randomUUID()
  });

  assert.deepEqual(ratingUpdate, {
    filter: {productId, userId: 'user-1'},
    update: {$set: {stars: 5}}
  });
  assert.deepEqual(result, {averageRating: 4.5, ratingCount: 2});
  assert.equal(product.averageRating, 4.5);
  assert.equal(product.ratingCount, 2);
  validateEvent(outbox.topic, outbox.payload);
});

test('rating summary includes only the signed-in user rating', async () => {
  const productId = '507f1f77bcf86cd799439011';
  const product = {
    _id: productId,
    averageRating: 4,
    ratingCount: 3
  };
  const service = createRatingService({
    Product: {
      findOne() {
        return {
          select() { return this; },
          async lean() { return product; }
        };
      }
    },
    Rating: {
      async aggregate() { return [{_id: 5, count: 2}, {_id: 2, count: 1}]; },
      findOne(filter) {
        assert.deepEqual(filter, {productId, userId: 'user-1'});
        return {async lean() { return {stars: 5}; }};
      }
    }
  });

  const result = await service.getSummary(productId, 'user-1');

  assert.equal(result.myRating, 5);
  assert.deepEqual(result.distribution, {'2': 1, '5': 2});
});

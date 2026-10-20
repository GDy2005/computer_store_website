import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvent} from '@store/event-contracts';

import {
  emitProductEvent,
  productRoom,
  registerProductRooms
} from '../api-gateway/src/services/realtime.service.js';

test('realtime Gateway emits catalog events only to the product room', () => {
  const productId = '507f1f77bcf86cd799439011';
  const calls = [];
  const io = {
    to(room) {
      return {
        emit(name, payload) { calls.push({room, name, payload}); }
      };
    }
  };
  const event = createEvent('comments.created.v1', {
    producer: 'catalog-service',
    key: productId,
    correlationId: 'request-1',
    payload: {
      commentId: '507f1f77bcf86cd799439012',
      productId,
      displayName: 'Guest A',
      content: 'Sản phẩm tốt'
    }
  });

  assert.equal(emitProductEvent(io, event), true);
  assert.equal(calls[0].room, productRoom(productId));
  assert.equal(calls[0].name, 'comment.created');
  assert.equal(calls[0].payload.commentId, event.payload.commentId);
  assert.equal(calls[0].payload.occurredAt, event.occurredAt);
});

test('socket joins one validated product room and rejects malformed IDs', async () => {
  let connectionHandler;
  const handlers = {};
  const socket = {
    rooms: new Set(['socket-1', 'product:507f1f77bcf86cd799439099']),
    on(name, handler) { handlers[name] = handler; },
    async leave(room) { this.rooms.delete(room); },
    async join(room) { this.rooms.add(room); }
  };
  registerProductRooms({
    on(name, handler) {
      assert.equal(name, 'connection');
      connectionHandler = handler;
    }
  });
  connectionHandler(socket);

  let invalid;
  await handlers['product:join']('bad-id', result => { invalid = result; });
  assert.equal(invalid.success, false);

  const productId = '507f1f77bcf86cd799439011';
  let accepted;
  await handlers['product:join'](productId, result => { accepted = result; });
  assert.deepEqual(accepted, {success: true, productId});
  assert.deepEqual(
    [...socket.rooms],
    ['socket-1', `product:${productId}`]
  );
});

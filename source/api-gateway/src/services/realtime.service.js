import {createAdapter} from '@socket.io/redis-adapter';
import {validateEvent} from '@store/event-contracts';
import {kafkaClient} from '@store/kafka-client';
import {log} from '@store/logger';
import {Server} from 'socket.io';

const realtimeTopics = [
  'comments.created.v1',
  'ratings.updated.v1'
];

const objectIdPattern = /^[a-f\d]{24}$/i;
const gatewayInstance =
  process.env.INSTANCE_ID || process.env.HOSTNAME || 'gateway';

export function productRoom(productId) {
  return `product:${productId}`;
}

export function registerProductRooms(io) {
  io.on('connection', socket => {
    socket.on('product:join', async (productId, acknowledge) => {
      if (typeof productId !== 'string' || !objectIdPattern.test(productId)) {
        acknowledge?.({success: false, error: 'Invalid product ID'});
        return;
      }

      for (const room of socket.rooms) {
        if (room.startsWith('product:')) await socket.leave(room);
      }

      await socket.join(productRoom(productId));
      acknowledge?.({success: true, productId});
    });

    socket.on('product:leave', async productId => {
      if (typeof productId === 'string' && objectIdPattern.test(productId)) {
        await socket.leave(productRoom(productId));
      }
    });
  });
}

export function emitProductEvent(io, event) {
  const productId = event.payload.productId;
  const eventName = event.eventType === 'comment.created'
    ? 'comment.created'
    : event.eventType === 'rating.updated'
      ? 'rating.updated'
      : null;

  if (!eventName) return false;

  io.to(productRoom(productId)).emit(eventName, {
    ...event.payload,
    occurredAt: event.occurredAt
  });
  return true;
}

export function createRealtimeService({
  server,
  redis,
  kafka = kafkaClient(
    `realtime-${gatewayInstance}`
  )
}) {
  const io = new Server(server, {
    path: '/socket.io',
    serveClient: false,
    transports: ['websocket']
  });
  const publisher = redis.duplicate();
  const subscriber = redis.duplicate();
  const consumer = kafka.consumer({
    groupId: 'realtime-gateway-group',
    sessionTimeout: 30000
  });
  let ready = false;
  let stopped = false;

  registerProductRooms(io);

  async function start() {
    await Promise.all([
      publisher.connect(),
      subscriber.connect()
    ]);
    io.adapter(createAdapter(publisher, subscriber));

    consumer.on(consumer.events.CRASH, ({payload}) => {
      ready = false;
      log('error', 'Realtime consumer crashed', {
        service: 'api-gateway',
        instance: gatewayInstance,
        error: payload.error.message
      });
    });

    await consumer.connect();
    await consumer.subscribe({
      topics: realtimeTopics,
      fromBeginning: false
    });
    await consumer.run({
      eachMessage: async ({topic, message}) => {
        try {
          const event = validateEvent(
            topic,
            JSON.parse(message.value.toString())
          );
          emitProductEvent(io, event);
          log('info', 'Realtime event emitted', {
            service: 'api-gateway',
            instance: gatewayInstance,
            eventId: event.eventId,
            eventType: event.eventType,
            productId: event.payload.productId
          });
        } catch (error) {
          log('warn', 'Realtime event ignored', {
            service: 'api-gateway',
            instance: gatewayInstance,
            topic,
            error: error.message
          });
        }
      }
    });
    ready = true;
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    ready = false;
    await consumer.disconnect();
    await new Promise(resolve => io.close(resolve));
    await Promise.all([
      publisher.isOpen ? publisher.quit() : undefined,
      subscriber.isOpen ? subscriber.quit() : undefined
    ]);
  }

  return {
    io,
    start,
    stop,
    isReady: () => ready
  };
}

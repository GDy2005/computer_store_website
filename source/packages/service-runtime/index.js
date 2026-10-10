import express from 'express';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {createEvent, validateEvent} from '@store/event-contracts';
import {kafkaClient, retryDelay, failureTopic} from '@store/kafka-client';
import {log} from '@store/logger';
import {AppError, errorHandler, internalAuth} from '@store/validation';
export const ownership = { 'identity-service': 'identity_db', 'catalog-service': 'catalog_db', 'order-service': 'order_db', 'notification-service': 'notification_db', 'analytics-service': 'analytics_db' };
export async function processOnce(connection, Processed, event, consumer, handler) {
  try {
    return await connection.transaction(async session => {
      if (await Processed.exists({eventId: event.eventId, consumer}).session(session)) return false;
      await handler(event, session);
      await Processed.create([{eventId: event.eventId, consumer, processedAt: new Date()}], {session});
      return true;
    });
  } catch (error) {
    // A concurrent duplicate must be retried, never acknowledge an unrelated unique violation.
    if (error.code === 11000 && await Processed.exists({eventId: event.eventId, consumer})) return false;
    throw error;
  }
}
export async function startService(name, buildApp, handleProbe) {
  const dbName = ownership[name];
  if (!dbName || process.env.DB_NAME !== dbName) throw new Error('Database ownership mismatch');
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) throw new Error('INTERNAL_SERVICE_SECRET required');
  const connection = await mongoose.createConnection(process.env.MONGODB_URI, {dbName}).asPromise();
  const Outbox = connection.model('Outbox', new mongoose.Schema({eventId: {type: String, unique: true}, topic: String, key: String, payload: mongoose.Schema.Types.Mixed, status: {type: String, default: 'PENDING'}, attempts: {type: Number, default: 0}, nextAttemptAt: {type: Date, default: Date.now}, leaseUntil: Date, publishedAt: Date, createdAt: {type: Date, default: Date.now}}), 'outbox_events');
  Outbox.schema.index({status: 1, nextAttemptAt: 1});
  const Processed = connection.model('Processed', new mongoose.Schema({eventId: String, consumer: String, processedAt: Date}), 'processed_events');
  Processed.schema.index({eventId: 1, consumer: 1}, {unique: true});
  const Probe = connection.model('Probe', new mongoose.Schema({probeId: {type: String, unique: true}, message: String, effects: {type: Number, default: 0}}), 'foundation_probes');
  const Dead = connection.model('Dead', new mongoose.Schema({sourceId: {type: String, unique: true}, topic: String, correlationId: String}), 'foundation_dead_letters');
  await Promise.all([Outbox.init(), Processed.init(), Probe.init(), Dead.init()]);
  const kafka = kafkaClient(name);
  const producer = kafka.producer({allowAutoTopicCreation: false}); await producer.connect();
  const groupId = `${name}-foundation-group`;
  const consumer = kafka.consumer({groupId, sessionTimeout: 30000}); await consumer.connect();
  const base = 'foundation.probe.v1';
  await consumer.subscribe({topics: [base, `${base}.retry`, `${base}.dlq`], fromBeginning: true});
  let ready = false, stopping = false;
  const commit = ({topic, partition, message}) => consumer.commitOffsets([{topic, partition, offset: (BigInt(message.offset) + 1n).toString()}]);
  consumer.on(consumer.events.CRASH, ({payload}) => { ready = false; log('error', 'Consumer crashed', {service: name, error: payload.error.message}); });
  consumer.on(consumer.events.GROUP_JOIN, () => { ready = true; });
  await consumer.run({autoCommit: false, eachMessage: async context => {
    const {topic, message, heartbeat} = context;
    const target = message.headers?.target?.toString();
    if (target && target !== groupId) { await commit(context); return; }
    if (topic.endsWith('.dlq')) {
      await Dead.updateOne({sourceId: `${message.headers?.sourceId || message.offset}`}, {$setOnInsert: {topic, correlationId: message.headers?.correlationId?.toString()}}, {upsert: true});
      await commit(context); return;
    }
    let event;
    const attempt = Number(message.headers?.attempt?.toString() || 0);
    try {
      event = validateEvent(base, JSON.parse(message.value.toString()));
      const due = Number(message.headers?.notBefore?.toString() || 0);
      while (Date.now() < due) { await new Promise(resolve => setTimeout(resolve, Math.min(500, due - Date.now()))); await heartbeat(); }
      await processOnce(connection, Processed, event, groupId, async (value, session) => {
        await handleProbe(value, session, {Probe, attempt});
      });
      log('info', 'Event processed', {service: name, eventId: event.eventId, correlationId: event.correlationId, attempt});
    } catch (error) {
      const nextAttempt = error.code === 'INVALID_EVENT' || error instanceof SyntaxError ? 3 : attempt + 1;
      const destination = failureTopic(base, nextAttempt);
      await producer.send({topic: destination, messages: [{key: message.key, value: message.value, headers: {target: groupId, attempt: String(nextAttempt), notBefore: String(Date.now() + retryDelay(nextAttempt)), sourceId: event?.eventId || `${topic}:${context.partition}:${message.offset}`, correlationId: event?.correlationId || '', errorCode: error.code || 'HANDLER_ERROR'}}]});
      log('warn', 'Event redirected', {service: name, topic: destination, eventId: event?.eventId, correlationId: event?.correlationId});
    }
    // Failure to send retry/DLQ throws before this commit, preserving the source message.
    await commit(context);
  }});
  async function publishBatch() {
    for (let i = 0; i < 20 && !stopping; i++) {
      const now = new Date();
      const row = await Outbox.findOneAndUpdate({status: 'PENDING', nextAttemptAt: {$lte: now}, $or: [{leaseUntil: {$exists: false}}, {leaseUntil: {$lte: now}}]}, {$set: {leaseUntil: new Date(Date.now() + 60000)}}, {new: true});
      if (!row) break;
      try {
        validateEvent(row.topic, row.payload);
        await producer.send({topic: row.topic, messages: [{key: row.key, value: JSON.stringify(row.payload)}]});
        await Outbox.updateOne({_id: row._id}, {$set: {status: 'PUBLISHED', publishedAt: new Date()}, $unset: {leaseUntil: ''}});
      } catch (error) {
        await Outbox.updateOne({_id: row._id}, {$inc: {attempts: 1}, $set: {nextAttemptAt: new Date(Date.now() + retryDelay(row.attempts + 1))}, $unset: {leaseUntil: ''}});
        log('error', 'Outbox publish deferred', {service: name, eventId: row.eventId, error: error.message});
        break;
      }
    }
  }
  async function pump() { try { await publishBatch(); } catch (error) { log('error', 'Outbox unavailable', {service: name, error: error.message}); } if (!stopping) timer = setTimeout(pump, 500); }
  let timer = setTimeout(pump, 500);
  const app = express();
  app.use(express.json({limit:'32kb'}));
  app.get('/health/live', (req, res) => res.json({success: true, data: {service: name}}));
  app.get('/health/ready', async (req, res, next) => {
    try { await connection.db.command({ping: 1}); const admin = kafka.admin(); await admin.connect(); try { await admin.listTopics(); } finally { await admin.disconnect(); }
      res.status(ready ? 200 : 503).json({success: ready, data: {service: name, database: dbName, consumerGroup: groupId}});
    } catch (error) { next(error); }
  });
  app.use(internalAuth(secret));
  app.get('/internal/foundation', async (req, res) => res.json({success: true, data: {service: name, database: dbName, pendingOutbox: await Outbox.countDocuments({status: 'PENDING'}), processedEvents: await Processed.countDocuments(), deadLetters: await Dead.countDocuments()}}));
  app.get('/internal/foundation/probes/:id', async (req, res, next) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid probe ID'));
    const probe = await Probe.findOne({probeId: req.params.id}).lean(); res.json({success: true, data: probe});
  });
  app.post('/internal/foundation/probes', async (req, res, next) => {
    if (process.env.FOUNDATION_PROBES_ENABLED !== 'true') return next(new AppError(404, 'NOT_FOUND', 'Probe disabled'));
    const {message = 'Foundation check', mode = 'normal'} = req.body || {};
    if (Object.keys(req.body || {}).some(key => !['message', 'mode'].includes(key)) || typeof message !== 'string' || message.length > 200 || !['normal','retry','poison'].includes(mode)) return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid probe payload'));
    const probeId = randomUUID();
    const event = createEvent(base, {producer: name, key: probeId, correlationId: req.context.requestId, payload: {probeId, message, mode}});
    await connection.transaction(async session => {
      await Probe.create([{probeId, message}], {session});
      await Outbox.create([{eventId: event.eventId, topic: base, key: probeId, payload: event}], {session});
    });
    res.status(202).json({success: true, data: {probeId, eventId: event.eventId, correlationId: event.correlationId}});
  });
  app.use(buildApp({connection, models: {Outbox, Processed, Probe, Dead}}));
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Endpoint not found')));
  app.use(errorHandler);
  const server = app.listen(Number(process.env.PORT || 5001), '0.0.0.0');
  async function shutdown() { stopping = true; ready = false; clearTimeout(timer); server.close(); await consumer.disconnect(); await producer.disconnect(); await connection.close(); }
  process.on('SIGTERM', () => shutdown().then(() => process.exit(0))); process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
  return {app, shutdown};
}

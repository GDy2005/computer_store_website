import {log} from '@store/logger';

export function createCheckoutTimeoutWorker({
  connection, Order, workflowService,
  timeoutMs = 120000, intervalMs = 5000
}) {
  let timer;
  let running;
  let stopped = true;

  async function sweep(now = new Date()) {
    const cutoff = new Date(now.getTime() - timeoutMs);
    const orders = await Order.find({
      workflowStatus: 'AWAITING_INVENTORY',
      createdAt: {$lte: cutoff}
    }).select('_id').limit(100).lean();

    for (const order of orders) {
      await connection.transaction(session =>
        workflowService.expire(order._id, cutoff, session)
      );
    }
  }

  async function tick() {
    try {
      await sweep();
    } catch (error) {
      log('error', 'Checkout timeout sweep failed', {
        service: 'order-service', error: error.message
      });
    }
    if (!stopped) timer = setTimeout(() => { running = tick(); }, intervalMs);
  }

  return {
    sweep,
    start() {
      if (!stopped) return;
      stopped = false;
      running = tick();
    },
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await running;
    }
  };
}

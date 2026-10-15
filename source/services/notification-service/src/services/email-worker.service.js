function retryDelay(attempt) {
  return Math.min(300000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export function createEmailWorker({EmailJob, emailService}) {
  let stopped = true;
  let timer;
  let activePromise;

  async function processOne() {
    const now = new Date();
    const job = await EmailJob.findOneAndUpdate(
      {
        $or: [
          {status: 'PENDING', nextAttemptAt: {$lte: now}},
          {status: 'PROCESSING', leaseUntil: {$lte: now}}
        ]
      },
      {
        $set: {status: 'PROCESSING', leaseUntil: new Date(Date.now() + 60000)},
        $inc: {attempts: 1}
      },
      {new: true, sort: {nextAttemptAt: 1}}
    );
    if (!job) return false;

    try {
      await emailService.send(job);
      await EmailJob.updateOne(
        {_id: job._id, status: 'PROCESSING'},
        {$set: {status: 'SENT', sentAt: new Date(), lastError: null}, $unset: {leaseUntil: ''}}
      );
    } catch (error) {
      const failed = job.attempts >= 5;
      await EmailJob.updateOne(
        {_id: job._id, status: 'PROCESSING'},
        {
          $set: {
            status: failed ? 'FAILED' : 'PENDING',
            lastError: error.message,
            nextAttemptAt: new Date(Date.now() + retryDelay(job.attempts))
          },
          $unset: {leaseUntil: ''}
        }
      );
    }
    return true;
  }

  async function runBatch() {
    for (let index = 0; index < 20 && !stopped; index++) {
      if (!await processOne()) break;
    }
  }

  async function tick() {
    activePromise = runBatch();
    try {
      await activePromise;
    } finally {
      activePromise = undefined;
      if (!stopped) timer = setTimeout(tick, 500);
    }
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    timer = setTimeout(tick, 0);
  }

  async function stop() {
    stopped = true;
    clearTimeout(timer);
    await activePromise;
  }

  return {start, stop, processOne};
}

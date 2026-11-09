function retryDelay(attempt) {
  return Math.min(300000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export function createEmailWorker({
  EmailJob,
  emailJobRepository: injectedEmailJobRepository,
  emailService
}) {
  const emailJobRepository = injectedEmailJobRepository ||
    createEmailJobRepository({EmailJob});
  let stopped = true;
  let timer;
  let activePromise;

  async function processOne() {
    const now = new Date();
    const job = await emailJobRepository.claimNext(
      now,
      new Date(Date.now() + 60000)
    );
    if (!job) return false;

    try {
      await emailService.send(job);
      await emailJobRepository.markSent(job._id);
    } catch (error) {
      const failed = job.attempts >= 5;
      await emailJobRepository.markAttemptFailed(job._id, {
        failed,
        error: error.message,
        nextAttemptAt: new Date(
          Date.now() + retryDelay(job.attempts)
        )
      });
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
import {createEmailJobRepository} from '../repositories/emailJobRepository.js';


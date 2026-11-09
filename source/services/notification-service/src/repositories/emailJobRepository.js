export function createEmailJobRepository({EmailJob}) {
  return {
    async getStats() {
      const [pending, processing, sent, failed] = await Promise.all([
        EmailJob.countDocuments({status: 'PENDING'}),
        EmailJob.countDocuments({status: 'PROCESSING'}),
        EmailJob.countDocuments({status: 'SENT'}),
        EmailJob.countDocuments({status: 'FAILED'})
      ]);
      return {pending, processing, sent, failed};
    },

    findPublicByEventId(eventId) {
      return EmailJob.findOne({eventId})
        .select('-templateData -lastError')
        .lean();
    },

    claimNext(now, leaseUntil) {
      return EmailJob.findOneAndUpdate(
        {
          $or: [
            {status: 'PENDING', nextAttemptAt: {$lte: now}},
            {status: 'PROCESSING', leaseUntil: {$lte: now}}
          ]
        },
        {
          $set: {status: 'PROCESSING', leaseUntil},
          $inc: {attempts: 1}
        },
        {new: true, sort: {nextAttemptAt: 1}}
      );
    },

    markSent(jobId) {
      return EmailJob.updateOne(
        {_id: jobId, status: 'PROCESSING'},
        {
          $set: {status: 'SENT', sentAt: new Date(), lastError: null},
          $unset: {leaseUntil: ''}
        }
      );
    },

    markAttemptFailed(jobId, {failed, error, nextAttemptAt}) {
      return EmailJob.updateOne(
        {_id: jobId, status: 'PROCESSING'},
        {
          $set: {
            status: failed ? 'FAILED' : 'PENDING',
            lastError: error,
            nextAttemptAt
          },
          $unset: {leaseUntil: ''}
        }
      );
    },

    enqueue(eventId, job, session) {
      return EmailJob.updateOne(
        {eventId},
        {$setOnInsert: {eventId, ...job}},
        {upsert: true, session}
      );
    }
  };
}

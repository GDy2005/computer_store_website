import mongoose from 'mongoose';

const emailJobSchema = new mongoose.Schema(
  {
    eventId: {type: String, required: true, unique: true},
    recipientEmail: {type: String, required: true, lowercase: true, trim: true},
    template: {
      type: String,
      enum: ['ACCOUNT_ACTIVATION', 'PASSWORD_RESET', 'ORDER_CONFIRMATION'],
      required: true
    },
    templateData: {type: mongoose.Schema.Types.Mixed, required: true},
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
      default: 'PENDING'
    },
    attempts: {type: Number, default: 0},
    nextAttemptAt: {type: Date, default: Date.now},
    leaseUntil: Date,
    lastError: String,
    sentAt: Date
  },
  {timestamps: true, versionKey: false}
);

emailJobSchema.index({status: 1, nextAttemptAt: 1, leaseUntil: 1});

export function getEmailJobModel(connection) {
  return connection.models.EmailJob || connection.model('EmailJob', emailJobSchema, 'email_jobs');
}

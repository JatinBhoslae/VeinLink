import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicUser',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['eligibility', 'eligibility_countdown', 'reminder', 'emergency', 'system'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    error: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model('NotificationLog', notificationLogSchema);

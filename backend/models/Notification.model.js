import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel',
    required: true
  },
  recipientModel: {
    type: String,
    enum: ['User', 'PublicUser'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'BLOOD_REQUEST_APPROVED',
      'BLOOD_REQUEST_REJECTED', 
      'BLOOD_REQUEST_FULFILLED',
      'LOW_STOCK_ALERT',
      'CRITICAL_STOCK_ALERT',
      'EMERGENCY_BROADCAST',
      'NEW_DONATION_REQUEST',
      'TRANSFER_REQUEST_CREATED',
      'TRANSFER_APPROVED',
      'TRANSFER_REJECTED',
      'TRANSFER_COMPLETED',
      'CAMP_CREATED',
      'CAMP_UPDATED',
      'DONOR_REGISTERED',
      'SYSTEM_MAINTENANCE',
      'HOSPITAL_APPROVED',
      'HOSPITAL_REJECTED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String
  },
  actionText: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    enum: ['User', 'PublicUser', 'System']
  },
  metadata: {
    hospitalId: mongoose.Schema.Types.ObjectId,
    requestId: mongoose.Schema.Types.ObjectId,
    bloodGroup: String,
    quantity: Number,
    relatedEntity: mongoose.Schema.Types.ObjectId,
    relatedEntityType: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipientId, recipientModel) {
  return this.countDocuments({
    recipient: recipientId,
    recipientModel: recipientModel,
    read: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to get recent notifications
notificationSchema.statics.getRecentNotifications = function(recipientId, recipientModel, limit = 20) {
  return this.find({
    recipient: recipientId,
    recipientModel: recipientModel,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName email');
};

// Static method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = function(notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds } },
    { read: true, readAt: new Date() }
  );
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(recipientId, recipientModel) {
  return this.updateMany(
    { recipient: recipientId, recipientModel: recipientModel, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware to set expiration for certain notification types
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt && this.type === 'SYSTEM_MAINTENANCE') {
    // System maintenance notifications expire after 7 days
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else if (!this.expiresAt && this.priority === 'low') {
    // Low priority notifications expire after 30 days
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

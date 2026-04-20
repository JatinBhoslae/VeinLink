import mongoose from 'mongoose';

const publicBloodRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicUser',
      required: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'fulfilled', 'cancelled'],
      default: 'pending',
    },
    rejectedReason: String,
    pinCode: String,
    city: String,
    requiredBy: Date,
    targetDonorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicUser',
    },
    donorContactShared: {
      type: Boolean,
      default: false,
    },
    specialInstructions: String,
  },
  { timestamps: true }
);

export default mongoose.model('PublicBloodRequest', publicBloodRequestSchema);

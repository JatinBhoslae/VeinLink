import mongoose from 'mongoose';

const HospitalSlotSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

HospitalSlotSchema.virtual('remaining').get(function () {
  return Math.max(0, (this.capacity || 0) - (this.bookedCount || 0));
});

HospitalSlotSchema.set('toJSON', { virtuals: true });
HospitalSlotSchema.set('toObject', { virtuals: true });

const HospitalSlot = mongoose.model('HospitalSlot', HospitalSlotSchema);

export default HospitalSlot;

import mongoose from 'mongoose';

const donationAppointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicUser',
      required: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },
    campId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodCamp',
    },
    hospitalSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalSlot',
    },
    timeSlot: {
      type: Date,
    },
    campTimeSlotIndex: Number,
    status: {
      type: String,
      enum: ['booked', 'cancelled', 'completed'],
      default: 'booked',
    },
    certificateUrl: String,
    rewardPointsEarned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('DonationAppointment', donationAppointmentSchema);

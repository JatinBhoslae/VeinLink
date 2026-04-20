import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const publicUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 1,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    city: String,
    state: String,
    pinCode: String,
    address: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    hasUnderlyingDisease: {
      type: Boolean,
      default: false,
    },
    diseaseDetails: String,
    onMedication: {
      type: Boolean,
      default: false,
    },
    medicationDetails: String,
    rewardPoints: {
      type: Number,
      default: 0,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    badges: [badgeSchema],
    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },
    lastDonationDate: Date,
    nextEligibleDate: Date,
    preferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      liveTracking: { type: Boolean, default: false },
    },
    locationUpdatedAt: Date,
    resetCode: String,
    resetCodeExpires: Date,
  },
  { timestamps: true }
);

publicUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

publicUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

publicUserSchema.index({ location: '2dsphere' });


export default mongoose.model('PublicUser', publicUserSchema);

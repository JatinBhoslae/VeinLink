import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [40, 'Weight must be at least 40 kg'],
      max: [200, 'Weight cannot exceed 200 kg'],
      set: v => Math.round(v * 10) / 10 // Store with 1 decimal place
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: function() {
          // Only require type if coordinates exist
          return this.location && this.location.coordinates;
        },
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(v) {
            // If coordinates exist, must be array of 2 numbers
            return !v || (Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && !isNaN(n)));
          },
          message: 'Coordinates must be an array of 2 numbers [longitude, latitude]',
        },
      },
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
    lastDonationDate: {
      type: Date,
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
    underlyingDisease: {
      type: String,
      trim: true,
    },
    ongoingMedicine: {
      type: String,
      trim: true,
    },
    medicalHistory: [
      {
        condition: String,
        date: Date,
        notes: String,
      },
    ],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to clean up invalid location objects
donorSchema.pre('save', function(next) {
  // If location exists but doesn't have valid coordinates, remove it
  if (this.location) {
    const hasValidCoordinates = 
      this.location.coordinates && 
      Array.isArray(this.location.coordinates) && 
      this.location.coordinates.length === 2 &&
      typeof this.location.coordinates[0] === 'number' &&
      typeof this.location.coordinates[1] === 'number' &&
      !isNaN(this.location.coordinates[0]) &&
      !isNaN(this.location.coordinates[1]);

    if (!hasValidCoordinates) {
      // Remove invalid location
      this.location = undefined;
    } else {
      // Ensure proper GeoJSON format
      this.location = {
        type: 'Point',
        coordinates: this.location.coordinates,
      };
    }
  }
  next();
});

// Index for location-based queries (only if location exists)
donorSchema.index({ location: '2dsphere' }, { sparse: true });

export default mongoose.model('Donor', donorSchema);


import mongoose from 'mongoose';

const bloodUnitSchema = new mongoose.Schema(
  {
    bagId: {
      type: String,
      required: true,
      unique: true,
    },
    qrCode: {
      type: String,
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    collectionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: function() {
        // Only require if collectionDate exists
        return !!this.collectionDate;
      },
    },
    status: {
      type: String,
      enum: ['collected', 'tested', 'available', 'reserved', 'issued', 'expired', 'disposed'],
      default: 'collected',
    },
    testResults: {
      hiv: {
        status: {
          type: String,
          enum: ['pending', 'negative', 'positive'],
          default: 'pending',
        },
        testedAt: Date,
        testedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
      hepatitisB: {
        status: {
          type: String,
          enum: ['pending', 'negative', 'positive'],
          default: 'pending',
        },
        testedAt: Date,
        testedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
      hepatitisC: {
        status: {
          type: String,
          enum: ['pending', 'negative', 'positive'],
          default: 'pending',
        },
        testedAt: Date,
        testedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
      syphilis: {
        status: {
          type: String,
          enum: ['pending', 'negative', 'positive'],
          default: 'pending',
        },
        testedAt: Date,
        testedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    },
    storage: {
      location: String,
      temperature: Number,
      shelf: String,
    },
    rackNumber: {
      type: String,
      trim: true,
    },
    movementHistory: [
      {
        from: String,
        to: String,
        movedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        movedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    issuedTo: {
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodRequest',
      },
      issuedAt: Date,
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    volume: {
      type: Number,
      default: 450, // Standard blood bag volume in ml
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate expiry date (42 days from collection) if not provided
bloodUnitSchema.pre('save', function (next) {
  if (!this.expiryDate && this.collectionDate) {
    const expiry = new Date(this.collectionDate);
    expiry.setDate(expiry.getDate() + 42);
    this.expiryDate = expiry;
  }
  next();
});

export default mongoose.model('BloodUnit', bloodUnitSchema);


import mongoose from 'mongoose';

const bloodCampSchema = new mongoose.Schema(
  {
    campId: {
      type: String,
      required: true,
      unique: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      address: {
        type: String,
        required: true,
      },
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    timeSlots: [
      {
        startTime: String,
        endTime: String,
        maxDonors: {
          type: Number,
          default: 10,
        },
        registeredDonors: [
          {
            donorId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Donor',
            },
            registeredAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    publicLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    totalRegistrations: {
      type: Number,
      default: 0,
    },
    totalCollections: {
      type: Number,
      default: 0,
    },
    assignedVolunteer: {
      type: String,
      trim: true,
    },
    checkIns: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
        },
        checkedInAt: {
          type: Date,
          default: Date.now,
        },
        checkedInBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        qrScanned: {
          type: Boolean,
          default: false,
        },
      },
    ],
    certificates: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
        },
        issuedAt: {
          type: Date,
          default: Date.now,
        },
        certificateUrl: String,
      },
    ],
    bloodGroupCollections: [
      {
        bloodGroup: {
          type: String,
          enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        },
        units: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('BloodCamp', bloodCampSchema);


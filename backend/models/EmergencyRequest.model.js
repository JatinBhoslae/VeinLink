import mongoose from 'mongoose';

const donorResponseSchema = new mongoose.Schema(
    {
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donor',
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Rejected', 'Expired', 'Queued'],
            default: 'Pending',
        },
        notifiedAt: {
            type: Date,
            default: Date.now,
        },
        respondedAt: {
            type: Date,
        },
        distanceKm: {
            type: Number,
        },
        notifiedAtRadius: {
            type: Number, // Which radius level they were notified at (1, 3, or 5)
        },
    },
    { _id: true }
);

const emergencyRequestSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PublicUser',
            required: true,
        },
        patientName: {
            type: String,
            required: true,
            trim: true,
        },
        patientPhone: {
            type: String,
            trim: true,
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            required: [true, 'Blood group is required'],
        },
        patientLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, 'Patient location is required'],
            },
        },
        currentSearchRadius: {
            type: Number,
            default: 1, // Start with 1 km
            enum: [1, 3, 5],
        },
        status: {
            type: String,
            enum: ['Active', 'Accepted', 'Expired', 'Cancelled'],
            default: 'Active',
        },
        donorResponses: [donorResponseSchema],
        acceptedDonor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donor',
        },
        // Metrics
        totalDonorsNotified: {
            type: Number,
            default: 0,
        },
        acceptedCount: {
            type: Number,
            default: 0,
        },
        rejectedCount: {
            type: Number,
            default: 0,
        },
        timeTakenToAcceptMs: {
            type: Number, // milliseconds from creation to first accept
        },
        radiusExpandedAt: [
            {
                radius: Number,
                expandedAt: Date,
            },
        ],
        expiresAt: {
            type: Date,
            // Auto-expire after 30 minutes if no donor accepts
            default: () => new Date(Date.now() + 30 * 60 * 1000),
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Geospatial index for location queries
emergencyRequestSchema.index({ patientLocation: '2dsphere' });
// Index for finding active requests
emergencyRequestSchema.index({ status: 1, createdAt: -1 });
// Index for patient lookups
emergencyRequestSchema.index({ patientId: 1, createdAt: -1 });
// TTL index (optional — for auto cleanup after 24 hours)
emergencyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual: how long the request has been active
emergencyRequestSchema.virtual('activeForMs').get(function () {
    if (this.status !== 'Active') return null;
    return Date.now() - this.createdAt.getTime();
});

// Virtual: pending donor count
emergencyRequestSchema.virtual('pendingCount').get(function () {
    return this.donorResponses.filter((r) => r.status === 'Pending').length;
});

export default mongoose.model('EmergencyRequest', emergencyRequestSchema);

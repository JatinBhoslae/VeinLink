import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.model.js';

dotenv.config();

const seedCoordinates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const hospitals = await Hospital.find({});
        console.log(`Updating ${hospitals.length} hospitals...`);

        // Pune center coordinates
        const puneCenter = [73.8567, 18.5204];

        for (const h of hospitals) {
            const randomOffsetLng = (Math.random() - 0.5) * 0.1; // roughly 10km range
            const randomOffsetLat = (Math.random() - 0.5) * 0.1;
            
            h.location = {
                type: 'Point',
                coordinates: [puneCenter[0] + randomOffsetLng, puneCenter[1] + randomOffsetLat]
            };
            
            await h.save();
            console.log(`✅ Updated ${h.name} with coordinates: ${JSON.stringify(h.location.coordinates)}`);
        }

        console.log('Tactical seeding complete.');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

seedCoordinates();

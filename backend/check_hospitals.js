import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.model.js';

dotenv.config();

const checkHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const hospitals = await Hospital.find({});
        console.log(`Total Hospitals: ${hospitals.length}`);

        hospitals.forEach(h => {
            console.log(`- ${h.name}: Coordinates: ${JSON.stringify(h.location?.coordinates)}, Status: ${h.status}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkHospitals();

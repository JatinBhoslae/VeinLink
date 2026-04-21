import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        console.log('📡 [DIAG] Tactical Database Probe Initiated...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const users = await mongoose.connection.collection('publicusers').find({}, { projection: { email: 1, firstName: 1, isActive: 1 } }).toArray();
        
        console.log('\n--- OPERATIVE SIGNATURES DETECTED ---');
        users.forEach(u => {
            console.log(`Operative: ${u.firstName} | Email: ${u.email} | Active: ${u.isActive}`);
        });
        console.log('-------------------------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ [DIAG] Probe Aborted:', err.message);
        process.exit(1);
    }
}

run();

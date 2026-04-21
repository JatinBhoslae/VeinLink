import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/../.env` });

const createNewAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const email = 'superadmin@veinlink.com';
        const password = 'Vein Link@2026';

        // Delete if already exists (so we get fresh credentials)
        await User.deleteOne({ email });

        const admin = await User.create({
            email,
            password,
            firstName: 'Jatin',
            lastName: 'Admin',
            role: 'super_admin',
            phone: '+919876543210',
        });

        console.log('\n✅ New Super Admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  📧 Email:    ${email}`);
        console.log(`  🔑 Password: ${password}`);
        console.log(`  👤 Role:     super_admin`);
        console.log(`  🆔 ID:       ${admin._id}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createNewAdmin();

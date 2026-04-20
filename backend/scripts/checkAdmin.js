import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/../.env` });

const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Check if super admin exists
    const admin = await User.findOne({ email: 'admin@vienlink.com' });
    
    if (!admin) {
      console.log('❌ Super Admin NOT FOUND');
      console.log('\n📝 To create super admin, run:');
      console.log('   npm run seed:admin\n');
      process.exit(1);
    }

    console.log('✅ Super Admin Found!');
    console.log('\n📧 Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${admin.email}`);
    console.log(`Role:     ${admin.role}`);
    console.log(`Active:   ${admin.isActive ? 'Yes' : 'No'}`);
    console.log(`Name:     ${admin.firstName} ${admin.lastName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Password: admin123');
    console.log('\n💡 If login fails, try:');
    console.log('   1. Verify password is correct');
    console.log('   2. Check if account is active');
    console.log('   3. Check backend server is running');
    console.log('   4. Check JWT_SECRET is set in .env\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkAdmin();


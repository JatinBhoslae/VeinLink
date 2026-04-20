# Backend Setup Instructions

## Environment Variables

Make sure your `backend/.env` file contains:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://hemantjawale24_db_user:eaCmjALuOLMQUVp4@cluster0.1f5ntul.mongodb.net/vienlink?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
JWT_EXPIRE=7d
```

## Create Test Super Admin

Run this command to create a test super admin:

```bash
npm run seed:admin
```

This will create:
- **Email:** admin@vienlink.com
- **Password:** admin123

## Test Login Credentials

### Super Admin
- **Email:** admin@vienlink.com
- **Password:** admin123

⚠️ **Important:** Change the password after first login!

## Starting the Server

```bash
npm install
npm run dev
```

The server will run on `http://localhost:5000`


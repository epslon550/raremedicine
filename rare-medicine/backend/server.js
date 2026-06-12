const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pharmacies', require('./routes/pharmacies'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/requests', require('./routes/requests'));

// Simple check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rare Medicine Locator API is running smoothly' });
});

// Database connection & Seeding
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rare-medicine';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    // Seed Admin account on startup if it doesn't exist
    try {
      const adminEmail = 'admin@raremed.com';
      const adminExists = await User.findOne({ email: adminEmail });
      if (!adminExists) {
        await User.create({
          name: 'System Administrator',
          email: adminEmail,
          password: 'adminpassword', // Will be hashed automatically by user model pre-save hook
          phone: '9999999999',
          role: 'admin',
          latitude: 17.3850,
          longitude: 78.4867
        });
        console.log('Default admin account seeded successfully (admin@raremed.com / adminpassword)');
      } else {
        console.log('Admin account already exists');
      }

      // Seed default patient (hasrith@gmail.com)
      const patientEmail = 'hasrith@gmail.com';
      const patientExists = await User.findOne({ email: patientEmail });
      if (!patientExists) {
        await User.create({
          name: 'hasrith',
          email: patientEmail,
          password: '456123',
          phone: '9989828906',
          pincode: '500001',
          role: 'patient',
          latitude: 17.3850,
          longitude: 78.4867
        });
        console.log('Default patient account seeded successfully (hasrith@gmail.com / 456123)');
      }

      // Seed default pharmacy (apollo@gmail.com)
      const pharmacyEmail = 'apollo@gmail.com';
      const pharmacyExists = await User.findOne({ email: pharmacyEmail });
      if (!pharmacyExists) {
        const phUser = await User.create({
          name: 'apollo',
          email: pharmacyEmail,
          password: '456123123',
          phone: '9989828906',
          pincode: '500001',
          role: 'pharmacy',
          latitude: 17.4030,
          longitude: 78.4867
        });

        const Pharmacy = require('./models/Pharmacy');
        await Pharmacy.create({
          user: phUser._id,
          pharmacyName: 'Apollo Pharmacy',
          ownerName: 'apollo',
          licenseNumber: 'DL-4452155',
          licenseFilePath: '/uploads/licenses/default.png',
          address: '1-4-2133/65b old mandhir, Hyderabad',
          latitude: 17.4030,
          longitude: 78.4867,
          contactNumber: '9989828906',
          verificationStatus: 'approved'
        });
        console.log('Default pharmacy account seeded successfully (apollo@gmail.com / 456123123)');
      }
    } catch (err) {
      console.error('Error seeding users:', err);
    }

    // Start Server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

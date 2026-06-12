const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { protect } = require('../middleware/authMiddleware');
const { uploadLicense } = require('../middleware/uploadMiddleware');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'rare_medicine_locator_jwt_secret_key_2026', {
    expiresIn: '30d'
  });
};

// @desc    Register a new patient, admin, or pharmacy
// @route   POST /api/auth/register
// @access  Public (Uses multer for license upload if role is pharmacy)
router.post('/register', uploadLicense.single('licenseFile'), async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    role,
    latitude,
    longitude,
    pincode,
    // Pharmacy specific fields:
    pharmacyName,
    licenseNumber,
    address,
    contactNumber
  } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const parsedLat = parseFloat(latitude) || 17.3850;
    const parsedLng = parseFloat(longitude) || 78.4867;

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'patient',
      latitude: parsedLat,
      longitude: parsedLng,
      pincode: pincode || '500001'
    });

    let pharmacy = null;

    // If role is pharmacy, create Pharmacy record
    if (role === 'pharmacy') {
      if (!req.file) {
        // Delete created user if pharmacy creation fails due to missing file
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'License file upload is required for pharmacy registration' });
      }

      // Store license relative path
      const licenseFilePath = `/uploads/licenses/${req.file.filename}`;

      try {
        pharmacy = await Pharmacy.create({
          user: user._id,
          pharmacyName,
          ownerName: name,
          licenseNumber,
          licenseFilePath,
          address,
          latitude: parsedLat,
          longitude: parsedLng,
          pincode: pincode || '500001',
          contactNumber: contactNumber || phone,
          verificationStatus: 'pending' // Admin must approve
        });
      } catch (pharmacyError) {
        // Delete created user if pharmacy creation fails
        await User.findByIdAndDelete(user._id);
        throw pharmacyError;
      }
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      latitude: user.latitude,
      longitude: user.longitude,
      pincode: user.pincode,
      token: generateToken(user._id),
      pharmacy: pharmacy
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      // Find pharmacy profile if role is pharmacy
      let pharmacy = null;
      if (user.role === 'pharmacy') {
        pharmacy = await Pharmacy.findOne({ user: user._id });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        latitude: user.latitude,
        longitude: user.longitude,
        pincode: user.pincode,
        token: generateToken(user._id),
        pharmacy: pharmacy
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let pharmacy = null;

    if (user.role === 'pharmacy') {
      pharmacy = await Pharmacy.findOne({ user: user._id });
    }

    res.json({
      user,
      pharmacy
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// @desc    Get search history (Patient)
// @route   GET /api/auth/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('searchHistory');
    res.json(user.searchHistory || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching search history' });
  }
});

// @desc    Add search history item
// @route   POST /api/auth/history
// @access  Private
router.post('/history', protect, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: 'Query is required' });

  try {
    const user = await User.findById(req.user._id);
    // Add to front of history list, limit to last 10
    user.searchHistory.unshift({ query });
    if (user.searchHistory.length > 10) {
      user.searchHistory = user.searchHistory.slice(0, 10);
    }
    await user.save();
    res.json(user.searchHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error saving search history' });
  }
});

module.exports = router;

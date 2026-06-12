const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'admin', 'pharmacy'],
    default: 'patient'
  },
  latitude: {
    type: Number,
    default: 17.3850 // Default Hyderabad latitude if not provided
  },
  longitude: {
    type: Number,
    default: 78.4867 // Default Hyderabad longitude if not provided
  },
  pincode: {
    type: String,
    trim: true,
    default: '500001'
  },
  searchHistory: [
    {
      query: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine'
  },
  customMedicineName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  responses: [
    {
      pharmacy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true
      },
      status: {
        type: String,
        enum: ['Available Soon', 'Currently Unavailable', 'In Stock'],
        required: true
      },
      message: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', RequestSchema);

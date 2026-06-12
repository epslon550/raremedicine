const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Submit a new medicine request (Patient only)
// @route   POST /api/requests
// @access  Private/Patient
router.post('/', protect, authorize('patient'), async (req, res) => {
  const { medicineId, customMedicineName } = req.body;

  if (!medicineId && !customMedicineName) {
    return res.status(400).json({ message: 'Please provide either a medicine selection or a custom medicine name' });
  }

  try {
    let medicine = null;
    if (medicineId) {
      medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ message: 'Selected medicine not found in master database' });
      }
    }

    const request = await Request.create({
      user: req.user._id,
      medicine: medicine ? medicine._id : undefined,
      customMedicineName: medicine ? undefined : customMedicineName,
      status: 'pending'
    });

    const populated = await Request.findById(request._id)
      .populate('medicine')
      .populate('user', 'name email phone latitude longitude');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating medicine request' });
  }
});

// @desc    Get current user's requests (Patient only)
// @route   GET /api/requests/my-requests
// @access  Private/Patient
router.get('/my-requests', protect, authorize('patient'), async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .populate('medicine')
      .populate({
        path: 'responses.pharmacy',
        select: 'pharmacyName contactNumber address ownerName licenseNumber'
      })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching your requests' });
  }
});

// @desc    Get all pending requests (Pharmacy & Admin only)
// @route   GET /api/requests/pending
// @access  Private
router.get('/pending', protect, authorize('pharmacy', 'admin'), async (req, res) => {
  try {
    const requests = await Request.find({ status: 'pending' })
      .populate('medicine')
      .populate('user', 'name email phone latitude longitude')
      .populate({
        path: 'responses.pharmacy',
        select: 'pharmacyName'
      })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching pending requests' });
  }
});

// @desc    Respond to a request (Pharmacy only)
// @route   POST /api/requests/:id/respond
// @access  Private/Pharmacy
router.post('/:id/respond', protect, authorize('pharmacy'), async (req, res) => {
  const { status, message } = req.body; // status: 'Available Soon', 'Currently Unavailable', etc.

  if (!status) {
    return res.status(400).json({ message: 'Response status is required' });
  }

  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const pharmacy = await Pharmacy.findOne({ user: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy profile not found' });
    }

    if (pharmacy.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Pharmacy is not approved yet. Cannot respond to requests.' });
    }

    // Check if this pharmacy has already responded to this request
    const existingResponseIndex = request.responses.findIndex(
      (r) => r.pharmacy.toString() === pharmacy._id.toString()
    );

    if (existingResponseIndex > -1) {
      // Update existing response
      request.responses[existingResponseIndex].status = status;
      request.responses[existingResponseIndex].message = message || '';
      request.responses[existingResponseIndex].createdAt = new Date();
    } else {
      // Append new response
      request.responses.push({
        pharmacy: pharmacy._id,
        status,
        message: message || ''
      });
    }

    await request.save();

    const updatedRequest = await Request.findById(request._id)
      .populate('medicine')
      .populate('user', 'name email phone latitude longitude')
      .populate({
        path: 'responses.pharmacy',
        select: 'pharmacyName contactNumber address ownerName licenseNumber'
      });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Request response error:', error);
    res.status(500).json({ message: 'Server error adding response to request' });
  }
});

// @desc    Get all requests (Admin only)
// @route   GET /api/requests
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('medicine')
      .populate('user', 'name email phone latitude longitude')
      .populate({
        path: 'responses.pharmacy',
        select: 'pharmacyName'
      })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving all requests' });
  }
});

module.exports = router;

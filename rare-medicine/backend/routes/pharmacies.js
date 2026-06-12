const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get all pharmacies (Admin only)
// @route   GET /api/pharmacies
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find().populate('user', 'name email phone');
    res.json(pharmacies);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving pharmacies' });
  }
});

// @desc    Get approved pharmacies (Public/Patient)
// @route   GET /api/pharmacies/approved
// @access  Public
router.get('/approved', async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find({ verificationStatus: 'approved' }).populate('user', 'name email phone');
    res.json(pharmacies);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving approved pharmacies' });
  }
});

// @desc    Get pharmacy by ID (Public)
// @route   GET /api/pharmacies/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id).populate('user', 'name email phone');
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }
    res.json(pharmacy);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving pharmacy details' });
  }
});

// @desc    Verify pharmacy (Admin only)
// @route   PUT /api/pharmacies/:id/verify
// @access  Private/Admin
router.put('/:id/verify', protect, authorize('admin'), async (req, res) => {
  const { verificationStatus } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(verificationStatus)) {
    return res.status(400).json({ message: 'Invalid verification status' });
  }

  try {
    const pharmacy = await Pharmacy.findById(req.params.id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    pharmacy.verificationStatus = verificationStatus;
    await pharmacy.save();

    res.json({
      message: `Pharmacy status updated to ${verificationStatus}`,
      pharmacy
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating verification status' });
  }
});

module.exports = router;

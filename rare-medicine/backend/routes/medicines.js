const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Public
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching medicines list' });
  }
});

// @desc    Search medicines by name, generic name, or disease
// @route   GET /api/medicines/search
// @access  Public
router.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  try {
    // Search using case-insensitive regex
    const regex = new RegExp(query, 'i');
    const medicines = await Medicine.find({
      $or: [
        { name: regex },
        { genericName: regex },
        { disease: regex }
      ]
    });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Server error during medicine search' });
  }
});

// @desc    Get single medicine details by ID
// @route   GET /api/medicines/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving medicine' });
  }
});

// @desc    Add a rare medicine to master catalog (Admin only)
// @route   POST /api/medicines
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, genericName, manufacturer, disease, description, image } = req.body;

  if (!name || !genericName || !manufacturer || !disease || !description) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // Check duplicate name
    const exists = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) {
      return res.status(400).json({ message: 'Medicine with this name already exists' });
    }

    const medicine = await Medicine.create({
      name,
      genericName,
      manufacturer,
      disease,
      description,
      image: image || ''
    });

    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error creating medicine' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadMedicine } = require('../middleware/uploadMiddleware');

// Helper function to calculate distance using Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
};

// @desc    Add or Update stock in inventory (Pharmacy only)
// @route   POST /api/inventory
// @access  Private/Pharmacy
router.post('/', protect, authorize('pharmacy'), (req, res, next) => {
  uploadMedicine.single('medicineImage')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  const { medicineId, quantity, price } = req.body;

  if (!medicineId || quantity === undefined || price === undefined) {
    return res.status(400).json({ message: 'Medicine ID, quantity, and price are required' });
  }

  const cleanMedicineId = String(medicineId).replace(/['"]/g, '').trim();

  try {
    // Check if pharmacy is approved
    const pharmacy = await Pharmacy.findOne({ user: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy profile not found' });
    }

    if (pharmacy.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Your pharmacy is pending verification. Cannot add inventory yet.' });
    }

    let finalMedicineId = cleanMedicineId;

    if (cleanMedicineId.toLowerCase() === 'new') {
      const { name, genericName, manufacturer, disease, description } = req.body;
      if (!name || !genericName || !manufacturer || !disease || !description) {
        return res.status(400).json({ message: 'New medicine name, generic salt, manufacturer, disease, and description are required' });
      }

      // Check if medicine already exists under this name (case-insensitive)
      let medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (!medicine) {
        medicine = await Medicine.create({
          name: name.trim(),
          genericName: genericName.trim(),
          manufacturer: manufacturer.trim(),
          disease: disease.trim(),
          description: description.trim()
        });
      }
      finalMedicineId = medicine._id;
    } else {
      // Verify medicine exists in master list
      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ message: 'Medicine not found in master catalog' });
      }
    }

    // Check if stock record exists
    let inventoryItem = await Inventory.findOne({
      pharmacy: pharmacy._id,
      medicine: finalMedicineId
    });

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/medicines/${req.file.filename}`;
    }

    if (inventoryItem) {
      // Update existing item
      inventoryItem.quantity = parseInt(quantity);
      inventoryItem.price = parseFloat(price);
      if (imagePath) {
        inventoryItem.medicineImage = imagePath;
      }
      inventoryItem.availability = parseInt(quantity) > 0;
      await inventoryItem.save();
    } else {
      // Create new inventory item
      inventoryItem = await Inventory.create({
        pharmacy: pharmacy._id,
        medicine: finalMedicineId,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        medicineImage: imagePath, // might be empty string
        availability: parseInt(quantity) > 0
      });
    }

    // Return populated item
    const populatedItem = await Inventory.findById(inventoryItem._id)
      .populate('medicine')
      .populate('pharmacy');

    res.status(200).json(populatedItem);
  } catch (error) {
    console.error('Inventory save error:', error);
    res.status(500).json({ message: error.message || 'Server error saving inventory' });
  }
});

// @desc    Get current pharmacy's inventory (Pharmacy only)
// @route   GET /api/inventory/my-stock
// @access  Private/Pharmacy
router.get('/my-stock', protect, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ user: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy profile not found' });
    }

    const inventory = await Inventory.find({ pharmacy: pharmacy._id })
      .populate('medicine')
      .sort({ createdAt: -1 });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving stock' });
  }
});

// @desc    Delete stock from inventory (Pharmacy only)
// @route   DELETE /api/inventory/:id
// @access  Private/Pharmacy
router.delete('/:id', protect, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ user: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy profile not found' });
    }

    // Verify stock item belongs to this pharmacy
    const inventoryItem = await Inventory.findOne({
      _id: req.params.id,
      pharmacy: pharmacy._id
    });

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found or unauthorized' });
    }

    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed from inventory' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting inventory item' });
  }
});

// @desc    Search pharmacies holding stock for a medicine, sorted by distance
// @route   GET /api/inventory/search
// @access  Public
router.get('/search', async (req, res) => {
  const { medicineId, userLat, userLng } = req.query;

  if (!medicineId) {
    return res.status(400).json({ message: 'Medicine ID is required' });
  }

  try {
    // Find all inventory entries for this medicine where quantity > 0
    const stockItems = await Inventory.find({
      medicine: medicineId,
      quantity: { $gt: 0 }
    })
      .populate('medicine')
      .populate({
        path: 'pharmacy',
        populate: { path: 'user', select: 'name email phone' }
      });

    // Filter only approved pharmacies
    let results = stockItems.filter(
      (item) => item.pharmacy && item.pharmacy.verificationStatus === 'approved'
    );

    // Calculate distance and format response
    const formattedResults = results.map((item) => {
      let distance = null;
      if (userLat && userLng && item.pharmacy.latitude && item.pharmacy.longitude) {
        distance = getDistance(
          parseFloat(userLat),
          parseFloat(userLng),
          item.pharmacy.latitude,
          item.pharmacy.longitude
        );
      }

      return {
        _id: item._id,
        quantity: item.quantity,
        price: item.price,
        medicineImage: item.medicineImage,
        availability: item.availability,
        medicine: item.medicine,
        pharmacy: item.pharmacy,
        distance: distance // in km
      };
    });

    // Sort by distance if user coords are provided, otherwise keep default
    if (userLat && userLng) {
      formattedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    res.json(formattedResults);
  } catch (error) {
    console.error('Inventory search error:', error);
    res.status(500).json({ message: 'Server error searching stock' });
  }
});

module.exports = router;

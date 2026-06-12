const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  medicineImage: {
    type: String,
    default: '' // Custom image uploaded by pharmacy
  },
  availability: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure a pharmacy only has one inventory record per medicine
InventorySchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', InventorySchema);

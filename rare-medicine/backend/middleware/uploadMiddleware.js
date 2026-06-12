const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Storage configuration for Licenses
const licenseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/licenses');
    createDirectory(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `license-${Date.now()}${path.extname(file.originalname)}`
    );
  }
});

// Storage configuration for Medicine Images
const medicineStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/medicines');
    createDirectory(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `medicine-${Date.now()}${path.extname(file.originalname)}`
    );
  }
});

// File filter (allow images and PDFs for licenses, only images for medicine)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const isValidMime = file.mimetype.startsWith('image/') || 
                      file.mimetype === 'application/pdf' || 
                      file.mimetype === 'application/octet-stream';

  if (extname && (isValidMime || !file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only JPEG, JPG, PNG, or PDF files are allowed'));
};

const imageFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const isImageMime = file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream';

  if (extname && (isImageMime || !file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only JPEG, JPG, PNG, or WEBP images are allowed'));
};

const uploadLicense = multer({
  storage: licenseStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

const uploadMedicine = multer({
  storage: medicineStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

module.exports = {
  uploadLicense,
  uploadMedicine
};

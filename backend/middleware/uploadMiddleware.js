// middleware/uploadMiddleware.js

// Ensure upload directory exists
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const config = require('../config/config');

// Correct: use already-joined absolute path
const uploadDir = path.join(config.uploadDir, 'audio');

fs.ensureDirSync(uploadDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.mp3';
    cb(null, 'upload-' + uniqueSuffix + extension);
  }
});

// File filter to only allow audio files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only audio files are allowed.'), false);
  }
};

// Size limits for uploads (50MB)
const limits = {
  fileSize: 50 * 1024 * 1024
};

// Create the multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits
});

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large. Maximum size is 50MB.'
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      error: `Upload error: ${err.message}`
    });
  }
  next();
};

module.exports = upload;
module.exports.handleUploadError = handleUploadError;
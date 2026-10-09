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

// File filter to only allow audio and video files (audio is extracted from video later)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only audio or video files are allowed.'), false);
  }
};

// Size limits for uploads (200MB, to allow for video files)
const MAX_UPLOAD_MB = 200;
const limits = {
  fileSize: MAX_UPLOAD_MB * 1024 * 1024
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
        error: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB.`
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`
    });
  } else if (err) {
    // Rejected by fileFilter (unsupported file type)
    return res.status(400).json({
      error: err.message
    });
  }
  next();
};

module.exports = upload;
module.exports.handleUploadError = handleUploadError;
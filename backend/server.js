// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs-extra');
const apiRoutes = require('./routes/api');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputsDir);
fs.ensureDirSync(path.join(outputsDir, 'pdf'));
fs.ensureDirSync(path.join(outputsDir, 'markdown'));
fs.ensureDirSync(path.join(uploadsDir, 'audio'));

// Middleware
app.use(cors());
// Configure JSON parsing middleware with explicit size limits
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
  if (req.body && Object.keys(req.body).length) {
    console.log(`[DEBUG] Parsed Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  if (req.extractedYouTubeUrl) {
    console.log(`[DEBUG] Pre-extracted YouTube URL: ${req.extractedYouTubeUrl}`);
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Import YouTube URL extractor middleware
const youtubeUrlExtractor = require('./middleware/youtubeUrlExtractor');

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
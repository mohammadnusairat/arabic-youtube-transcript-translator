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

// Raw body capture middleware for transcription requests
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/transcribe')) {
    console.log('[DEBUG] Content-Type:', req.headers['content-type']);
    console.log('[DEBUG] Original body before raw capture:', req.body);
    
    // For text/plain content-type, directly use the body as rawBody
    if (req.headers['content-type'] === 'text/plain') {
      console.log('[DEBUG] Processing text/plain request');
      if (req.body) {
        const urlText = req.body.toString();
        console.log('[DEBUG] Text/plain body:', urlText);
        
        if (urlText.includes('youtube.com') || urlText.includes('youtu.be')) {
          req.youtubeUrl = urlText.trim();
          console.log('[DEBUG] YouTube URL from text/plain:', req.youtubeUrl);
        }
      }
      return next();
    }
    
    // For other content types or if text/plain didn't work, try to capture raw body
    let rawBody = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk) => { 
      rawBody += chunk;
    });
    
    req.on('end', () => {
      console.log(`[DEBUG] RAW ${req.method} REQUEST TO ${req.path}:`);
      console.log(rawBody);
      
      // Store raw body for controllers to access
      req.rawBody = rawBody;
      
      // Try to extract YouTube URL from raw body if it's a string containing YouTube URL
      if (rawBody && (rawBody.includes('youtube.com') || rawBody.includes('youtu.be'))) {
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(rawBody);
          if (jsonData && jsonData.url) {
            req.youtubeUrl = jsonData.url;
            console.log('[DEBUG] Extracted YouTube URL from JSON:', req.youtubeUrl);
          }
        } catch (e) {
          // Not valid JSON, try regex extraction
          const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/[^\s"']+/g;
          const matches = rawBody.match(urlRegex);
          if (matches && matches.length > 0) {
            req.youtubeUrl = matches[0];
            console.log('[DEBUG] Extracted YouTube URL with regex:', req.youtubeUrl);
          } else if (rawBody.trim().startsWith('http')) {
            req.youtubeUrl = rawBody.trim();
            console.log('[DEBUG] Raw body appears to be a URL:', req.youtubeUrl);
          }
        }
      }
      next();
    });
  } else {
    next();
  }
});

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

// Apply YouTube URL extractor middleware to transcription endpoint
app.post('/api/transcribe', youtubeUrlExtractor);

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
// config/config.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base directories
const baseDir = path.join(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const outputDir = process.env.OUTPUT_DIR || 'outputs';
const tempDir = process.env.TEMP_DIR || 'temp';

// Configuration object
const config = {
  // Server settings
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API keys
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  markitdownApiKey: process.env.MARKITDOWN_API_KEY || '',
  markitdownEndpoint: process.env.MARKITDOWN_ENDPOINT || '',
  markitdownRegion: process.env.MARKITDOWN_REGION || 'eastus',
  
  // Directories
  baseDir,
  uploadDir: path.join(baseDir, uploadDir),
  outputDir: path.join(baseDir, outputDir),
  tempDir: path.join(baseDir, tempDir),
  
  // Feature flags
  useSimulation: process.env.USE_SIMULATION === 'true' || (!process.env.OPENAI_API_KEY && !process.env.MARKITDOWN_API_KEY),
  
  // API settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  
  // Limits
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxJobsInMemory: 100,
};

module.exports = config;
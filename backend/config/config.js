// config/config.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base directory
const baseDir = path.join(__dirname, '..');

// Join helper to avoid double-prefixing absolute paths
function safeJoin(dir) {
  return path.isAbsolute(dir) ? dir : path.join(baseDir, dir);
}

// Correctly resolved paths
const uploadDir = safeJoin(process.env.UPLOAD_DIR || 'uploads');
const outputDir = safeJoin(process.env.OUTPUT_DIR || 'outputs');
const tempDir = safeJoin(process.env.TEMP_DIR || 'temp');

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

  // Corrected directories
  baseDir,
  uploadDir,
  outputDir,
  tempDir,

  // Feature flags
  useSimulation:
    process.env.USE_SIMULATION === 'true' ||
    (!process.env.OPENAI_API_KEY && !process.env.MARKITDOWN_API_KEY),

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },

  // Limits
  maxFileSize: 50 * 1024 * 1024,
  maxJobsInMemory: 100,
};

module.exports = config;

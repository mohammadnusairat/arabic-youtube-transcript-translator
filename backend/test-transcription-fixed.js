// test-transcription-fixed.js
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const youtubeService = require('./services/youtubeService');
const transcriptionService = require('./services/transcriptionService');

// Load environment variables
dotenv.config();

// ANSI color codes for better output readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print colored message
 * @param {string} message - Message to print
 * @param {string} color - Color to use
 * @param {boolean} isBold - Whether to make text bold
 */
function log(message, color = colors.reset, isBold = false) {
  const boldPrefix = isBold ? colors.bright : '';
  console.log(`${boldPrefix}${color}${message}${colors.reset}`);
}

/**
 * Print separator for better console readability
 */
function separator() {
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
}

/**
 * Main test function to extract audio from YouTube and transcribe it
 * @param {string} youtubeUrl - URL of the Arabic YouTube video
 */
async function testTranscription(youtubeUrl) {
  separator();
  log('🚀 TESTING TRANSCRIPTION SERVICE WITH ARABIC YOUTUBE VIDEO', colors.magenta, true);
  separator();
  
  log(`Testing with YouTube URL: ${youtubeUrl}`, colors.blue);
  log('', colors.reset);

  try {
    // Step 1: Extract audio from YouTube
    log('1️⃣ Extracting audio from YouTube...', colors.cyan, true);
    const { videoId, title, audioFile } = await youtubeService.extractAudio(youtubeUrl);
    log(`✅ Audio extracted successfully!`, colors.green);
    log(`Video ID: ${videoId}`, colors.yellow);
    log(`Title: ${title}`, colors.yellow);
    log(`Audio file: ${audioFile}`, colors.yellow);
    log('', colors.reset);
    
    // Verify the audio file exists
    if (!fs.existsSync(audioFile)) {
      throw new Error(`Audio file not found at path: ${audioFile}`);
    }
    log(`File size: ${(fs.statSync(audioFile).size / (1024 * 1024)).toFixed(2)} MB`, colors.yellow);
    
    // Step 2: Transcribe the audio
    log('2️⃣ Transcribing audio file with Azure Speech SDK...', colors.cyan, true);
    log('This will use our updated code with proper API key and region formatting', colors.blue);
    log('', colors.reset);
    
    // Check if we have Azure Speech SDK credentials
    const apiKey = process.env.MARKITDOWN_API_KEY || '';
    const region = process.env.MARKITDOWN_REGION || '';
    
    if (!apiKey) {
      log('⚠️ Warning: MARKITDOWN_API_KEY not set, simulation mode will be used', colors.yellow, true);
    }
    
    if (!region) {
      log('⚠️ Warning: MARKITDOWN_REGION not set, using default region eastus', colors.yellow, true);
    }
    
    // Start timing
    const startTime = Date.now();
    log(`Starting transcription at: ${new Date(startTime).toLocaleTimeString()}`, colors.blue);
    
    // Transcribe the audio
    const transcription = await transcriptionService.transcribeAudio(audioFile);
    
    // Calculate time taken
    const endTime = Date.now();
    const timeElapsed = (endTime - startTime) / 1000; // Convert to seconds
    log(`✅ Transcription completed in ${timeElapsed.toFixed(2)} seconds`, colors.green, true);
    
    // Log results
    log('', colors.reset);
    log('3️⃣ Transcription results:', colors.cyan, true);
    
    // Check if we got valid transcription data
    if (!transcription || !Array.isArray(transcription) || transcription.length === 0) {
      log('⚠️ No transcription segments returned', colors.yellow, true);
      log('This might indicate an issue or the simulation data was used', colors.yellow);
    } else {
      // Show summary
      log(`Total segments: ${transcription.length}`, colors.green);
      log(`Total duration: ${transcription[transcription.length-1].end.toFixed(2)} seconds`, colors.green);
      
      // Sample the first few segments
      log('', colors.reset);
      log('📝 Sample transcription segments:', colors.magenta);
      const sampleSize = Math.min(5, transcription.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const segment = transcription[i];
        log(`[${segment.start.toFixed(2)} - ${segment.end.toFixed(2)}]: ${segment.text}`, colors.yellow);
      }
      
      if (transcription.length > sampleSize) {
        log(`... and ${transcription.length - sampleSize} more segments`, colors.yellow);
      }
    }
    
    // Clean up
    log('', colors.reset);
    log('4️⃣ Cleaning up temporary files...', colors.cyan);
    try {
      await fs.remove(audioFile);
      log(`✅ Removed temporary audio file: ${path.basename(audioFile)}`, colors.green);
    } catch (cleanupError) {
      log(`⚠️ Warning: Failed to remove temporary file: ${cleanupError.message}`, colors.yellow);
    }
    
    separator();
    log('✅ TEST COMPLETED SUCCESSFULLY!', colors.green, true);
    separator();
    
  } catch (error) {
    log(`❌ TEST FAILED: ${error.message}`, colors.red, true);
    log('Error details:', colors.red);
    console.error(error);
    separator();
    process.exit(1);
  }
}

// Arabic YouTube video URL to test with
const testVideoUrl = 'https://www.youtube.com/watch?v=lhbEO0EqH5c'; // Provided test URL

// Execute the test
testTranscription(testVideoUrl)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
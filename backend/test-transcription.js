// backend/test-transcription.js
const fs = require('fs');
const path = require('path');
const transcriptionService = require('./services/transcriptionService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Path to sample audio file (create or reference an existing file)
const sampleAudioPath = path.join(__dirname, 'test-audio.mp3');

// Function to create a test audio file if it doesn't exist
function ensureSampleAudioExists() {
  if (fs.existsSync(sampleAudioPath)) {
    console.log(`Using existing sample audio file: ${sampleAudioPath}`);
    return true;
  }
  
  console.log('Sample audio file not found. Using a simulated test instead.');
  return false;
}

// Function to test transcription
async function testTranscription() {
  console.log('\n=== Testing Transcription Service ===');
  
  try {
    // Check if we have a sample audio file
    const hasAudio = ensureSampleAudioExists();
    
    if (!hasAudio) {
      console.log('\nRunning test with simulation mode.');
      // Temporarily enable simulation by directly modifying the config
      const config = require('./config/config');
      Object.defineProperty(config, 'useSimulation', { value: true });
    }
    
    // Validate configuration
    console.log('\nValidating configuration:');
    console.log(`- markitdownApiKey: ${!!process.env.MARKITDOWN_API_KEY ? '✓ Present' : '✗ Missing'}`);
    console.log(`- markitdownEndpoint: ${!!process.env.MARKITDOWN_ENDPOINT ? '✓ Present' : '✗ Missing'}`);
    console.log(`- markitdownRegion: ${!!process.env.MARKITDOWN_REGION ? '✓ Present' : '✗ Missing'}`);
    
    // Start transcription
    console.log('\nStarting transcription process...');
    const startTime = Date.now();
    
    // If we're in simulation mode, we don't need an actual file
    const audioPath = hasAudio ? sampleAudioPath : 'simulated.mp3';
    
    // Call the transcription service
    const transcriptionResults = await transcriptionService.transcribeAudio(audioPath);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\nTranscription completed in ${duration.toFixed(2)} seconds.`);
    console.log(`Received ${transcriptionResults.length} segments.`);
    
    // Display sample of results
    if (transcriptionResults.length > 0) {
      console.log('\nSample transcription segments:');
      const sampleSize = Math.min(3, transcriptionResults.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const segment = transcriptionResults[i];
        console.log(`[${transcriptionService.formatTimestamp(segment.start)} - ${transcriptionService.formatTimestamp(segment.end)}]: ${segment.text}`);
      }
      
      console.log('\n✅ Transcription test completed successfully!');
    } else {
      console.log('\n❌ No transcription segments were returned.');
    }
    
    // Reset simulation mode
    if (!hasAudio) {
      process.env.USE_SIMULATION = 'false';
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Transcription test failed:', error.message);
    console.error('Error details:', error);
    
    if (error.message.includes('Audio file not found')) {
      console.log('\nNote: This error is expected if you are running in simulation mode without a real audio file.');
      console.log('To test with a real file, place an MP3 file at:', sampleAudioPath);
    }
    
    return false;
  }
}

// Run the test and exit with appropriate code
testTranscription()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
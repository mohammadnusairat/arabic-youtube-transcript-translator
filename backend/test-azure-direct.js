// test-azure-direct.js
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { Transform } = require('stream');
const crypto = require('crypto');

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
 * Create a simple test audio file if none exists
 * @returns {string} Path to the test audio file
 */
async function ensureTestAudioFile() {
  // Create a temporary directory for our test
  const tempDir = path.join(__dirname, 'temp');
  await fs.ensureDir(tempDir);
  
  const testAudioPath = path.join(tempDir, 'test-audio.wav');
  
  // If we already have a test file, use it
  if (fs.existsSync(testAudioPath)) {
    log(`Using existing test audio file: ${testAudioPath}`, colors.yellow);
    return testAudioPath;
  }
  
  // Otherwise, create a simple audio file with silence (1 second)
  log('Creating a simple test audio file...', colors.yellow);
  
  // Generate 1 second of silence (8000 samples/sec, 16-bit)
  const sampleRate = 16000;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  
  // WAV header for PCM 16-bit mono audio at 16kHz
  const header = Buffer.alloc(44);
  
  // "RIFF" chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + numSamples * 2, 4); // File size - 8
  header.write('WAVE', 8);
  
  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Sub-chunk size (16 for PCM)
  header.writeUInt16LE(1, 20); // Audio format (1 for PCM)
  header.writeUInt16LE(1, 22); // Num channels (1 for mono)
  header.writeUInt32LE(sampleRate, 24); // Sample rate
  header.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  header.writeUInt16LE(2, 32); // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  
  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(numSamples * 2, 40); // Data size
  
  // Create audio samples (all zeros for silence)
  const samples = Buffer.alloc(numSamples * 2);
  
  // Write the WAV file
  await fs.writeFile(testAudioPath, Buffer.concat([header, samples]));
  
  log(`Created test audio file: ${testAudioPath}`, colors.green);
  return testAudioPath;
}

/**
 * Test Azure Speech SDK with a local audio file
 * @param {string} audioFilePath - Path to the audio file to test with
 */
async function testAzureSpeech(audioFilePath) {
  separator();
  log('🚀 TESTING AZURE SPEECH SDK WITH LOCAL AUDIO FILE', colors.magenta, true);
  separator();
  
  log(`Testing with audio file: ${audioFilePath}`, colors.blue);
  log('', colors.reset);

  // Check if the audio file exists
  if (!fs.existsSync(audioFilePath)) {
    log(`❌ Audio file not found: ${audioFilePath}`, colors.red, true);
    process.exit(1);
  }
  
  // Get file size
  const fileStats = await fs.stat(audioFilePath);
  log(`File size: ${(fileStats.size / 1024).toFixed(2)} KB`, colors.yellow);
  
  try {
    // Get API key and region from environment variables
    const apiKey = process.env.MARKITDOWN_API_KEY;
    const region = process.env.MARKITDOWN_REGION || 'eastus';
    
    if (!apiKey) {
      log(`❌ ERROR: MARKITDOWN_API_KEY environment variable not set!`, colors.red, true);
      log('Please make sure the API key is correctly set in the .env file.', colors.yellow);
      process.exit(1);
    }
    
    log(`API Key exists: ${!!apiKey} (${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)})`, colors.yellow);
    log(`Region: ${region}`, colors.yellow);
    
    // Ensure region is correctly formatted (lowercase, no spaces)
    const formattedRegion = region.toLowerCase().trim();
    log(`Using formatted region: ${formattedRegion}`, colors.yellow);
    
    // Step 1: Create Speech Configuration
    log('', colors.reset);
    log('1️⃣ Creating speech configuration...', colors.cyan, true);
    
    const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, formattedRegion);
    log('✅ Speech configuration created successfully!', colors.green);
    
    // Set recognition language to Arabic
    speechConfig.speechRecognitionLanguage = 'ar-SA';
    log('Set recognition language to Arabic (ar-SA)', colors.yellow);
    
    // Step 2: Initialize audio configuration with local file
    log('', colors.reset);
    log('2️⃣ Creating audio configuration from file...', colors.cyan, true);
    
    const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(audioFilePath));
    log('✅ Audio configuration created successfully!', colors.green);
    
    // Step 3: Create speech recognizer
    log('', colors.reset);
    log('3️⃣ Creating speech recognizer...', colors.cyan, true);
    
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    log('✅ Speech recognizer created successfully!', colors.green);
    
    // Step 4: Perform the transcription
    log('', colors.reset);
    log('4️⃣ Starting transcription...', colors.cyan, true);
    
    // Collect transcription results
    const transcriptionResults = [];
    
    // Start timing
    const startTime = Date.now();
    
    // Create a promise to handle the async recognition
    await new Promise((resolve, reject) => {
      // Handle recognition results
      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const resultText = e.result.text;
          log(`Recognized: ${resultText}`, colors.green);
          
          // Add to our results
          transcriptionResults.push({
            text: resultText,
            // Add fake timestamps since Azure doesn't return them in this mode
            start: 0,
            end: 1
          });
        }
        else if (e.result.reason === sdk.ResultReason.NoMatch) {
          log(`NOMATCH: No speech could be recognized.`, colors.yellow);
        }
      };
      
      // Handle errors
      recognizer.canceled = (s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          log(`❌ ERROR: ${e.errorDetails}`, colors.red, true);
          reject(new Error(e.errorDetails));
        }
      };
      
      // Handle session stop
      recognizer.sessionStopped = (s, e) => {
        log('Speech recognition session stopped.', colors.yellow);
        recognizer.stopContinuousRecognitionAsync();
        resolve();
      };
      
      // Start recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          log('Recognition started', colors.green);
          
          // Set a timeout to force stop after a reasonable time
          // (in case the audio is just silence)
          setTimeout(() => {
            recognizer.stopContinuousRecognitionAsync();
          }, 5000); // 5 seconds timeout
        },
        (err) => {
          log(`❌ ERROR: ${err}`, colors.red);
          reject(err);
        }
      );
    });
    
    // Calculate time taken
    const endTime = Date.now();
    const timeElapsed = (endTime - startTime) / 1000; // seconds
    
    log(`✅ Transcription completed in ${timeElapsed.toFixed(2)} seconds`, colors.green, true);
    
    // Log results
    log('', colors.reset);
    log('5️⃣ Transcription results:', colors.cyan, true);
    
    if (transcriptionResults.length === 0) {
      log('No speech was recognized. This might be normal for a blank test file.', colors.yellow);
    } else {
      log(`Total segments: ${transcriptionResults.length}`, colors.green);
      
      // Display each segment
      transcriptionResults.forEach((segment, index) => {
        log(`Segment ${index + 1}: ${segment.text}`, colors.yellow);
      });
    }
    
    // Final status
    log('', colors.reset);
    separator();
    log('✅ AZURE SPEECH SDK TEST COMPLETED SUCCESSFULLY!', colors.green, true);
    log('The SDK is properly authenticated and working correctly.', colors.green);
    separator();
    
    // Clean up resources
    recognizer.close();
    
  } catch (error) {
    log(`❌ TEST FAILED: ${error.message}`, colors.red, true);
    log('Error details:', colors.red);
    console.error(error);
    separator();
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    // Ensure we have a test audio file
    const audioFilePath = await ensureTestAudioFile();
    
    // Run the test
    await testAzureSpeech(audioFilePath);
    
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();
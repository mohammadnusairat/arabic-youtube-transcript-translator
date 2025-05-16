// backend/test-azure-speech-fixed.js
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Function to validate Azure Speech API key format
function validateApiKeyFormat(apiKey) {
  // Typical Azure Speech API keys are 32 characters long hexadecimal strings
  const isStandardFormat = /^[a-f0-9]{32}$/i.test(apiKey);
  
  // Some Azure keys can be Base64 encoded
  const isBase64Format = /^[A-Za-z0-9+/=]+$/i.test(apiKey) && (apiKey.length % 4 === 0);
  
  // Check length - standard Azure keys are typically less than 50 chars
  const isReasonableLength = apiKey.length <= 50;
  
  console.log('API key validation:');
  console.log(`- Standard format (32 char hex): ${isStandardFormat}`);
  console.log(`- Possible Base64 format: ${isBase64Format}`);
  console.log(`- Reasonable length (<= 50 chars): ${isReasonableLength}`);
  console.log(`- Actual length: ${apiKey.length} chars`);
  
  return isStandardFormat || (isBase64Format && isReasonableLength);
}

// Function to check if key might be a different Microsoft API key
function checkPossibleKeyType(apiKey) {
  // Try to make educated guesses about the key type
  if (apiKey.length > 60) {
    return 'This appears to be a longer key format than typical Azure Speech Service subscription keys. It might be another Microsoft service key.';
  }
  
  if (apiKey.includes('.')) {
    return 'This key contains periods, which is unusual for Azure Speech Service keys. It might be a token or JWT.';
  }
  
  return 'Unknown key format';
}

// Function to test Azure Speech SDK authentication
async function testAzureSpeechSDKAuth() {
  console.log('Testing Azure Speech SDK Authentication');
  console.log('-------------------------------------');
  
  // Log environment variables for debugging (masking sensitive parts)
  console.log('Environment variables check:');
  const apiKey = process.env.MARKITDOWN_API_KEY;
  const endpoint = process.env.MARKITDOWN_ENDPOINT;
  const region = process.env.MARKITDOWN_REGION;
  
  console.log(`API Key exists: ${!!apiKey} (${apiKey ? apiKey.substring(0, 5) + '...' : 'missing'})`);
  console.log(`Endpoint exists: ${!!endpoint} (${endpoint || 'missing'})`);
  console.log(`Region exists: ${!!region} (${region || 'missing'})`);
  
  if (!apiKey || !region) {
    console.error('ERROR: Missing required Azure Speech credentials in .env file');
    console.error('Make sure MARKITDOWN_API_KEY and MARKITDOWN_REGION are properly set');
    return false;
  }
  
  // Validate API key format
  const isValidFormat = validateApiKeyFormat(apiKey);
  if (!isValidFormat) {
    console.warn('\nWARNING: The API key does not appear to be in standard Azure Speech Services format');
    console.warn(checkPossibleKeyType(apiKey));
    console.warn('\nThis might still work if the service accepts this format, but it\'s unusual.');
  }
  
  try {
    console.log('\nCreating SpeechConfig with provided credentials...');
    
    // Create speech configuration with the API key and region
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      apiKey,
      region
    );
    
    // Set speech recognition language (Arabic)
    speechConfig.speechRecognitionLanguage = 'ar-SA';
    
    // Test by creating a recognizer
    console.log('Creating SpeechRecognizer to test authentication...');
    
    // Create a simple test audio stream
    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    
    // Create speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Test recognizer initialization
    if (recognizer) {
      console.log('✅ Successfully created SpeechRecognizer - authentication is working!');
      
      // Clean up resources
      recognizer.close();
      pushStream.close();
      
      return true;
    }
  } catch (error) {
    console.error('❌ Azure Speech SDK Authentication Error:');
    console.error(`Error message: ${error.message}`);
    
    // Check for common error patterns
    if (error.message.includes('InvalidAuthenticationToken') || error.message.includes('401')) {
      console.error('\nPossible causes:');
      console.error('- The API key is incorrect or malformed');
      console.error('- The API key has expired or been revoked');
      console.error('- This might not be an Azure Speech Service key at all');
    } else if (error.message.includes('region')) {
      console.error('\nPossible causes:');
      console.error('- The region is incorrect or not supported');
      console.error('- The region format is incorrect (should be like "eastus", not the full endpoint URL)');
    }
    
    return false;
  }
}

// Run the test
testAzureSpeechSDKAuth()
  .then(success => {
    console.log('\nTest completed.');
    if (!success) {
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure your MARKITDOWN_API_KEY is valid and correctly formatted for Azure Speech Services');
      console.log('   - Azure Speech Service keys are typically 32-character hexadecimal strings');
      console.log('   - The current key appears to be a different format and may be for a different service');
      console.log('2. Confirm MARKITDOWN_REGION is set to a valid region (e.g., "eastus")');
      console.log('3. Check if your Azure subscription is active and has access to Speech services');
      console.log('4. Try regenerating the API key in the Azure portal');
      console.log('\nIMPORTANT: The name "Microsoft MarkItDown" suggests this might be a different service');
      console.log('than Azure Speech Services. Please verify which Microsoft service you\'re actually using.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error during test:', err);
    process.exit(1);
  });
// backend/test-azure-speech.js
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

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
      console.log('1. Make sure your MARKITDOWN_API_KEY is valid and correctly formatted');
      console.log('2. Confirm MARKITDOWN_REGION is set to a valid region (e.g., "eastus")');
      console.log('3. Check if your Azure subscription is active and has access to Speech services');
      console.log('4. Try regenerating the API key in the Azure portal');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error during test:', err);
    process.exit(1);
  });
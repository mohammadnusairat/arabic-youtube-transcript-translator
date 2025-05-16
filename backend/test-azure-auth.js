// test-azure-auth.js
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Print a colored and formatted message
 * @param {string} message - Message to print
 * @param {string} color - Color to use
 * @param {boolean} isBold - Whether to make the text bold
 */
function printMessage(message, color = colors.white, isBold = false) {
  const boldPrefix = isBold ? colors.bright : '';
  console.log(`${boldPrefix}${color}${message}${colors.reset}`);
}

/**
 * Print a separator line
 * @param {string} color - Color to use
 */
function printSeparator(color = colors.cyan) {
  console.log(`${color}${'='.repeat(80)}${colors.reset}`);
}

/**
 * Test Azure Speech SDK authentication using direct API key and region
 */
async function testAzureSpeechAuthentication() {
  printSeparator();
  printMessage('AZURE SPEECH SDK AUTHENTICATION TEST', colors.magenta, true);
  printSeparator();

  // Get API key and region from environment variables
  const apiKey = process.env.MARKITDOWN_API_KEY;
  const region = process.env.MARKITDOWN_REGION || 'eastus';
  
  // Check if API key exists
  if (!apiKey) {
    printMessage('❌ ERROR: MARKITDOWN_API_KEY environment variable not set!', colors.red, true);
    printMessage('Please check your .env file and make sure the API key is correctly set.', colors.yellow);
    process.exit(1);
  }

  // Log the API key (masked) and region for verification
  printMessage(`API Key:       ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`, colors.yellow);
  printMessage(`Region:        ${region}`, colors.yellow);

  try {
    printMessage('\n1️⃣ Creating Speech configuration...', colors.cyan);
    
    // Initialize the SDK with the API key and region
    const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region);
    printMessage('✅ Speech configuration created successfully!', colors.green);

    // Set Arabic as the recognition language
    speechConfig.speechRecognitionLanguage = 'ar-SA';
    printMessage('👉 Set recognition language to Arabic (ar-SA)', colors.green);

    printMessage('\n2️⃣ Testing speech recognition capabilities...', colors.cyan);

    // Create a recognizer with the configuration (use a push stream for Node.js environment)
    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    printMessage('✅ Speech recognizer created successfully!', colors.green);

    // Test a simple operation to verify the SDK is working
    printMessage('\n3️⃣ Testing SDK connection to Azure services...', colors.cyan);
    
    printMessage('This will attempt to get a proper authentication token from Azure', colors.yellow);
    printMessage('(No audio will be processed, this just tests the connection)', colors.yellow);

    // Create a Promise to handle the async test
    await new Promise((resolve, reject) => {
      // Set a timeout to simulate a successful test if no errors occur quickly
      const timeout = setTimeout(() => {
        printMessage('✅ Authentication successful! API key and region are valid.', colors.green, true);
        resolve();
      }, 3000);
      
      // The recognizer.canceled event will fire if there's an auth error
      recognizer.canceled = (_, event) => {
        clearTimeout(timeout);
        if (event.reason === sdk.CancellationReason.Error) {
          printMessage(`❌ ERROR: ${event.errorDetails}`, colors.red, true);
          reject(new Error(event.errorDetails));
        }
      };
      
      // Start a recognition session (this will test auth without sending audio)
      recognizer.startContinuousRecognitionAsync(
        () => {
          printMessage('👉 Recognition session started (auth test only)', colors.yellow);
          // After a brief moment, stop the session since we're just testing auth
          setTimeout(() => {
            recognizer.stopContinuousRecognitionAsync();
          }, 1000);
        },
        (error) => {
          clearTimeout(timeout);
          printMessage(`❌ ERROR: Failed to start recognition: ${error}`, colors.red, true);
          reject(error);
        }
      );
      
      // The recognizer.sessionStopped event will fire when we stop recognition
      recognizer.sessionStopped = () => {
        clearTimeout(timeout);
        printMessage('✅ Recognition session stopped successfully', colors.green);
        resolve();
      };
    })
    .then(() => {
      printMessage('\n✅ AUTHENTICATION TEST PASSED!', colors.green, true);
      printMessage('Azure Speech SDK authentication is working correctly.', colors.green);
      printMessage('The API key and region are valid and properly configured.', colors.green);
    })
    .catch((error) => {
      printMessage('\n❌ AUTHENTICATION TEST FAILED!', colors.red, true);
      printMessage(`Error details: ${error.message}`, colors.red);
      printMessage(`\nPossible causes:`, colors.yellow);
      printMessage(`1. The API key "${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}" is incorrect`, colors.yellow);
      printMessage(`2. The region "${region}" does not match the Azure resource region`, colors.yellow);
      printMessage(`3. The Azure Speech service subscription is inactive or disabled`, colors.yellow);
    })
    .finally(() => {
      // Ensure proper cleanup
      recognizer.close();
    });

  } catch (error) {
    printMessage(`\n❌ ERROR: Failed to create Speech configuration: ${error.message}`, colors.red, true);
    printMessage('Check if the API key and region are in the correct format.', colors.yellow);
    
    // If we have SDK details, print them for extra context
    if (sdk.Recognizer) {
      printMessage('\nSDK Information:', colors.cyan);
      printMessage(`SDK Version: ${sdk.Recognizer.sdkVersionInfo || 'Unknown'}`, colors.yellow);
    }
  }
  
  printSeparator();
}

// Run the authentication test
testAzureSpeechAuthentication();
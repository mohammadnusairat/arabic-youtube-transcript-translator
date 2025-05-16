// Specialized debug script for YouTube URL processing
// Use built-in fetch in Node.js v18+
const { fetch } = global;
const fs = require('fs');
const path = require('path');

// Configure test server
const API_URL = 'http://localhost:4000/api/transcribe';
const LOG_FILE = path.join(__dirname, 'youtube-debug-log.txt');

// Open log file
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Test URL submission with different formats and methods
async function testUrlSubmission() {
  log('======= YOUTUBE URL DEBUGGING TEST =======');
  
  // Test URLs
  const testUrl = 'https://www.youtube.com/watch?v=lhbEO0EqH5c'; // Arabic video
  
  // Test different submission formats
  const testCases = [
    {
      name: 'Standard JSON object',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl })
    },
    {
      name: 'Raw URL string',
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: testUrl
    },
    {
      name: 'URL in query string',
      method: 'GET',
      headers: {},
      queryParams: `?url=${encodeURIComponent(testUrl)}`
    },
    {
      name: 'Form data submission',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(testUrl)}`
    }
  ];
  
  // Run all tests
  for (const test of testCases) {
    try {
      log(`\n--- Testing: ${test.name} ---`);
      
      const url = test.method === 'GET' ? API_URL + (test.queryParams || '') : API_URL;
      log(`Request URL: ${url}`);
      log(`Method: ${test.method}`);
      log(`Headers: ${JSON.stringify(test.headers)}`);
      if (test.body) log(`Body: ${test.body}`);
      
      const response = await fetch(url, {
        method: test.method,
        headers: test.headers,
        body: test.method !== 'GET' ? test.body : undefined
      });
      
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        log(`Response (${response.status}): ${JSON.stringify(responseData, null, 2)}`);
      } else {
        responseData = await response.text();
        log(`Response (${response.status}): ${responseData}`);
      }
      
      if (responseData.jobId) {
        log(`✅ SUCCESS: JobID received: ${responseData.jobId}`);
      } else {
        log(`❌ FAILED: No JobID received`);
      }
      
    } catch (error) {
      log(`❌ ERROR: ${error.message}`);
    }
  }
  
  log('\n======= TEST COMPLETE =======');
  logStream.end();
}

// Run the test
log('Starting YouTube URL submission tests...');
testUrlSubmission().then(() => {
  log(`Debug log saved to: ${LOG_FILE}`);
  console.log(`Debug log saved to: ${LOG_FILE}`);
}).catch(err => {
  log(`Fatal error: ${err.message}`);
  logStream.end();
});

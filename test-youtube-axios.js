// Test script with axios for better compatibility
const axios = require('axios');

// API endpoint
const API_URL = 'http://localhost:4000/api/transcribe';

// Test URLs
const testUrl = 'https://www.youtube.com/watch?v=lhbEO0EqH5c'; // Arabic video

async function testUrlSubmission() {
  console.log('======= TESTING FIXED YOUTUBE URL HANDLING WITH AXIOS =======');
  
  try {
    console.log('Sending YouTube URL via standard JSON POST request...');
    
    const response = await axios.post(API_URL, { url: testUrl }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.data.jobId) {
      console.log('✅ SUCCESS: Job created with ID:', response.data.jobId);
      console.log('YouTube URL handling fix was successful!');
      return true;
    } else {
      console.log('❌ ERROR: No job ID returned. Fix not successful.');
      return false;
    }
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
console.log('Starting YouTube URL handling test with axios...');
testUrlSubmission().then(success => {
  console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
}).catch(err => {
  console.error('Fatal error:', err.message);
});

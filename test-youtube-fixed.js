// Test script to verify the fixed YouTube URL handling
// Use the built-in fetch API for Node.js >= 18

// API endpoint
const API_URL = 'http://localhost:4000/api/transcribe';

// Test URLs
const testUrl = 'https://www.youtube.com/watch?v=lhbEO0EqH5c'; // Arabic video

async function testUrlSubmission() {
  console.log('======= TESTING FIXED YOUTUBE URL HANDLING =======');
  
  try {
    console.log('Sending YouTube URL via standard JSON POST request...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (data.jobId) {
      console.log('✅ SUCCESS: Job created with ID:', data.jobId);
      console.log('YouTube URL handling fix was successful!');
    } else {
      console.log('❌ ERROR: No job ID returned. Fix not successful.');
    }
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error.message);
  }
}

// Run the test
console.log('Starting YouTube URL handling test...');
testUrlSubmission().catch(err => {
  console.error('Fatal error:', err.message);
});

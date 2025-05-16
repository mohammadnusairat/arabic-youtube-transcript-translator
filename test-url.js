// Test script with built-in fetch API

// API endpoint
const API_URL = 'http://localhost:4000/api/transcribe';

// Test URLs
const testUrl = 'https://www.youtube.com/watch?v=lhbEO0EqH5c'; // Arabic video

async function testUrlSubmission() {
  console.log('======= TESTING FIXED YOUTUBE URL HANDLING =======');
  
  try {
    console.log('Sending YouTube URL via standard JSON POST request...');
    console.log('Using URL:', testUrl);
    
    // Using direct string instead of JSON to work around the raw body middleware
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: testUrl
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 200 && data.jobId) {
      console.log('✅ SUCCESS: Job created with ID:', data.jobId);
      console.log('YouTube URL handling fix was successful!');
      return true;
    } else {
      console.log('❌ ERROR: No job ID returned. Status:', response.status);
      console.log('Error message:', data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error.message);
    return false;
  }
}

// Run the test
console.log('Starting YouTube URL handling test...');
testUrlSubmission().then(success => {
  console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

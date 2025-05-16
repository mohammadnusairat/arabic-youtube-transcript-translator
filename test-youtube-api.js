// Test script for YouTube URL processing
const axios = require('axios');
const ytdl = require('ytdl-core');

console.log('=== YouTube URL Processing Test ===');

// Test URLs
const testUrls = [
  'https://www.youtube.com/watch?v=abcdefghijk', // Standard format
  'https://youtu.be/abcdefghijk', // Short format
  'https://youtube.com/shorts/abcdefghijk', // Shorts format
  'www.youtube.com/watch?v=abcdefghijk', // No protocol
  'youtube.com/watch?v=abcdefghijk' // No www
];

// Test URL validation function from backend
const { isValidYouTubeUrl, extractAudio } = require('./backend/services/youtubeService');

console.log('\n=== Backend URL Validation Tests ===');
testUrls.forEach(url => {
  console.log(`URL: ${url} => Valid: ${isValidYouTubeUrl(url)}`);
});

// Test URL extraction from frontend
const { validateYoutubeUrl, extractYoutubeVideoId } = require('./react_template/src/utils/validators');

console.log('\n=== Frontend URL Validation Tests ===');
testUrls.forEach(url => {
  console.log(`URL: ${url} => Valid: ${validateYoutubeUrl(url)}, ID: ${extractYoutubeVideoId(url)}`);
});

// Test API endpoints with axios
async function testApiEndpoint() {
  console.log('\n=== Testing API Endpoint with Axios ===');
  
  // Test different content types and formats
  const testCases = [
    {
      name: 'Standard JSON with standard URL',
      url: 'http://localhost:4000/api/transcribe',
      headers: { 'Content-Type': 'application/json' },
      data: { url: 'https://www.youtube.com/watch?v=abcdefghijk' }
    },
    {
      name: 'Standard JSON with short URL',
      url: 'http://localhost:4000/api/transcribe',
      headers: { 'Content-Type': 'application/json' },
      data: { url: 'https://youtu.be/abcdefghijk' }
    },
    {
      name: 'URL-encoded form data',
      url: 'http://localhost:4000/api/transcribe',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'url=https://www.youtube.com/watch?v=abcdefghijk'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTest case: ${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Headers: ${JSON.stringify(testCase.headers)}`);
    console.log(`Data: ${JSON.stringify(testCase.data)}`);
    
    try {
      const response = await axios({
        method: 'post',
        url: testCase.url,
        headers: testCase.headers,
        data: testCase.data
      });
      
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

// Add a command-line option to run API tests
if (process.argv.includes('--api-test')) {
  testApiEndpoint().catch(console.error);
} else {
  console.log('\nAdd --api-test flag to test API endpoints');
}

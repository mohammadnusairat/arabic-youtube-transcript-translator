const axios = require('axios');

async function testYoutubeUrlSubmission() {
  const BASE_URL = 'http://localhost:4000/api';
  const youtubeUrl = 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID'; // Replace with actual Arabic YouTube video ID
  
  console.log('Test 1: Submitting YouTube URL with Content-Type: application/json');
  try {
    console.log(`Sending request to ${BASE_URL}/transcribe with URL: ${youtubeUrl}`);
    console.log('Request body:', JSON.stringify({ url: youtubeUrl }));
    
    const response = await axios.post(`${BASE_URL}/transcribe`, { url: youtubeUrl }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('✅ Test 1 passed');
  } catch (error) {
    console.error('❌ Test 1 failed');
    console.error('Status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error message:', error.message);
  }
}

testYoutubeUrlSubmission();

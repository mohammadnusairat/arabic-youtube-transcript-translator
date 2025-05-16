// test-api.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:4000/api';

// Simple test functions for API endpoints
async function testHealthCheck() {
  try {
    console.log('🔍 Testing Health Check endpoint...');
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testUrlValidation(url) {
  try {
    console.log(`🔍 Testing URL validation for: ${url}`);
    const response = await axios.post(`${API_URL}/validate-url`, { url });
    console.log('✅ URL Validation:', response.data);
    return response.data.valid;
  } catch (error) {
    console.error('❌ URL Validation Failed:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
    return false;
  }
}

async function testStartTranscription(url) {
  try {
    console.log(`🔍 Starting transcription job for: ${url}`);
    const response = await axios.post(`${API_URL}/transcribe`, { youtubeUrl: url });
    console.log('✅ Job Started:', response.data);
    return response.data.jobId;
  } catch (error) {
    console.error('❌ Start Transcription Failed:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
    return null;
  }
}

async function testJobStatus(jobId) {
  try {
    console.log(`🔍 Checking status for job: ${jobId}`);
    const response = await axios.get(`${API_URL}/jobs/${jobId}/status`);
    console.log('✅ Job Status:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Job Status Check Failed:', error.message);
    return null;
  }
}

async function testListJobs() {
  try {
    console.log('🔍 Listing recent jobs...');
    const response = await axios.get(`${API_URL}/jobs`);
    console.log('✅ Recent Jobs:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ List Jobs Failed:', error.message);
    return [];
  }
}

async function testFileUpload(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }
    
    console.log(`🔍 Uploading audio file: ${filePath}`);
    
    const formData = new FormData();
    formData.append('audioFile', fs.createReadStream(filePath));
    
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('✅ File Upload:', response.data);
    return response.data.jobId;
  } catch (error) {
    console.error('❌ File Upload Failed:', error.message);
    return null;
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting API tests...');
  
  // Test health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.error('❌ Server is not responding. Aborting tests.');
    return;
  }
  
  // Test URL validation
  const validYoutubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Famous Rick Astley video
  const invalidYoutubeUrl = 'https://example.com/not-a-youtube-video';
  
  await testUrlValidation(validYoutubeUrl);
  await testUrlValidation(invalidYoutubeUrl);
  
  // Start transcription job
  const jobId = await testStartTranscription(validYoutubeUrl);
  
  if (jobId) {
    // Check job status
    await testJobStatus(jobId);
    
    // Wait a bit and check again
    console.log('⏳ Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await testJobStatus(jobId);
  }
  
  // List jobs
  await testListJobs();
  
  console.log('🏁 API tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite error:', error);
});
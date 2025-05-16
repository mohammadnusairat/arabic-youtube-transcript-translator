// Simple script to test the API directly with various URL formats
const fetch = require('node-fetch');

async function testApiWithUrl(url, format) {
  console.log(`\n===== Testing ${format} =====`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch('http://localhost:4000/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    return { success: response.status === 200, data };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const testUrls = [
    { url: 'https://www.youtube.com/watch?v=abcdefghijk', format: 'Standard youtube.com URL' },
    { url: 'https://youtu.be/abcdefghijk', format: 'Short youtu.be URL' },
    { url: 'https://youtube.com/shorts/abcdefghijk', format: 'YouTube Shorts URL' },
    // Real Arabic video URL for testing
    { url: 'https://www.youtube.com/watch?v=lhbEO0EqH5c', format: 'Real Arabic video URL' }
  ];
  
  console.log('Starting API tests...');
  
  const results = [];
  for (const test of testUrls) {
    const result = await testApiWithUrl(test.url, test.format);
    results.push({ ...test, result });
  }
  
  console.log('\n===== TEST SUMMARY =====');
  results.forEach(result => {
    console.log(`${result.format}: ${result.result.success ? '✅ PASS' : '❌ FAIL'}`);
  });
}

console.log('Running API tests to verify YouTube URL handling...');
runTests().catch(console.error);

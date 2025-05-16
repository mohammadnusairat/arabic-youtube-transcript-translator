// Test script to directly test URL submission with different content types

const testUrl = 'https://youtu.be/lhbEO0EqH5c';
const API_URL = 'http://localhost:4000/api/transcribe';

async function testJsonSubmission() {
  console.log('Testing JSON submission with Content-Type: application/json');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl })
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return { error: error.message };
  }
}

async function testTextPlainSubmission() {
  console.log('\nTesting plain text submission with Content-Type: text/plain');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: testUrl
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('Starting URL submission tests...');
  console.log('Test URL:', testUrl);
  
  // Run JSON test
  const jsonResult = await testJsonSubmission();
  
  // Run text/plain test
  const textResult = await testTextPlainSubmission();
  
  // Report overall results
  console.log('\n=== SUMMARY ===');
  console.log('JSON submission:', jsonResult.jobId ? 'SUCCESS' : 'FAILED');
  console.log('Text submission:', textResult.jobId ? 'SUCCESS' : 'FAILED');
}

// Run the tests
runTests().catch(console.error);

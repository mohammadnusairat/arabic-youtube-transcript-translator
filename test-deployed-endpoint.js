const axios = require('axios');

async function testDeployedApi() {
  // Production URL from the error message
  const PROD_URL = 'https://arabic-youtube-transcript-translator-mjvuvd-44msid-768161.mgx.dev';
  const TEST_URL = 'https://www.youtube.com/watch?v=TfVYxnhuEdU'; // Arabic YouTube video
  
  console.log(`Testing deployed API at ${PROD_URL}/api/transcribe`);
  
  try {
    // Test with JSON content type
    console.log('\n--- Test with application/json ---');
    const jsonResponse = await axios.post(`${PROD_URL}/api/transcribe`, 
      { url: TEST_URL },
      { 
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => true // Return response regardless of status code
      }
    );
    
    console.log(`Status: ${jsonResponse.status}`);
    console.log(`Response: ${JSON.stringify(jsonResponse.data, null, 2)}`);
    
    // Test with form-urlencoded content type as fallback
    console.log('\n--- Test with x-www-form-urlencoded ---');
    const params = new URLSearchParams();
    params.append('url', TEST_URL);
    
    const formResponse = await axios.post(`${PROD_URL}/api/transcribe`, 
      params,
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: (status) => true
      }
    );
    
    console.log(`Status: ${formResponse.status}`);
    console.log(`Response: ${JSON.stringify(formResponse.data, null, 2)}`);
    
  } catch (error) {
    console.error('Test failed with error:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

testDeployedApi();

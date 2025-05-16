// backend/test-end-to-end.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// API endpoint
const API_URL = 'http://localhost:4000/api';

// Sample Arabic YouTube video URL
const SAMPLE_ARABIC_VIDEO_URL = 'https://www.youtube.com/watch?v=JddP3zIk4O0'; // Arabic TED Talk

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print colored message to console
 * @param {string} message - Message to print
 * @param {string} color - Color to use
 * @param {boolean} isBright - Whether to make text bright
 */
function printColored(message, color = colors.reset, isBright = false) {
  const prefix = isBright ? colors.bright : '';
  console.log(`${prefix}${color}${message}${colors.reset}`);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submit job to process YouTube URL
 * @param {string} youtubeUrl - YouTube URL to process
 * @returns {Promise<string>} - Job ID
 */
async function submitJob(youtubeUrl) {
  printColored(`\n1. SUBMITTING JOB: ${youtubeUrl}`, colors.cyan, true);
  
  try {
    console.log(`Sending POST request to ${API_URL}/transcribe with URL: ${youtubeUrl}`);
    
    const response = await axios.post(`${API_URL}/transcribe`, { url: youtubeUrl }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.jobId) {
      printColored(`✅ Job submitted successfully! Job ID: ${response.data.jobId}`, colors.green);
      return response.data.jobId;
    } else {
      printColored(`❌ Failed to get job ID from response: ${JSON.stringify(response.data)}`, colors.red);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    printColored(`❌ Error submitting job:`, colors.red);
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Check job status
 * @param {string} jobId - Job ID to check
 * @returns {Promise<object>} - Job status
 */
async function checkJobStatus(jobId) {
  printColored(`\n2. CHECKING JOB STATUS: ${jobId}`, colors.cyan, true);
  
  try {
    console.log(`Sending GET request to ${API_URL}/status/${jobId}`);
    
    const response = await axios.get(`${API_URL}/status/${jobId}`);
    
    printColored(`📊 Current status: ${response.data.status}`, colors.yellow);
    if (response.data.progress) {
      printColored(`📈 Progress: ${response.data.progress}%`, colors.yellow);
    }
    
    return response.data;
  } catch (error) {
    printColored(`❌ Error checking job status:`, colors.red);
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Poll job status until completed or timeout
 * @param {string} jobId - Job ID to poll
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} interval - Interval between attempts in milliseconds
 * @returns {Promise<object>} - Final job status
 */
async function pollJobStatus(jobId, maxAttempts = 30, interval = 5000) {
  printColored(`\n3. POLLING JOB STATUS: ${jobId}`, colors.cyan, true);
  printColored(`Polling for job completion (max ${maxAttempts} attempts, ${interval/1000}s intervals)...`, colors.blue);
  
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const status = await checkJobStatus(jobId);
    
    if (status.status === 'completed') {
      printColored(`✅ Job completed successfully after ${attempts} attempts!`, colors.green);
      return status;
    } else if (status.status === 'failed') {
      printColored(`❌ Job failed: ${status.error || 'Unknown error'}`, colors.red);
      throw new Error(`Job failed: ${status.error || 'Unknown error'}`);
    } else if (attempts === maxAttempts) {
      printColored(`⏱️ Timeout reached after ${attempts} attempts`, colors.red);
      throw new Error('Job processing timeout');
    }
    
    printColored(`⏳ Job still processing... (attempt ${attempts}/${maxAttempts})`, colors.yellow);
    await sleep(interval);
  }
}

/**
 * Get job results
 * @param {string} jobId - Job ID to get results for
 * @returns {Promise<object>} - Job results
 */
async function getJobResults(jobId) {
  printColored(`\n4. GETTING JOB RESULTS: ${jobId}`, colors.cyan, true);
  
  try {
    console.log(`Sending GET request to ${API_URL}/jobs/${jobId}/results`);
    
    const response = await axios.get(`${API_URL}/jobs/${jobId}/results`);
    
    printColored(`✅ Successfully retrieved results!`, colors.green);
    return response.data;
  } catch (error) {
    printColored(`❌ Error getting job results:`, colors.red);
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Download result files
 * @param {string} jobId - Job ID to download files for
 * @param {string} fileType - File type to download (pdf or markdown)
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadResultFile(jobId, fileType) {
  printColored(`\n5. DOWNLOADING ${fileType.toUpperCase()} FILE: ${jobId}`, colors.cyan, true);
  
  try {
    console.log(`Sending GET request to ${API_URL}/files/${jobId}/${fileType}`);
    
    const response = await axios.get(`${API_URL}/files/${jobId}/${fileType}`, {
      responseType: 'arraybuffer'
    });
    
    // Create directory if it doesn't exist
    const downloadDir = path.join(__dirname, 'test-downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // Save file
    const extension = fileType === 'markdown' ? 'md' : fileType;
    const filePath = path.join(downloadDir, `${jobId}.${extension}`);
    fs.writeFileSync(filePath, response.data);
    
    printColored(`✅ Successfully downloaded ${fileType} file to: ${filePath}`, colors.green);
    return filePath;
  } catch (error) {
    printColored(`❌ Error downloading ${fileType} file:`, colors.red);
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Run end-to-end test
 */
async function runEndToEndTest() {
  printColored('🚀 STARTING END-TO-END TEST FOR ARABIC YOUTUBE TRANSCRIPTION', colors.magenta, true);
  printColored(`Testing with YouTube URL: ${SAMPLE_ARABIC_VIDEO_URL}`, colors.blue);
  
  try {
    // Step 1: Submit job
    const jobId = await submitJob(SAMPLE_ARABIC_VIDEO_URL);
    
    // Step 2: Poll job status until completed
    await pollJobStatus(jobId, 60, 5000);  // Max 5 minutes with 5-second intervals
    
    // Step 3: Get job results
    const results = await getJobResults(jobId);
    printColored('\n📝 JOB RESULTS SUMMARY:', colors.cyan, true);
    printColored(`Title: ${results.title || 'N/A'}`, colors.yellow);
    
    if (results.transcription) {
      printColored('\n📊 TRANSCRIPTION SAMPLE:', colors.cyan);
      const transcriptionSample = results.transcription.slice(0, 3);
      transcriptionSample.forEach(segment => {
        console.log(`[${segment.start} - ${segment.end}]: ${segment.text}`);
      });
      printColored(`... (${results.transcription.length} segments total)`, colors.yellow);
    }
    
    if (results.translation) {
      printColored('\n🌐 TRANSLATION SAMPLE:', colors.cyan);
      const translationSample = results.translation.slice(0, 3);
      translationSample.forEach(segment => {
        console.log(`[${segment.start} - ${segment.end}]: ${segment.text}`);
      });
      printColored(`... (${results.translation.length} segments total)`, colors.yellow);
    }
    
    // Step 4: Download result files
    await downloadResultFile(jobId, 'markdown');
    await downloadResultFile(jobId, 'pdf');
    
    printColored('\n✅ END-TO-END TEST COMPLETED SUCCESSFULLY!', colors.green, true);
    return true;
  } catch (error) {
    printColored('\n❌ END-TO-END TEST FAILED!', colors.red, true);
    console.error('Error details:', error);
    return false;
  }
}

// Run the test
runEndToEndTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
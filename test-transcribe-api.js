// Test script for transcribe API endpoint
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Create a simple test server
const app = express();
const PORT = 4567;

// Configure middleware with explicit options
app.use(cors());

// Middleware to log raw requests
app.use((req, res, next) => {
  let rawData = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => { 
    rawData += chunk; 
  });
  
  req.on('end', () => {
    console.log(`\n=== RAW REQUEST BODY ===\n${rawData}\n=== END RAW BODY ===`);
    // Store the raw data for inspection
    req.rawBody = rawData;
    next();
  });
});

// JSON parsing middleware
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    // This callback runs when the JSON has been parsed successfully
    console.log(`JSON parsed successfully: ${JSON.stringify(req.body)}`);
  }
}));

// URL-encoded form data middleware
app.use(express.urlencoded({ extended: true }));

// Test routes
app.post('/api/transcribe', (req, res) => {
  console.log('\n=== TRANSCRIBE ENDPOINT HIT ===');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body content:', req.body);
  
  if (req.rawBody) {
    // Attempt to extract URL from rawBody if needed
    console.log('Raw body available for parsing if needed');
  }
  
  // Extract URL with various methods
  let youtubeUrl = null;
  
  // Try to get from req.body.url (standard JSON)
  if (req.body && typeof req.body === 'object' && req.body.url) {
    youtubeUrl = req.body.url;
    console.log('URL extracted from req.body.url:', youtubeUrl);
  }
  // Try to get from string body
  else if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      youtubeUrl = parsed.url;
      console.log('URL extracted from parsed string body:', youtubeUrl);
    } catch (e) {
      console.log('Could not parse string body as JSON');
    }
  }
  // Check direct body
  else if (typeof req.body === 'string' && 
           (req.body.includes('youtube.com') || req.body.includes('youtu.be'))) {
    youtubeUrl = req.body;
    console.log('Using body directly as URL:', youtubeUrl);
  }
  
  if (!youtubeUrl && req.rawBody) {
    // Last resort: try to match a YouTube URL pattern in the raw body
    const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/g;
    const matches = req.rawBody.match(urlRegex);
    if (matches && matches.length > 0) {
      youtubeUrl = matches[0];
      console.log('Extracted URL from raw body with regex:', youtubeUrl);
    }
  }
  
  if (!youtubeUrl) {
    console.log('URL not found in request');
    return res.status(400).json({ 
      error: 'YouTube URL is required',
      receivedBody: req.body,
      rawBodyExcerpt: req.rawBody ? req.rawBody.substring(0, 100) + '...' : 'N/A'
    });
  }
  
  // Simulate success response
  console.log('SUCCESS: URL found:', youtubeUrl);
  return res.status(200).json({
    jobId: 'test-job-' + Date.now(),
    status: 'INITIATED',
    message: 'Job initiated successfully',
    url: youtubeUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Send test requests to http://localhost:${PORT}/api/transcribe');
});

// Also provide a curl command to test
console.log('\nTest with curl:');
console.log(`curl -X POST http://localhost:${PORT}/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=abcdefghijk"}'`);

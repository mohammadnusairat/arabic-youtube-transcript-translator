// Debug script for transcribe API endpoint
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create a simple test server
const app = express();
const PORT = 4001; // Use a different port for testing

// Configure middleware with explicit options
app.use(cors());

// Add raw body parser to inspect raw request bodies
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    console.log('\n--- RAW REQUEST BODY ---');
    console.log(data);
    console.log('--- END RAW REQUEST BODY ---\n');
    next();
  });
});

// Add JSON and URL-encoded parsers with debug logging
app.use(express.json({ 
  limit: '10mb', 
  strict: false,
  verify: (req, res, buf) => {
    console.log('JSON parser processed body:', buf.toString());
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  verify: (req, res, buf) => {
    console.log('URL-encoded parser processed body:', buf.toString());
  }
}));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`\n=== REQUEST ${new Date().toISOString()} ===`);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body after parsing:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  next();
});

// Test route for /transcribe endpoint
app.post('/api/transcribe', (req, res) => {
  console.log('\n--- /api/transcribe endpoint hit ---');
  console.log('Request body after parsing:', req.body);
  console.log('URL extraction:', req.body.url);
  
  if (!req.body || !req.body.url) {
    console.error('Missing URL in request body');
    return res.status(400).json({ 
      error: 'YouTube URL is required',
      receivedBody: req.body,
      receivedContentType: req.headers['content-type']
    });
  }
  
  // Simulate successful response
  const jobId = 'test-' + Date.now().toString();
  return res.status(201).json({
    jobId,
    status: 'INITIATED',
    message: 'Transcription job initiated successfully'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Debug server running at http://localhost:${PORT}`);
  console.log('Send test requests to http://localhost:${PORT}/api/transcribe');
  console.log('Example curl request:');
  console.log(`curl -X POST http://localhost:${PORT}/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=YOUR_VIDEO_ID"}'`);
});

// routes/api.js
const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const youtubeService = require('../services/youtubeService');
const youtubeUrlExtractor = require('../middleware/youtubeUrlExtractor');

// API routes for transcript processing
router.post('/transcribe', youtubeUrlExtractor, (req, res, next) => {
  console.log('Transcribe route hit with body:', JSON.stringify(req.body));
  return transcriptController.startTranscriptionJob(req, res);
});
router.get('/status/:jobId', transcriptController.getJobStatus);
router.post('/cancel/:jobId', transcriptController.cancelJob);
router.get('/jobs/:jobId/results', transcriptController.getJobResults);
router.get('/files/:jobId/:fileType', transcriptController.getFile);
router.get('/jobs', transcriptController.listJobs);

// File upload route for direct audio transcription
router.post('/upload', uploadMiddleware.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Extract the file path
    const audioFilePath = req.file.path;
    
    // Start a transcription job for the uploaded file
    const jobId = await transcriptController.startUploadedFileJob(req, res, audioFilePath);
    
    return res.status(201).json({
      jobId,
      status: 'INITIATED',
      message: 'Transcription job initiated for uploaded file'
    });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    return res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Validate YouTube URL route
router.post('/validate-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if URL is a valid YouTube URL
    const isValid = youtubeService.isValidYouTubeUrl(url);
    if (!isValid) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid YouTube URL format' 
      });
    }

    // Check if video exists and is accessible
    const isAvailable = await youtubeService.checkVideoAvailability(url);
    if (!isAvailable) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Video not found or not accessible' 
      });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Error validating URL:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Failed to validate URL' 
    });
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
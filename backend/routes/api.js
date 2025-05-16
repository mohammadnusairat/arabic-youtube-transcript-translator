// routes/api.js
const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const youtubeService = require('../services/youtubeService');
const youtubeUrlExtractor = require('../middleware/youtubeUrlExtractor');
const { exec } = require('child_process');
const path = require('path');

// POST YouTube URL for transcription
router.post(
  '/transcribe',
  youtubeUrlExtractor,
  transcriptController.startTranscriptionJob
);

// File upload transcription
router.post('/upload', uploadMiddleware.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioFilePath = req.file.path;
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

// Job status
router.get('/status/:jobId', transcriptController.getJobStatus);
router.post('/cancel/:jobId', transcriptController.cancelJob);
router.get('/jobs/:jobId/results', transcriptController.getJobResults);
router.get('/files/:jobId/:fileType', transcriptController.getFile);
router.get('/jobs', transcriptController.listJobs);

// Validate a YouTube URL
router.post('/validate-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const isValid = youtubeService.isValidYouTubeUrl(url);
    if (!isValid) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid YouTube URL format'
      });
    }

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

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// GET /api/metadata?url=https://youtu.be/...
router.get('/metadata', async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid YouTube URL' });
  }

  const ytDlpPath = path.join(
    'C:/Users/mnusa/AppData/Roaming/Python/Python313/Scripts/yt-dlp.exe'
  );

  exec(`"${ytDlpPath}" --no-warnings --get-duration "${url}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('[yt-dlp error]', stderr || err.message);
      return res.status(500).json({ error: 'Failed to get video duration' });
    }

    const raw = stdout.trim(); // e.g., 14:32 or 1:10:20
    const parts = raw.split(':').map(Number);
    let durationSeconds = 0;

    if (parts.length === 3) {
      durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      durationSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      durationSeconds = parts[0];
    } else {
      return res.status(500).json({ error: 'Could not parse duration output' });
    }

    res.json({ durationSeconds });
  });
});

module.exports = router;
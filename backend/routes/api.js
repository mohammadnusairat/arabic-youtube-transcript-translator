// routes/api.js
const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const youtubeService = require('../services/youtubeService');
const youtubeUrlExtractor = require('../middleware/youtubeUrlExtractor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { exec } = require('child_process');

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
router.get('/status/:jobId', transcriptController.getJobResults);
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

// // GET /api/metadata?url=https://youtu.be/...
// router.get('/metadata', async (req, res) => {
//   const url = req.query.url;
//   if (!url || typeof url !== 'string') {
//     return res.status(400).json({ error: 'Missing or invalid YouTube URL' });
//   }

//   const isWindows = process.platform === 'win32';

//   const ytDlpPath = isWindows
//     ? (process.env.YT_DLP_BINARY_LOCAL || 'yt-dlp')
//     : (process.env.YT_DLP_BINARY || 'yt-dlp');

//   exec(`"${ytDlpPath}" --no-warnings --get-duration "${url}"`, (err, stdout, stderr) => {
//     if (err) {
//       console.error('[yt-dlp error]', err.message);
//       console.error('stderr:', stderr);
//       console.error('stdout:', stdout);
//       return res.status(500).json({ error: 'Failed to get video duration' });
//     }

//     const raw = stdout.trim(); // e.g., 14:32 or 1:10:20
//     const parts = raw.split(':').map(Number);
//     let durationSeconds = 0;

//     if (parts.length === 3) {
//       durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
//     } else if (parts.length === 2) {
//       durationSeconds = parts[0] * 60 + parts[1];
//     } else if (parts.length === 1) {
//       durationSeconds = parts[0];
//     } else {
//       return res.status(500).json({ error: 'Could not parse duration output' });
//     }

//     res.json({ durationSeconds });
//   });
// });

router.get('/metadata', (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid YouTube URL' });
  }

  const ytDlpPath = process.env.YT_DLP_BINARY || '/usr/local/bin/yt-dlp';

  const ytProcess = spawn(ytDlpPath, ['--no-warnings', '--get-duration', url], { shell: false });

  let output = '';
  let errorOutput = '';

  ytProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  ytProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  ytProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('[yt-dlp spawn error]', errorOutput.trim());
      return res.status(500).json({ error: 'Failed to get video duration' });
    }

    const raw = output.trim(); // e.g., "14:32" or "1:10:20"
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

  ytProcess.on('error', (err) => {
    console.error('[yt-dlp spawn error]', err.message);
    res.status(500).json({ error: 'Failed to get video duration' });
  });
});

// Route to check where yt-dlp and ffmpeg are located
router.get('/which', (req, res) => {
  exec('which yt-dlp && which ffmpeg', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Binary not found', details: stderr });
    }
    res.json({ paths: stdout.trim().split('\n') });
  });
});

// Route to test yt-dlp version (basic command to confirm it's runnable)
router.get('/yt-dlp-version', (req, res) => {
  const ytDlpPath = process.env.YT_DLP_BINARY || '/usr/local/bin/yt-dlp';
  const child = spawn(ytDlpPath, ['--version']);

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', (data) => output += data.toString());
  child.stderr.on('data', (data) => errorOutput += data.toString());

  child.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'yt-dlp version check failed', details: errorOutput.trim() });
    }
    res.json({ version: output.trim() });
  });

  child.on('error', (err) => {
    res.status(500).json({ error: 'yt-dlp spawn error', details: err.message });
  });
});

// Get metadata for a completed job
router.get('/metadata/:jobId', async (req, res) => {
  const { jobId } = req.params;

  const tempDir = path.join(__dirname, '../temp/jobs'); // or wherever you're storing job metadata
  const metaPath = path.join(tempDir, `${jobId}.json`);

  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Job metadata file not found' });
  }

  try {
    const jobMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
    const videoUrl = jobMeta.url;

    if (!videoUrl) return res.status(400).json({ error: 'No video URL in job metadata' });

    const videoMetadata = await youtubeService.getFullMetadata(videoUrl);
    res.json({ videoMetadata });
  } catch (err) {
    console.error('[Metadata Fetch Error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve metadata' });
  }
});

module.exports = router;
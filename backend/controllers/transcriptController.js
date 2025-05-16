// controllers/transcriptController.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const youtubeService = require('../services/youtubeService');
const transcriptionService = require('../services/transcriptionService');
const translationService = require('../services/translationService');
const documentService = require('../services/documentService');
const config = require('../config/config');

// Store job status in memory (in production, use a database)
const jobsStatus = {};

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, '_').substring(0, 100).trim();
}

/**
 * Start a new transcription job
 */
exports.startTranscriptionJob = async (req, res) => {
  try {
    console.log('==== NEW TRANSCRIPTION JOB REQUEST ====');
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Request Body Type:', typeof req.body);
    console.log('Request Body:', req.body);

    let youtubeUrl = req.youtubeUrl || req.extractedYouTubeUrl;

    if (!youtubeUrl && req.body?.url) {
      youtubeUrl = req.body.url;
      console.log('Fallback to req.body.url:', youtubeUrl);
    }

    if (!youtubeUrl || youtubeUrl.trim() === '') {
      const errorMsg = 'YouTube URL is required';
      console.error(errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    if (!youtubeService.isValidYouTubeUrl(youtubeUrl)) {
      const errorMsg = 'Invalid YouTube URL format';
      console.error(errorMsg, youtubeUrl);
      return res.status(400).json({ error: errorMsg });
    }

    const startTime = req.body?.startTime;
    const endTime = req.body?.endTime;

    if ((startTime != null && isNaN(startTime)) || (endTime != null && isNaN(endTime))) {
      return res.status(400).json({ error: 'startTime and endTime must be numbers in seconds' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime must be less than endTime' });
    }

    const jobId = uuidv4();
    jobsStatus[jobId] = {
      status: 'INITIATED',
      progress: 0,
      youtubeUrl,
      videoId: null,
      title: null,
      audioFile: null,
      transcription: null,
      translation: null,
      pdfUrl: null,
      markdownUrl: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    processTranscriptionJob(jobId, youtubeUrl, { startTime, endTime });

    return res.status(201).json({
      jobId,
      status: 'INITIATED',
      message: 'Transcription job initiated successfully'
    });
  } catch (error) {
    console.error('Error starting transcription job:', error);
    return res.status(500).json({ error: 'Failed to start transcription job' });
  }
};

/**
 * Start transcription job for an uploaded audio file
 */
exports.startUploadedFileJob = async (req, res, audioFilePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Uploaded file not found');
    }

    // Get file information
    const fileInfo = path.parse(audioFilePath);
    const fileName = fileInfo.name;
    const title = `Uploaded Audio: ${fileName}`;
    const sanitizedTitle = sanitizeFilename(title);
    
    // Create a new job ID
    const jobId = uuidv4();
    
    // Initialize job status
    jobsStatus[jobId] = {
      status: 'INITIATED',
      progress: 0,
      type: 'UPLOAD',
      sanitizedTitle,
      audioFile: audioFilePath,
      transcription: null,
      translation: null,
      pdfUrl: null,
      markdownUrl: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Process in the background
    processUploadedFileJob(jobId, audioFilePath, sanitizedTitle);
    
    return jobId;
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    throw new Error(`Failed to process uploaded file: ${error.message}`);
  }
};

/**
 * Get job status
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId || !jobsStatus[jobId]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(jobsStatus[jobId]);
  } catch (error) {
    console.error('Error retrieving job status:', error);
    return res.status(500).json({ error: 'Failed to retrieve job status' });
  }
};

/**
 * Get job results
 */
exports.getJobResults = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId || !jobsStatus[jobId]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobsStatus[jobId];

    // Shape the fileUrls object for frontend
    const fileUrls = {
      pdf: job.pdfUrl ? `/api/files/${jobId}/pdf` : null,
      markdown: job.markdownUrl ? `/api/files/${jobId}/markdown` : null
    };
    
    if (job.status !== 'COMPLETED') {
      return res.status(200).json({
        status: job.status,
        progress: job.progress,
        message: 'Job is still processing'
      });
    }

    return res.status(200).json({
      ...job,
      fileUrls
    });
  } catch (error) {
    console.error('Error retrieving job results:', error);
    return res.status(500).json({ error: 'Failed to retrieve job results' });
  }
};

/**
 * Process the transcription job in the background
 */
async function processTranscriptionJob(jobId, youtubeUrl, options = {}) {
  try {
    const videoId = youtubeService.extractVideoId(youtubeUrl);
    const timestamp = Date.now();
    const outputFolder = config.tempDir;
    await fs.ensureDir(outputFolder);

    updateJobStatus(jobId, 'DOWNLOADING', 10, 'Downloading YouTube video audio');

    const filePath = await youtubeService.extractAudio(youtubeUrl, jobId, options);

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Audio file missing after download.');
    }

    const { title } = await youtubeService.getVideoDetails(youtubeUrl);
    const sanitizedTitle = sanitizeFilename(title); // ✅ use cleaner filename

    updateJobStatus(jobId, 'TRANSCRIBING', 30, 'Transcribing audio', {
      videoId,
      title,
      audioFile: filePath
    });

    const transcription = await transcriptionService.transcribeAudio(filePath);

    updateJobStatus(jobId, 'TRANSLATING', 60, 'Translating transcription to English', {
      transcription
    });

    let translation;
    try {
      translation = await translationService.translateText(transcription);
    } catch (err) {
      console.error(`[JOB FAILED: ${jobId}] Translation error:`, err);
      updateJobStatus(jobId, 'FAILED', 0, 'Translation failed', { error: err.message });
      return;
    }

    updateJobStatus(jobId, 'GENERATING_DOCUMENTS', 80, 'Generating output documents', {
      translation
    });

    const pdfPath = path.join(config.outputDir, 'pdf', `${sanitizedTitle}_${timestamp}.pdf`);
    const markdownPath = path.join(config.outputDir, 'markdown', `${sanitizedTitle}_${timestamp}.md`);

    await Promise.all([
      documentService.generatePDF(translation, sanitizedTitle, pdfPath, options.startTime || 0),
      documentService.generateMarkdown(translation, sanitizedTitle, markdownPath, options.startTime || 0)
    ]);

    updateJobStatus(jobId, 'COMPLETED', 100, 'Transcription job completed successfully', {
      transcription,
      translation,
      pdfUrl: pdfPath,
      markdownUrl: markdownPath
    });

    await fs.remove(filePath);
  } catch (error) {
    console.error(`[JOB FAILED: ${jobId}]`, error);
    updateJobStatus(jobId, 'FAILED', 0, `Error: ${error.message}`, { error: error.message });
  }
}

/**
 * Process an uploaded audio file
 */
async function processUploadedFileJob(jobId, audioFilePath, sanitizedTitle) {
  try {
    // Step 1: Transcribe audio from Arabic
    updateJobStatus(jobId, 'TRANSCRIBING', 30, 'Transcribing uploaded audio');
    const transcription = await transcriptionService.transcribeAudio(audioFilePath);
    
    // Step 2: Translate from Arabic to English
    updateJobStatus(jobId, 'TRANSLATING', 60, 'Translating transcription to English', {
      transcription
    });
    const translation = await translationService.translateText(transcription);
    
    // Step 3: Generate PDF and Markdown files
    updateJobStatus(jobId, 'GENERATING_DOCUMENTS', 80, 'Generating output documents', {
      translation
    });
    
    const outputBaseName = `upload_${path.basename(audioFilePath, path.extname(audioFilePath))}_${Date.now()}`;
    const pdfPath = path.join(config.outputDir, 'pdf', `${outputBaseName}.pdf`);
    const markdownPath = path.join(config.outputDir, 'markdown', `${outputBaseName}.md`);
    
    await Promise.all([
      documentService.generatePDF(translation, sanitizedTitle, pdfPath, 0),
      documentService.generateMarkdown(translation, sanitizedTitle, markdownPath, 0)
    ]);
    
    // Update job with completed status and file paths
    updateJobStatus(jobId, 'COMPLETED', 100, 'Transcription job completed successfully', {
      transcription,
      translation,
      pdfUrl: pdfPath,
      markdownUrl: markdownPath
    });
    
    // Don't delete the uploaded file immediately to allow for potential re-processing
    // Instead, schedule cleanup after a certain period (e.g., 1 hour)
    setTimeout(async () => {
      try {
        await fs.remove(audioFilePath);
        console.log(`Cleaned up uploaded file: ${audioFilePath}`);
      } catch (cleanupError) {
        console.error(`Failed to clean up file ${audioFilePath}:`, cleanupError);
      }
    }, 60 * 60 * 1000); // 1 hour
    
  } catch (error) {
    console.error(`Error processing uploaded file job ${jobId}:`, error);
    updateJobStatus(jobId, 'FAILED', 0, `Error: ${error.message}`, { 
      error: error.message 
    });
  }
}

/**
 * Update job status
 */
function updateJobStatus(jobId, status, progressValue, message = null, data = {}) {
  if (!jobsStatus[jobId]) return;

  // Mapping backend stages to frontend keys
  const stageToKey = {
    'INITIATED': 'validating',
    'DOWNLOADING': 'extracting',
    'TRANSCRIBING': 'transcribing',
    'TRANSLATING': 'translating',
    'GENERATING_DOCUMENTS': 'generating'
  };

  const progressKey = stageToKey[status];
  const existingProgress = jobsStatus[jobId].progress || {
    validating: 0,
    extracting: 0,
    transcribing: 0,
    translating: 0,
    generating: 0,
  };

  const updatedProgress = { ...existingProgress };
  if (progressKey) {
    updatedProgress[progressKey] = progressValue;
  }

  jobsStatus[jobId] = {
    ...jobsStatus[jobId],
    ...data,
    status,
    message,
    progress: updatedProgress,
    updatedAt: new Date()
  };

  console.log(`Job ${jobId} status updated to ${status} (${progressValue}%): ${message}`);
}

/**
 * List recent jobs (limited to 10)
 */
exports.listJobs = async (req, res) => {
  try {
    const recentJobs = Object.entries(jobsStatus)
      .map(([jobId, job]) => ({
        jobId,
        status: job.status,
        title: job.title,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);

    return res.status(200).json(recentJobs);
  } catch (error) {
    console.error('Error listing jobs:', error);
    return res.status(500).json({ error: 'Failed to list jobs' });
  }
};

/**
 * Cancel a job in progress
 */
exports.cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId || !jobsStatus[jobId]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only allow cancellation if job is not completed
    const job = jobsStatus[jobId];
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return res.status(400).json({ 
        error: 'Cannot cancel a job that is already completed or failed',
        status: job.status
      });
    }

    // Update job status to cancelled
    updateJobStatus(jobId, 'CANCELLED', job.progress, 'Job cancelled by user');

    // Clean up any files associated with the job
    if (job.audioFile && fs.existsSync(job.audioFile)) {
      await fs.remove(job.audioFile);
    }

    return res.status(200).json({
      jobId,
      status: 'CANCELLED',
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return res.status(500).json({ error: 'Failed to cancel job' });
  }
};

/**
 * Get file (PDF or Markdown)
 */
exports.getFile = async (req, res) => {
  try {
    const { jobId, fileType } = req.params;
    const { preview } = req.query;
    
    if (!jobId || !jobsStatus[jobId]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobsStatus[jobId];
    
    // Check if job is completed
    if (job.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Files are only available for completed jobs',
        status: job.status 
      });
    }

    // Determine file path based on type
    let filePath;
    if (fileType.toLowerCase() === 'pdf') {
      filePath = job.pdfUrl;
    } else if (fileType.toLowerCase() === 'markdown' || fileType.toLowerCase() === 'md') {
      filePath = job.markdownUrl;
    } else {
      return res.status(400).json({ error: 'Invalid file type. Must be pdf or markdown' });
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: `${fileType} file not found` });
    }

    // If preview is requested, return a sample of the content
    if (preview) {
      let content;
      if (fileType.toLowerCase() === 'pdf') {
        // For PDF preview, return metadata or first page info
        // In a real implementation, you'd use a PDF library to extract text
        content = { message: 'PDF preview not implemented, please download the full file' };
      } else {
        // For markdown, read the first 2000 characters
        content = await fs.readFile(filePath, 'utf8');
        content = content.substring(0, 2000) + (content.length > 2000 ? '...' : '');
      }
      return res.status(200).json({ preview: content });
    }

    // Stream the file for download
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
    if (fileType.toLowerCase() === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else {
      res.setHeader('Content-Type', 'text/markdown');
    }
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving file:', error);
    return res.status(500).json({ error: 'Failed to retrieve file' });
  }
};
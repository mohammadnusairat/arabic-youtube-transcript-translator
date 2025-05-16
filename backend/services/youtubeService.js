// services/youtubeService.js

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

/**
 * Validate if URL is a YouTube link
 */
exports.isValidYouTubeUrl = (url) => {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
};

/**
 * Extract YouTube video ID
 */
exports.extractVideoId = (url) => {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/);
  return match ? match[1] : uuidv4();
};

/**
 * Sanitize YouTube URL by removing 't' (start time) parameter and others that break shell commands
 * @param {string} url 
 * @returns {string} sanitized url
 */
function sanitizeYouTubeUrl(url) {
  // Remove 't' parameter (?t= or &t= with optional seconds suffix)
  return url.replace(/([&?])t=\d+s?/, '');
}

/**
 * Extract audio from YouTube URL using yt-dlp, then trim with ffmpeg
 */
exports.extractAudio = async (url, jobId, options = {}) => {
  const { startTime, endTime } = options;
  const outputDir = path.join(__dirname, '../temp/yt-dlp');
  await fs.ensureDir(outputDir);

  const rawOutputPath = path.join(outputDir, `${jobId}.mp3`);
  const trimmedOutputPath = path.join(outputDir, `${jobId}_trimmed.mp3`);

  // Sanitize URL to remove &t=... that breaks Windows shell
  const cleanUrl = sanitizeYouTubeUrl(url);

  const ytArgs = [
    cleanUrl,
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-check-certificates',
    '--no-warnings',
    '--add-metadata',
    '--output', rawOutputPath
  ];

  const ytCommand = "C:\\Users\\mnusa\\AppData\\Roaming\\Python\\Python313\\Scripts\\yt-dlp.exe";

  console.log('[YT-DLP COMMAND]', ytCommand, ytArgs.join(' '));

  // Step 1: Download full audio
  await new Promise((resolve, reject) => {
    const ytProcess = spawn(ytCommand, ytArgs, { shell: true });

    ytProcess.stderr.on('data', (data) => console.error('[YT-DLP STDERR]', data.toString()));
    ytProcess.on('error', (err) => reject(new Error(`yt-dlp failed: ${err.message}`)));
    ytProcess.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp exited with code ${code}`));
      resolve();
    });
  });

  // Step 2: Trim audio with ffmpeg (only if time range is given)
  if (startTime != null && endTime != null) {
    const ffmpegArgs = [
      '-y',
      '-i', rawOutputPath,
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      '-c', 'copy',
      trimmedOutputPath
    ];

    console.log('[FFMPEG COMMAND] ffmpeg', ffmpegArgs.join(' '));

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      ffmpeg.stderr.on('data', (data) => console.error('[FFMPEG STDERR]', data.toString()));
      ffmpeg.on('error', (err) => reject(new Error(`ffmpeg failed: ${err.message}`)));
      ffmpeg.on('exit', (code) => {
        if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
        resolve();
      });
    });

    await fs.remove(rawOutputPath); // Remove original
    await fs.move(trimmedOutputPath, rawOutputPath); // Replace with trimmed version
  }

  return rawOutputPath;
};

/**
 * Get basic video details
 */
exports.getVideoDetails = async (youtubeUrl) => {
  const iso = new Date().toISOString().replace(/[:]/g, '-'); // <-- sanitize colons
  return {
    title: `YouTube Video - ${iso}`,
    channel: 'Unknown Channel',
    duration: 0
  };
};

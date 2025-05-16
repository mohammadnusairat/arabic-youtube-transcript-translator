// services/youtubeService.js
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ytDlpExec = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const { FFMPEG_PATH } = require('../config/config');

// Explicit path to yt-dlp binary
//const ytDlpPath = process.env.YT_DLP_BINARY || path.join(__dirname, '..', 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp.exe');

// Create yt-dlp instance with custom binary path
//const ytdlp = ytDlpExec.create({ binary: ytDlpPath }).exec;

// Set path to ffmpeg binary
ffmpeg.setFfmpegPath(FFMPEG_PATH);

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
  url = url.split('?')[0].trim();

  const standardMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\s]+)/);
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);

  if (standardMatch) return standardMatch[1];
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * Validate YouTube URL
 */
exports.isValidYouTubeUrl = (url) => {
  if (!url) return false;
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return regex.test(url) && !!extractVideoId(url);
};

/**
 * Download and extract audio using yt-dlp
 */
exports.extractAudio = async (videoUrl, outputDir) => {
  try {
    console.log(`[YT-DLP] Fetching audio from: ${videoUrl}`);

    await fs.ensureDir(outputDir);

    const audioBase = uuidv4();
    const outputTemplate = path.join(outputDir, `${audioBase}.%(ext)s`).replace(/\\/g, '/'); // ✅ convert Windows-style slashes to forward slashes

    const finalWav = path.join(outputDir, `${audioBase}.wav`);
    await fs.ensureDir(path.dirname(outputTemplate)); // ✅ ensure the parent dir exists

    // ✅ Step 1: Download MP3 using yt-dlp with correct output template
    await ytDlpExec(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputTemplate, // ✅ Correct template
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addMetadata: true,
    });

    // ✅ Step 2: Convert to mono 16kHz WAV using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(path.join(outputDir, `${audioBase}.mp3`)) // 👈 THIS LINE GOES HERE
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(finalWav);
    });

    console.log(`[FFMPEG] Audio converted to WAV: ${finalWav}`);
    return { filePath: finalWav };
  } catch (err) {
    console.error('[YT-DLP/FFMPEG ERROR]', err);
    throw new Error('An error occurred while downloading or converting audio. Please try a different video.');
  }
};

/**
 * Get basic video metadata using yt-dlp
 */
exports.getVideoDetails = async (videoUrl) => {
  try {
    const info = await ytDlpExec(videoUrl, {
      dumpJson: true,
      noWarnings: true,
    });

    return {
      title: info.title,
      channel: info.channel || info.uploader,
      duration: parseInt(info.duration, 10) || 0,
    };
  } catch (error) {
    console.error('[YT-DLP META ERROR]', error.message);
    return {
      title: 'Unknown Title',
      channel: 'Unknown Channel',
      duration: 0,
    };
  }
};

/**
 * Check if the video is accessible
 */
exports.checkVideoAvailability = async (url) => {
  try {
    await ytDlpExec(url, {
      skipDownload: true,
      quiet: true,
      simulate: true,
    });
    return true;
  } catch (err) {
    console.error('[YT-DLP AVAILABILITY ERROR]', err.message);
    return false;
  }
};

exports.extractVideoId = extractVideoId;
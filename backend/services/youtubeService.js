// services/youtubeService.js
const ytdlp = require('yt-dlp-exec');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Dynamic ffmpeg path support (for AWS or custom environments)
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

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
exports.extractAudio = async (videoUrl, outputPath) => {
  try {
    console.log(`[YT-DLP] Fetching audio from: ${videoUrl}`);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.ensureDir(outputDir);

    // Use a temporary file name to avoid collisions
    const tempOutput = path.join(outputDir, `${uuidv4()}.%(ext)s`);

    await ytdlp(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: tempOutput,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addMetadata: true,
      //ffmpegLocation: config.ffmpegPath || './bin/ffmpeg',
    });

    // Find the resulting file
    const downloadedFiles = await fs.readdir(outputDir);
    const mp3File = downloadedFiles.find((file) => file.endsWith('.mp3'));
    if (!mp3File) throw new Error('MP3 audio not found after yt-dlp extraction');

    const finalPath = path.join(outputDir, 'audio.mp3');
    await fs.rename(path.join(outputDir, mp3File), finalPath);

    console.log(`[YT-DLP] Audio downloaded to: ${finalPath}`);
    return { filePath: finalPath };
  } catch (err) {
    if (err.message.includes('Unable to extract') || err.message.includes('signature')) {
      console.error('[YT-DLP ERROR] Signature decryption failed. YouTube may have updated.');
      throw new Error('Failed to download audio. The video may be protected or YouTube has changed.');
    }

    console.error('[YT-DLP ERROR]', err);
    throw new Error('An error occurred while downloading audio. Please try a different video.');
  }
};

/**
 * Get basic video metadata using yt-dlp
 */
exports.getVideoDetails = async (videoUrl) => {
  try {
    const info = await ytdlp(videoUrl, {
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
    await ytdlp(url, {
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
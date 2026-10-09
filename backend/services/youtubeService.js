// services/youtubeService.js

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

const isWindows = process.platform === 'win32';

// Prefer local explicit path on Windows, else fallback to env or default
const ytDlpPath = isWindows
  ? (process.env.YT_DLP_BINARY_LOCAL || 'yt-dlp')
  : (process.env.YT_DLP_BINARY || 'yt-dlp');

/**
 * Optional yt-dlp network settings, both off unless the env var is set:
 * - YTDLP_PROXY: proxy URL, e.g. http://user:pass@host:port (residential proxies avoid YouTube's datacenter-IP blocking)
 * - YTDLP_COOKIES: contents of a Netscape-format cookies.txt, raw or base64-encoded
 */
let cookiesFilePath = null;

function getCookiesFile() {
  const raw = process.env.YTDLP_COOKIES;
  if (!raw) return null;
  if (cookiesFilePath) return cookiesFilePath;

  // Raw cookies.txt contents are tab-separated; anything else is treated as base64
  const content = raw.includes('\t') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  cookiesFilePath = path.join(os.tmpdir(), 'yt-dlp-cookies.txt');
  fs.writeFileSync(cookiesFilePath, content, { mode: 0o600 });
  return cookiesFilePath;
}

exports.getYtDlpNetworkArgs = () => {
  const args = [];
  if (process.env.YTDLP_PROXY) {
    args.push('--proxy', process.env.YTDLP_PROXY);
  }
  const cookiesFile = getCookiesFile();
  if (cookiesFile) {
    args.push('--cookies', cookiesFile);
  }
  return args;
};

/**
 * Format yt-dlp args for logging without leaking proxy credentials
 */
exports.formatArgsForLog = (args) => {
  return args
    .map((arg, i) => (args[i - 1] === '--proxy' ? '<proxy>' : arg))
    .join(' ');
};

/**
 * Map yt-dlp stderr to a known error code, or null if unrecognized
 */
exports.classifyYtDlpError = (stderr = '') => {
  const text = stderr.toLowerCase();
  if (text.includes('not a bot')) return 'youtube_blocked';
  if (text.includes('confirm your age') || text.includes('age-restricted')) return 'video_restricted';
  if (text.includes('private video') || text.includes('video unavailable')) return 'video_unavailable';
  if (text.includes('http error 403') || text.includes('http error 429')) return 'youtube_blocked';
  return null;
};

exports.YT_DLP_ERROR_MESSAGES = {
  youtube_blocked: 'YouTube is currently blocking downloads from our server. Please upload the audio or video file instead.',
  video_restricted: 'This video is age-restricted or requires sign-in, so it cannot be downloaded. Please upload the audio or video file instead.',
  video_unavailable: 'This video is private or unavailable.'
};

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
 * Extract audio from YouTube URL using yt-dlp. When a time range is given, only that
 * section is downloaded instead of the full audio track.
 */
exports.extractAudio = async (url, jobId, options = {}) => {
  const { startTime, endTime } = options;
  const outputDir = path.join(__dirname, '../temp/yt-dlp');
  await fs.ensureDir(outputDir);

  const outputPath = path.join(outputDir, `${jobId}.mp3`);

  // Sanitize URL to remove &t=... so it doesn't conflict with the requested time range
  const cleanUrl = sanitizeYouTubeUrl(url);

  const ytArgs = [
    cleanUrl,
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-check-certificates',
    '--no-warnings',
    '--add-metadata',
    ...exports.getYtDlpNetworkArgs(),
    '--output', outputPath
  ];

  if (startTime != null && endTime != null) {
    // Re-encode at the cut points so the clip starts/ends exactly at the requested times
    // (stream copy can only cut on packet boundaries, which can be several seconds off)
    ytArgs.push('--download-sections', `*${startTime}-${endTime}`, '--force-keyframes-at-cuts');
  }

  console.log('[YT-DLP COMMAND]', ytDlpPath, exports.formatArgsForLog(ytArgs));

  await new Promise((resolve, reject) => {
    const ytProcess = spawn(ytDlpPath, ytArgs);
    let stderr = '';

    ytProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[YT-DLP STDERR]', data.toString());
    });
    ytProcess.on('error', (err) => reject(new Error(`yt-dlp failed: ${err.message}`)));
    ytProcess.on('exit', (code) => {
      if (code === 0) return resolve();

      const errorCode = exports.classifyYtDlpError(stderr);
      const error = new Error(exports.YT_DLP_ERROR_MESSAGES[errorCode] || `yt-dlp exited with code ${code}`);
      error.code = errorCode;
      reject(error);
    });
  });

  return outputPath;
};

/**
 * Remove all temp audio files created for a job (e.g. <jobId>.mp3, partial <jobId>.webm)
 */
exports.cleanupJobFiles = async (jobId) => {
  const outputDir = path.join(__dirname, '../temp/yt-dlp');
  try {
    const files = await fs.readdir(outputDir);
    await Promise.all(
      files
        .filter((file) => file.startsWith(jobId))
        .map((file) => fs.remove(path.join(outputDir, file)))
    );
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[CLEANUP] Failed to remove temp files for job ${jobId}:`, err.message);
    }
  }
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

/**
 * Get full video metadata (title, duration, uploader, thumbnail) using yt-dlp
 */
exports.getFullMetadata = (url) => {
  return new Promise((resolve, reject) => {
    const sanitizeUrl = sanitizeYouTubeUrl(url);
    const ytCommand = ytDlpPath;

    const runCommand = (arg) => new Promise((resolveOne, rejectOne) => {
      const proc = spawn(ytCommand, [arg, ...exports.getYtDlpNetworkArgs(), sanitizeUrl]);

      let out = '';
      proc.stdout.on('data', (data) => out += data.toString());
      proc.stderr.on('data', (data) => console.error(`[yt-dlp][${arg}]`, data.toString()));

      proc.on('error', rejectOne);
      proc.on('close', (code) => {
        if (code !== 0) return rejectOne(new Error(`yt-dlp exited with code ${code} for ${arg}`));
        resolveOne(out.trim());
      });
    });

    Promise.all([
      runCommand('--get-title'),
      runCommand('--get-duration'),
      runCommand('--get-uploader'),
      runCommand('--get-thumbnail')
    ])
    .then(([title, duration, channelTitle, thumbnail]) => {
      resolve({ title, duration, channelTitle, thumbnail });
    })
    .catch(reject);
  });
};

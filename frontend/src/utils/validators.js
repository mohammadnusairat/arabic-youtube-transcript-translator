// src/utils/validators.js

/**
 * Validates if the provided string is a valid YouTube URL
 */
export const validateYoutubeUrl = (url) => {
  if (!url) return false;
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
  return youtubeRegex.test(url);
};

/**
 * Extracts video ID from various YouTube URL formats
 */
export const extractYoutubeVideoId = (url) => {
  if (!url) return null;
  url = url.split('?')[0].trim(); // ✅ Strip any query parameters

  let match;

  match = url.match(/youtu\.be\/([^?]+)/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/v\/([^?]+)/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (match) return match[1];

  return null;
};

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Convert timestamp (MM:SS or HH:MM:SS) to total seconds
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return 0;
  const parts = timestamp.split(':').map((x) => parseInt(x, 10));
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts.length === 2
    ? parts[0] * 60 + parts[1]
    : 0;
};

/**
 * Check if timestamp is valid format
 */
export const validateTimestamp = (timestamp) => {
  return /^\[\d{2}:\d{2}(:\d{2})?\]$/.test(timestamp);
};

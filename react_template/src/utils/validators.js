// src/utils/validators.js

/**
 * Validates if the provided string is a valid YouTube URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateYoutubeUrl = (url) => {
  if (!url) return false;
  
  // Regular expression to match various YouTube URL formats
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
  
  // Basic validation using regex
  return youtubeRegex.test(url);
};

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID if found, null otherwise
 */
export const extractYoutubeVideoId = (url) => {
  if (!url) return null;
  
  // Handle youtu.be format
  let match = url.match(/youtu\.be\/([^?]+)/);
  if (match) return match[1];
  
  // Handle youtube.com format
  match = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (match) return match[1];
  
  // Handle youtube.com/v/ format
  match = url.match(/youtube\.com\/v\/([^?]+)/);
  if (match) return match[1];
  
  // Handle youtube.com/embed/ format
  match = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (match) return match[1];
  
  return null;
};

/**
 * Format time in seconds to a human-readable format (MM:SS or HH:MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 * @param {string} timestamp - Timestamp string
 * @returns {number} - Time in seconds
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return 0;
  
  const parts = timestamp.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
};

/**
 * Check if the timestamp is in the correct format
 * @param {string} timestamp - Timestamp to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateTimestamp = (timestamp) => {
  if (!timestamp) return false;
  
  // Match [HH:MM:SS] or [MM:SS] format
  const timestampRegex = /^\[\d{2}:\d{2}(:\d{2})?\]$/;
  return timestampRegex.test(timestamp);
};
// services/youtubeService.js
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const axios = require('axios');
const config = require('../config/config');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string} - Video ID
 */
function extractVideoId(url) {
  console.log('Attempting to extract video ID from URL:', url);
  let videoId = null;
  // Check for standard YouTube URL
  const standardMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.+\/|youtube\.com\/user\/.+\?v=|youtube\.com\/.+\/|youtube\.com\/.+\?v=)([^&]+)/);
  
  if (standardMatch) {
    videoId = standardMatch[1];
    console.log('Standard YouTube URL detected, extracted ID:', videoId);
  } else {
    // Try to handle YouTube short URLs
    const shortMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
      console.log('YouTube Shorts URL detected, extracted ID:', videoId);
    } else {
      console.log('Could not extract video ID from URL:', url);
    }
  }

  return videoId;
}

/**
 * Get video details from YouTube
 * @param {string} videoId - YouTube video ID
 * @returns {Object} - Video details
 */
async function getVideoDetails(videoId) {
  try {
    // Try using ytdl-core's getInfo method
    const info = await ytdl.getInfo(videoId);
    return {
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds)
    };
  } catch (error) {
    console.error('Error getting video details:', error);
    
    // Fallback: If API key is available, try YouTube Data API
    if (config.youtubeApiKey) {
      try {
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${config.youtubeApiKey}&part=snippet,contentDetails`
        );
        
        const videoData = response.data.items[0];
        if (!videoData) {
          throw new Error('Video not found');
        }
        
        return {
          title: videoData.snippet.title,
          channel: videoData.snippet.channelTitle,
          duration: 0 // Duration format is ISO 8601, would need further parsing
        };
      } catch (apiError) {
        console.error('YouTube API error:', apiError);
        throw new Error('Failed to get video details from YouTube API');
      }
    } else {
      // Last resort: Return a generic title with video ID
      return {
        title: `YouTube Video ${videoId}`,
        channel: 'Unknown',
        duration: 0
      };
    }
  }
}

/**
 * Download and extract audio from YouTube video
 * @param {string} youtubeUrl - YouTube video URL
 * @returns {Object} - Object with video details and audio file path
 */
exports.extractAudio = async (youtubeUrl) => {
  try {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Get video details
    const videoDetails = await getVideoDetails(videoId);
    const sanitizedTitle = videoDetails.title
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    // Define file paths
    const audioFileName = `${videoId}_${Date.now()}.mp3`;
    const audioFilePath = path.join(config.uploadDir, 'audio', audioFileName);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(audioFilePath));

    // Download audio with highest quality
    return new Promise((resolve, reject) => {
      ytdl(youtubeUrl, { 
        quality: 'highestaudio',
        filter: 'audioonly' 
      })
      .pipe(fs.createWriteStream(audioFilePath))
      .on('finish', () => {
        console.log(`Audio extracted successfully: ${audioFilePath}`);
        resolve({
          videoId,
          title: videoDetails.title,
          channel: videoDetails.channel,
          duration: videoDetails.duration,
          audioFile: audioFilePath
        });
      })
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject(err);
      });
    });

  } catch (error) {
    console.error('Error in extractAudio:', error);
    throw error;
  }
};

/**
 * Validate a YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
exports.isValidYouTubeUrl = (url) => {
  if (!url) return false;
  
  // YouTube URL patterns
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  
  if (!youtubeRegex.test(url)) {
    return false;
  }
  
  const videoId = extractVideoId(url);
  return !!videoId;
};

/**
 * Check if video exists and is accessible
 * @param {string} url - YouTube URL
 * @returns {Promise<boolean>} - Whether video exists and is accessible
 */
exports.checkVideoAvailability = async (url) => {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return false;
    }
    
    await ytdl.getInfo(videoId);
    return true;
  } catch (error) {
    console.error('Video availability check failed:', error);
    return false;
  }
};
// src/utils/api.js
import axios from 'axios';

// Use environment variable or fallback to relative path for local dev
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';

// Create Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Submit a YouTube URL for processing
 * @param {string} url - The YouTube URL to process
 * @returns {Promise<Object>} - API response data
 */
export const submitUrl = async ({ url, startTime, endTime }) => {
  console.log('Submitting URL to backend:', url, startTime, endTime);

  try {
    const response = await apiClient.post('/transcribe', { url, startTime, endTime });
    console.log('API response:', response.data);
    return { data: response.data };
  } catch (error) {
    const errMessage = error.response?.data?.error || error.message;
    console.error('Error submitting URL:', errMessage);
    throw new Error(`API error: ${errMessage}`);
  }
};

/**
 * Get status of a processing job
 */
export const getJobStatus = (jobId) => apiClient.get(`/status/${jobId}`);

/**
 * Cancel a processing job
 */
export const cancelJob = (jobId) => apiClient.post(`/cancel/${jobId}`);

/**
 * Get a file (PDF or Markdown)
 */
export const getFile = (jobId, fileType, preview = false) =>
  apiClient.get(`/files/${jobId}/${fileType}`, {
    params: preview ? { preview: true } : {},
    responseType:
      fileType === 'pdf'
        ? 'blob'
        : 'text', // ✅ return full Markdown as plain text
  });

  /**
 * Get video metadata for a completed job
 * @param {string} jobId
 * @returns {Promise<Object>} - Video metadata object
 */
export const getVideoMetadata = async (jobId) => {
  try {
    const response = await apiClient.get(`/metadata/${jobId}`);
    return response.data.videoMetadata || {};
  } catch (error) {
    console.error('Failed to fetch video metadata:', error);
    return {};
  }
};

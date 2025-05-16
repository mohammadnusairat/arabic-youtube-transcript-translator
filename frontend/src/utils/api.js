// src/utils/api.js
import axios from 'axios';

// Base URL for API calls (relative path ensures flexibility)
const API_BASE_URL = '/api';

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
export const submitUrl = async (url) => {
  console.log('Submitting URL to backend:', url);

  try {
    const response = await apiClient.post('/transcribe', { url });
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
  apiClient.get(`/files/${jobId}/${fileType}${preview ? '?preview=true' : ''}`, {
    responseType: preview ? 'json' : 'blob',
  });

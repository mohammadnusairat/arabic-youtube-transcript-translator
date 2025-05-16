// src/utils/api.js
import axios from 'axios';

// Base URL for API calls
// In production, this should be an environment variable
// Use relative URL to automatically match the current domain for deployment
const API_BASE_URL = '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle API request interceptor for authentication if needed
// apiClient.interceptors.request.use(config => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

/**
 * Submit a YouTube URL for processing
 * @param {string} url - The YouTube URL to process
 * @returns {Promise} - Response object from the API
 */
export const submitUrl = async (url) => {
  console.log('Submitting URL to backend:', url);
  try {
    // Handle absolute vs relative URLs for deployment environments
    const apiEndpoint = window.location.hostname.includes('mgx.dev') ?
      'https://' + window.location.hostname + '/api/transcribe' :
      API_BASE_URL + '/transcribe';
    
    console.log('Using API endpoint:', apiEndpoint);
    
    // Make an explicit API call with detailed headers and stringified payload
    const payload = JSON.stringify({ url: url });
    console.log('Request payload:', payload);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload
    });
    
    // Handle response
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Response status:', response.status);
      console.error('Response data:', errorData);
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response:', data);
    return { data }; // Match axios response structure
  } catch (error) {
    console.error('Error submitting URL:', error.message);
    throw error;
  }
};

/**
 * Get status of a processing job
 * @param {string} jobId - The ID of the job to check
 * @returns {Promise} - Response object from the API
 */
export const getJobStatus = async (jobId) => {
  // Make an actual API call to the backend
  return apiClient.get(`/status/${jobId}`);
};

/**
 * Cancel a processing job
 * @param {string} jobId - The ID of the job to cancel
 * @returns {Promise} - Response object from the API
 */
export const cancelJob = async (jobId) => {
  // Make an actual API call to the backend
  return apiClient.post(`/cancel/${jobId}`);
};

/**
 * Get file content (PDF or Markdown)
 * @param {string} jobId - The ID of the job
 * @param {string} fileType - The type of file (pdf or markdown)
 * @param {boolean} preview - Whether to get a preview instead of the full file
 * @returns {Promise} - Response object from the API
 */
export const getFile = async (jobId, fileType, preview = false) => {
  // Make an actual API call to the backend
  return apiClient.get(`/files/${jobId}/${fileType}${preview ? '?preview=true' : ''}`, {
    responseType: preview ? 'json' : 'blob'
  });
};
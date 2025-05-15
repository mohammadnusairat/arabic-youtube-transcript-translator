// src/utils/api.js
import axios from 'axios';

// Base URL for API calls
// In a real application, this would be an environment variable
const API_BASE_URL = 'http://localhost:8000/api';

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
  // For demo purposes, simulate the API call
  // In a real application, this would be:
  // return apiClient.post('/jobs', { url });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const jobId = `job_${Math.random().toString(36).substr(2, 9)}`;
      // Simulate API response
      resolve({
        data: {
          jobId,
          status: 'validating_url',
          videoMetadata: {
            title: 'Sample Arabic Video',
            channelTitle: 'Arabic Channel',
            thumbnail: 'https://i.ytimg.com/vi/sample/default.jpg',
            duration: '10:30'
          }
        }
      });
    }, 1500);
  });
};

/**
 * Get status of a processing job
 * @param {string} jobId - The ID of the job to check
 * @returns {Promise} - Response object from the API
 */
export const getJobStatus = async (jobId) => {
  // For demo purposes, simulate the API call
  // In a real application, this would be:
  // return apiClient.get(`/jobs/${jobId}`);
  
  return new Promise((resolve) => {
    // For demo purposes, simulate different processing stages
    const stages = ['validating_url', 'extracting_audio', 'transcribing', 'translating', 'generating_documents', 'completed'];
    const progressMap = {
      validating_url: 100,
      extracting_audio: 100,
      transcribing: 100,
      translating: 100,
      generating_documents: 100
    };
    
    // Get current job state from localStorage if available
    const savedJob = localStorage.getItem(`job_${jobId}`);
    let currentJob = savedJob ? JSON.parse(savedJob) : { 
      stage: 0,
      progress: { validating_url: 0 } 
    };
    
    // Update progress based on current stage
    if (currentJob.stage < stages.length - 1) {
      const currentStage = stages[currentJob.stage];
      
      // Increase progress for current stage
      const currentProgress = currentJob.progress[currentStage] || 0;
      if (currentProgress < 100) {
        currentJob.progress[currentStage] = Math.min(currentProgress + Math.random() * 20 + 10, 100);
      } else {
        // Move to next stage
        currentJob.stage += 1;
        const nextStage = stages[currentJob.stage];
        currentJob.progress[nextStage] = 0;
      }
      
      // Save updated job state
      localStorage.setItem(`job_${jobId}`, JSON.stringify(currentJob));
    }
    
    // Prepare response
    const status = stages[currentJob.stage];
    const videoMetadata = {
      title: 'Sample Arabic Video',
      channelTitle: 'Arabic Channel',
      thumbnail: 'https://i.ytimg.com/vi/sample/default.jpg',
      duration: '10:30'
    };
    
    // Add file URLs if completed
    let fileUrls = null;
    if (status === 'completed') {
      fileUrls = {
        pdf: `/api/files/${jobId}/pdf`,
        markdown: `/api/files/${jobId}/markdown`
      };
    }
    
    // Estimate completion time
    const estimatedTime = status === 'completed' ? null : '2:30';
    
    setTimeout(() => {
      resolve({
        data: {
          jobId,
          status,
          progress: currentJob.progress,
          videoMetadata,
          fileUrls,
          estimatedTime
        }
      });
    }, 500);
  });
};

/**
 * Cancel a processing job
 * @param {string} jobId - The ID of the job to cancel
 * @returns {Promise} - Response object from the API
 */
export const cancelJob = async (jobId) => {
  // For demo purposes, simulate the API call
  // In a real application, this would be:
  // return apiClient.post(`/jobs/${jobId}/cancel`);
  
  return new Promise((resolve) => {
    // Remove job from localStorage
    localStorage.removeItem(`job_${jobId}`);
    
    setTimeout(() => {
      resolve({
        data: {
          success: true,
          message: 'Job cancelled successfully'
        }
      });
    }, 500);
  });
};

/**
 * Get file content (PDF or Markdown)
 * @param {string} jobId - The ID of the job
 * @param {string} fileType - The type of file (pdf or markdown)
 * @param {boolean} preview - Whether to get a preview instead of the full file
 * @returns {Promise} - Response object from the API
 */
export const getFile = async (jobId, fileType, preview = false) => {
  // For demo purposes, simulate the API call
  // In a real application, this would be:
  // return apiClient.get(`/files/${jobId}/${fileType}${preview ? '?preview=true' : ''}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (preview) {
        // Return a preview of the transcript
        resolve({
          data: {
            preview: `[00:00:15] Hello and welcome to our program.
[00:00:20] Today we'll be discussing economic developments in the Middle East.
[00:00:30] I'm joined by Dr. Ahmad from Cairo University.
[00:01:15] Dr. Ahmad, thank you for being with us today.
[00:01:20] Could you tell us about the recent financial trends in the region?
[00:01:30] Certainly, we've seen significant growth in the technology sector.
[00:02:10] Companies are increasingly focusing on sustainable development.
[00:02:30] This has created thousands of new jobs across multiple countries.
[00:03:05] The banking sector has also introduced new regulations.
[00:03:20] These changes aim to increase transparency and stability.`
          }
        });
      } else {
        // Return a sample file blob
        // In a real application, this would return the actual file
        const sampleContent = fileType === 'pdf' ? 
          new Blob(['%PDF-1.5 sample content'], { type: 'application/pdf' }) : 
          new Blob([`# Arabic Video Transcript
          
[00:00:15] Hello and welcome to our program.
[00:00:20] Today we'll be discussing economic developments in the Middle East.
[00:00:30] I'm joined by Dr. Ahmad from Cairo University.
[00:01:15] Dr. Ahmad, thank you for being with us today.
[00:01:20] Could you tell us about the recent financial trends in the region?
[00:01:30] Certainly, we've seen significant growth in the technology sector.
[00:02:10] Companies are increasingly focusing on sustainable development.
[00:02:30] This has created thousands of new jobs across multiple countries.
[00:03:05] The banking sector has also introduced new regulations.
[00:03:20] These changes aim to increase transparency and stability.`], 
          { type: 'text/plain' });
        
        resolve({ data: sampleContent });
      }
    }, 800);
  });
};
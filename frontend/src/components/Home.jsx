import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateYoutubeUrl } from '../utils/validators';
import { submitUrl, uploadFile } from '../utils/api';
import { useJobContext } from '../contexts/JobContext';
import axios from 'axios';

function Home() {
  const [url, setUrl] = useState('');
  const [startMinutes, setStartMinutes] = useState('');
  const [startSeconds, setStartSeconds] = useState('');
  const [endMinutes, setEndMinutes] = useState('');
  const [endSeconds, setEndSeconds] = useState('');
  const [videoDuration, setVideoDuration] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentJobs, setRecentJobs] = useState([]);
  const navigate = useNavigate();
  const { setCurrentJob } = useJobContext();
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // 'youtube' = paste a link, 'upload' = upload an audio/video file
  const [sourceType, setSourceType] = useState('youtube');
  const [file, setFile] = useState(null);
  const [fileDuration, setFileDuration] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [youtubeBlocked, setYoutubeBlocked] = useState(false);
  const MAX_UPLOAD_MB = 200;

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';

  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  useEffect(() => {
    // Load recent jobs from localStorage
    const savedJobs = localStorage.getItem('recentJobs');
    if (savedJobs) {
      setRecentJobs(JSON.parse(savedJobs).slice(0, 5)); // Show only last 5 jobs
    }
  }, []);

  const toSeconds = (min, sec) => {
    return (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
  };

  const switchSource = (type) => {
    setSourceType(type);
    setError('');
    setYoutubeBlocked(false);
  };

  const formatDuration = (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const saveRecentJob = (jobId, title) => {
    const newRecentJob = {
      id: jobId,
      title,
      thumbnail: '',
      timestamp: new Date().toISOString()
    };
    const updatedJobs = [newRecentJob, ...recentJobs.filter(job => job.id !== jobId)].slice(0, 5);
    setRecentJobs(updatedJobs);
    localStorage.setItem('recentJobs', JSON.stringify(updatedJobs));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setError('');
    setFile(null);
    setFileDuration(null);
    if (!selected) return;

    if (selected.size > MAX_UPLOAD_MB * 1024 * 1024) {
      e.target.value = '';
      return setError(`File is too large. Maximum size is ${MAX_UPLOAD_MB}MB.`);
    }
    setFile(selected);

    // Read the duration in the browser so the time range can be validated before uploading
    const media = document.createElement(selected.type.startsWith('video/') ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(selected);
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration)) {
        setFileDuration(Math.floor(media.duration));
      }
      URL.revokeObjectURL(objectUrl);
    };
    media.onerror = () => URL.revokeObjectURL(objectUrl);
    media.src = objectUrl;
  };

  const fetchMetadata = async () => {
    setError('');
    setYoutubeBlocked(false);
    setIsFetchingMetadata(true);
    if (!validateYoutubeUrl(url)) {
      setIsFetchingMetadata(false);
      return setError('Please enter a valid YouTube URL');
    }

    try {
      const response = await apiClient.get('/metadata', { params: { url } });
      setVideoDuration(response.data.durationSeconds);
    } catch (err) {
      const code = err?.response?.data?.error;
      const message = err?.response?.data?.message;
      if (code === 'youtube_blocked' || code === 'video_restricted') {
        setYoutubeBlocked(true);
      }
      setError(message || 'Failed to fetch video metadata');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const submitUpload = async () => {
    if (!file) return setError('Please choose an audio or video file');

    const start = toSeconds(startMinutes, startSeconds);
    const end = toSeconds(endMinutes, endSeconds);
    const useWholeFile = start === 0 && end === 0;

    if (!useWholeFile) {
      if (start >= end) return setError('Start time must be less than end time');
      if (fileDuration && end > fileDuration) return setError('End time exceeds file duration');
      if ((end - start) < 5) return setError('Please select at least 5 seconds of audio');
    }

    setIsLoading(true);
    setUploadProgress(0);
    try {
      const data = await uploadFile({
        file,
        startTime: useWholeFile ? null : start,
        endTime: useWholeFile ? null : end,
        onProgress: setUploadProgress
      });

      setCurrentJob(data);
      saveRecentJob(data.jobId, file.name);
      navigate(`/processing/${data.jobId}`, {
        state: {
          clipDuration: useWholeFile ? fileDuration : end - start
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');

    if (sourceType === 'upload') {
      return submitUpload();
    }
    
    // Validate and clean URL
    const trimmedUrl = url.trim();
    console.log('Processing URL:', trimmedUrl);
    
    if (!trimmedUrl) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    if (!validateYoutubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    const start = toSeconds(startMinutes, startSeconds);
    const end = toSeconds(endMinutes, endSeconds);

    if (!videoDuration) return setError('Please fetch video metadata first');
    if (start >= end) return setError('Start time must be less than end time');
    if (end > videoDuration) return setError('End time exceeds video duration');
    if ((end - start) < 5) return setError('Please select at least 5 seconds of audio');
    
    setIsLoading(true);
    console.log('Submitting validated URL:', trimmedUrl);
    
    try {
      console.log('About to call submitUrl with:', trimmedUrl);
      const response = await apiClient.post('/transcribe', {
        url: trimmedUrl,
        startTime: start,
        endTime: end
      });
      console.log('Response received:', response);
      
      // Update job context with the new job
      setCurrentJob(response.data);
      
      // Add to recent jobs
      saveRecentJob(response.data.jobId, trimmedUrl);
      
      // Navigate to processing page
      navigate(`/processing/${response.data.jobId}`, {
        state: {
          clipDuration: end - start // already in seconds
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Transform Arabic YouTube Videos to English Text
        </h1>
        <p className="text-gray-600">
          Paste an Arabic YouTube link or upload an audio/video file to get an accurate English transcript with timestamps
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="flex mb-6 border border-gray-300 rounded-md overflow-hidden">
            {[
              { type: 'youtube', label: 'YouTube link' },
              { type: 'upload', label: 'Upload file' }
            ].map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => switchSource(type)}
                disabled={isLoading}
                className={`flex-1 py-2 text-sm font-medium transition-colors duration-200 ${
                  sourceType === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sourceType === 'youtube' ? (
            <>
              <div className="mb-4">
                <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste YouTube URL
                </label>
                <input
                  type="text"
                  id="youtube-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-3 border border-gray-300 rounded-md"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <button
                  type="button"
                  onClick={fetchMetadata}
                  className={`px-4 py-2 rounded-md text-white ${
                    isFetchingMetadata ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                  disabled={isLoading || isFetchingMetadata}
                >
                  {isFetchingMetadata ? 'Fetching...' : 'Fetch Video Metadata'}
                </button>
                {videoDuration && (
                  <p className="text-sm text-green-600 mt-2">
                    Video Duration: {formatDuration(videoDuration)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label htmlFor="media-file" className="block text-sm font-medium text-gray-700 mb-2">
                Choose an audio or video file (max {MAX_UPLOAD_MB}MB)
              </label>
              <input
                type="file"
                id="media-file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="w-full p-2 border border-gray-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              {file && (
                <p className="text-sm text-green-600 mt-2">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                  {fileDuration != null && ` | Duration: ${formatDuration(fileDuration)}`}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Leave the start and end times blank to transcribe the whole file.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (min:sec)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={startMinutes}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setStartMinutes(value.toString());
                  }}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Sec"
                  value={startSeconds}
                  onChange={(e) => {
                    let value = parseInt(e.target.value) || 0;
                    if (value < 0) value = 0;
                    if (value > 59) value = 59;
                    setStartSeconds(value.toString());
                  }}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (min:sec)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={endMinutes}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setEndMinutes(value.toString());
                  }}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Sec"
                  value={endSeconds}
                  onChange={(e) => {
                    let value = parseInt(e.target.value) || 0;
                    if (value < 0) value = 0;
                    if (value > 59) value = 59;
                    setEndSeconds(value.toString());
                  }}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
              {youtubeBlocked && sourceType === 'youtube' && (
                <button
                  type="button"
                  onClick={() => switchSource('upload')}
                  className="block mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-3 rounded-md"
                >
                  Upload a file instead
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            {isLoading
              ? (uploadProgress != null ? `Uploading... ${uploadProgress}%` : 'Submitting...')
              : 'Start Processing'}
          </button>
        </form>
      </div>

      {recentJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Conversions</h2>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/results/${job.id}`)}
                className="flex items-center space-x-4 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              >
                {job.thumbnail && (
                  <img src={job.thumbnail} alt={job.title} className="w-20 h-12 object-cover rounded" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{job.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(job.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
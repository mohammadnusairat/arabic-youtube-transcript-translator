import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateYoutubeUrl } from '../utils/validators';
import { submitUrl } from '../utils/api';
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

  const fetchMetadata = async () => {
    setError('');
    if (!validateYoutubeUrl(url)) {
      return setError('Please enter a valid YouTube URL');
    }

    try {
      const response = await axios.get('/api/metadata', { params: { url } });
      setVideoDuration(response.data.durationSeconds);
    } catch (err) {
      setError('Failed to fetch video metadata');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
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
    
    setIsLoading(true);
    console.log('Submitting validated URL:', trimmedUrl);
    
    try {
      console.log('About to call submitUrl with:', trimmedUrl);
      const response = await axios.post('/api/transcribe', {
        url: trimmedUrl,
        startTime: start,
        endTime: end
      });
      console.log('Response received:', response);
      
      // Update job context with the new job
      setCurrentJob(response.data);
      
      // Add to recent jobs
      const newRecentJob = {
        id: response.data.jobId,
        title: response.data.videoMetadata?.title || 'Unknown video',
        thumbnail: response.data.videoMetadata?.thumbnail || '',
        timestamp: new Date().toISOString()
      };
      
      const updatedJobs = [newRecentJob, ...recentJobs.filter(job => job.id !== newRecentJob.id)].slice(0, 5);
      setRecentJobs(updatedJobs);
      localStorage.setItem('recentJobs', JSON.stringify(updatedJobs));
      
      // Navigate to processing page
      navigate(`/processing/${response.data.jobId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
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
          Paste any Arabic YouTube video link to get an accurate English transcript with timestamps
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit}>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
              disabled={isLoading}
            >
              Fetch Video Duration
            </button>
            {videoDuration && (
              <p className="text-sm text-green-600 mt-2">
                Video Duration: {videoDuration} seconds
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (min:sec)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={startMinutes}
                  onChange={(e) => setStartMinutes(e.target.value)}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Sec"
                  value={startSeconds}
                  onChange={(e) => setStartSeconds(e.target.value)}
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
                  onChange={(e) => setEndMinutes(e.target.value)}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Sec"
                  value={endSeconds}
                  onChange={(e) => setEndSeconds(e.target.value)}
                  className="w-1/2 p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            {isLoading ? 'Submitting...' : 'Start Processing'}
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
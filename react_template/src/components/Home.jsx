import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateYoutubeUrl } from '../utils/validators';
import { submitUrl } from '../utils/api';
import { useJobContext } from '../contexts/JobContext';

function Home() {
  const [url, setUrl] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validate URL
    if (!validateYoutubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await submitUrl(url);
      
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
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-blue-400"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Start Processing'
            )}
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
                  <img 
                    src={job.thumbnail} 
                    alt={job.title} 
                    className="w-20 h-12 object-cover rounded"
                  />
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
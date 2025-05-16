import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobStatus, getFile } from '../utils/api';
import { useJobContext } from '../contexts/JobContext';

function Results() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { currentJob, setCurrentJob } = useJobContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoMetadata, setVideoMetadata] = useState({});
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [fileUrls, setFileUrls] = useState({
    pdf: '',
    markdown: ''
  });

  useEffect(() => {
    // Initialize with current job if available, otherwise fetch it
    if (currentJob && currentJob.jobId === jobId && currentJob.status === 'completed') {
      setVideoMetadata(currentJob.videoMetadata || {});
      setFileUrls(currentJob.fileUrls || {});
      fetchTranscriptPreview();
      setIsLoading(false);
    } else {
      fetchJobData();
    }
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      setIsLoading(true);
      const response = await getJobStatus(jobId);
      
      if (response.data.status !== 'completed') {
        // If job is not completed, redirect to processing page
        navigate(`/processing/${jobId}`);
        return;
      }
      
      setCurrentJob(response.data);
      setVideoMetadata(response.data.videoMetadata || {});
      setFileUrls(response.data.fileUrls || {});
      
      await fetchTranscriptPreview();
      setIsLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results. The job may have expired or been removed.');
      setIsLoading(false);
    }
  };

  const fetchTranscriptPreview = async () => {
    try {
      const response = await getFile(jobId, 'markdown', true);  // true for preview mode
      setTranscriptPreview(response.data.preview || '');
    } catch (err) {
      console.error('Failed to load transcript preview:', err);
      setTranscriptPreview('Preview not available.');
    }
  };

  const handleDownload = async (fileType) => {
    try {
      const response = await getFile(jobId, fileType);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript.${fileType === 'pdf' ? 'pdf' : 'md'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(`Failed to download ${fileType} file.`);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(transcriptPreview)
      .then(() => {
        // Show a temporary success message
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'Copied!';
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch(err => {
        setError('Failed to copy to clipboard.');
      });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Transcript Results</h1>
        
        {videoMetadata && (
          <div className="flex items-center mb-6">
            {videoMetadata.thumbnail && (
              <img 
                src={videoMetadata.thumbnail} 
                alt={videoMetadata.title} 
                className="w-32 h-18 object-cover rounded mr-4"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{videoMetadata.title || 'Video'}</h2>
              {videoMetadata.channelTitle && (
                <p className="text-gray-600">
                  {videoMetadata.channelTitle} | Duration: {videoMetadata.duration || '--:--'}
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Transcript Preview:</h3>
          <div className="relative">
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50 h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {transcriptPreview || 'No transcript preview available.'}
            </div>
            <div className="absolute top-2 right-2">
              <button 
                onClick={handleCopyToClipboard}
                id="copy-btn"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-2 rounded-md transition-colors duration-300"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <h3 className="w-full text-lg font-semibold text-gray-800 mb-2">Download Options:</h3>
          <button 
            onClick={() => handleDownload('pdf')}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download PDF
          </button>
          <button 
            onClick={() => handleDownload('markdown')}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download Markdown
          </button>
          <button 
            onClick={handleCopyToClipboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
            </svg>
            Copy to Clipboard
          </button>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md transition-colors duration-300"
          >
            Process Another Video
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;
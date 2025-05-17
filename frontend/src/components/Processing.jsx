import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobStatus, cancelJob } from '../utils/api';
import { useJobContext } from '../contexts/JobContext';
import { useLocation } from 'react-router-dom';

function Processing() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);
  const { currentJob, setCurrentJob } = useJobContext();
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({});
  const [error, setError] = useState('');
  const [videoMetadata, setVideoMetadata] = useState({});
  const pollingIntervalRef = useRef(null);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const location = useLocation();
  const clipDuration = location.state?.clipDuration; // in seconds
  
  const getClipDurationLabel = (seconds) => {
  if (!seconds || seconds <= 0) return null;
    const min = Math.floor(seconds / 60) + 1;
    return `${min}mins`;
  };

  const clipDurationLabel = getClipDurationLabel(clipDuration);

  useEffect(() => {
    const poll = async () => {
      await fetchJobStatus();
    };

    poll();

    pollingIntervalRef.current = setInterval(poll, 2000);

    return () => {
      clearInterval(pollingIntervalRef.current);
    };
  }, [jobId, navigate]);

  useEffect(() => {
    hasNavigated.current = false;
    setShouldNavigate(false);
  }, [jobId]);

  useEffect(() => {
    if (shouldNavigate && !hasNavigated.current) {
      console.log('Navigating to results page...');
      hasNavigated.current = true;
      clearInterval(pollingIntervalRef.current);
      navigate(`/results/${jobId}`);
    }
  }, [shouldNavigate, navigate, jobId]);

  const fetchJobStatus = async () => {
    if (hasNavigated.current) return;  // early exit if navigation happened

    try {
      const response = await getJobStatus(jobId);
      const normalizedStatus = (response.data.status || '').split(' ')[0].toLowerCase();
      setStatus(normalizedStatus);
      setProgress(response.data.progress || {});
      setVideoMetadata(response.data.videoMetadata || {});

      // Update context
      setCurrentJob(response.data);
      
      if (normalizedStatus === 'completed') {
        if (!shouldNavigate) {
          setShouldNavigate(true);  // set once only
        }
        return;  // early return, avoid extra polling
      }
      if (normalizedStatus === 'error') {
        clearInterval(pollingIntervalRef.current);
        setError(response.data.error || 'An error occurred during processing');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get processing status');
      clearInterval(pollingIntervalRef.current);  // STOP POLLING ON ERROR
    }
  };

  const handleCancel = async () => {
    try {
      await cancelJob(jobId);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel job');
    }
  };

  const getProgressPercentage = (stage) => {
    if (!progress) return 0;
    
    switch (stage) {
      case 'validating_url':
        return progress.validating || 0;
      case 'extracting_audio':
        return progress.extracting || 0;
      case 'transcribing':
        return progress.transcribing || 0;
      case 'translating':
        return progress.translating || 0;
      case 'generating_documents':
        return progress.generating || 0;
      default:
        return 0;
    }
  };

  const getStageStatus = (stage) => {
    if (status === 'error') {
      return 'error';
    }

    const statusOrder = [
      'validating_url',
      'extracting_audio',
      'transcribing',
      'translating',
      'generating_documents',
      'completed'
    ];

    const currentIndex = statusOrder.indexOf(status);
    const stageIndex = statusOrder.indexOf(stage);

    if (currentIndex === stageIndex) {
      return 'in_progress';
    } else if (currentIndex > stageIndex) {
      return 'completed';
    } else {
      return 'pending';
    }
  };

  const renderStageIcon = (stage) => {
    const stageStatus = getStageStatus(stage);
    
    if (stageStatus === 'completed') {
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      );
    } else if (stageStatus === 'in_progress') {
      return (
        <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      );
    } else if (stageStatus === 'error') {
      return (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Processing Your Video</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-medium">Processing Error</p>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        )}
        
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
              <h2 className="text-lg font-semibold text-gray-800">
                {videoMetadata.title ? videoMetadata.title : 'Fetching video details...'}
              </h2>
              {videoMetadata.channelTitle && (
                <p className="text-gray-600">
                  {videoMetadata.channelTitle} | Duration: {videoMetadata.duration || '--:--'}
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing:</h3>
          
          <div className="space-y-4">
            {/* Validating URL */}
            <div className="flex items-center">
              <div className="mr-3">
                {renderStageIcon('validating_url')}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">Validating URL</p>
                  {getStageStatus('validating_url') === 'in_progress' && (
                    <p className="text-sm text-gray-500">{getProgressPercentage('validating_url')}%</p>
                  )}
                </div>
                {getStageStatus('validating_url') === 'in_progress' && (
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${getProgressPercentage('validating_url')}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Extracting Audio */}
            <div className="flex items-center">
              <div className="mr-3">
                {renderStageIcon('extracting_audio')}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">Extracting Audio</p>
                  {getStageStatus('extracting_audio') === 'in_progress' && (
                    <p className="text-sm text-gray-500">{getProgressPercentage('extracting_audio')}%</p>
                  )}
                </div>
                {getStageStatus('extracting_audio') === 'in_progress' && (
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${getProgressPercentage('extracting_audio')}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Transcribing Audio */}
            <div className="flex items-center">
              <div className="mr-3">
                {renderStageIcon('transcribing')}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">Transcribing Audio</p>
                  {getStageStatus('transcribing') === 'in_progress' && (
                    <p className="text-sm text-gray-500">{getProgressPercentage('transcribing')}%</p>
                  )}
                </div>
                {getStageStatus('transcribing') === 'in_progress' && (
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${getProgressPercentage('transcribing')}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Translating Content */}
            <div className="flex items-center">
              <div className="mr-3">
                {renderStageIcon('translating')}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">Translating Content</p>
                  {getStageStatus('translating') === 'in_progress' && (
                    <p className="text-sm text-gray-500">{getProgressPercentage('translating')}%</p>
                  )}
                </div>
                {getStageStatus('translating') === 'in_progress' && (
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${getProgressPercentage('translating')}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Generating Files */}
            <div className="flex items-center">
              <div className="mr-3">
                {renderStageIcon('generating_documents')}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">Generating Files</p>
                  {getStageStatus('generating_documents') === 'in_progress' && (
                    <p className="text-sm text-gray-500">{getProgressPercentage('generating_documents')}%</p>
                  )}
                </div>
                {getStageStatus('generating_documents') === 'in_progress' && (
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${getProgressPercentage('generating_documents')}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {clipDurationLabel && (
          <div className="mb-6 flex justify-center">
            <span className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
              Estimated completion time: <strong>{clipDurationLabel}</strong>
            </span>
          </div>
        )}

        {/* {remainingTime && (
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500">
              ⏳ Time remaining for {status.replace('_', ' ')}: {remainingTime}
            </p>
          </div>
        )} */}
        
        <div className="flex justify-center">
          <button
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md transition-colors duration-300"
            disabled={status === 'error'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Processing;
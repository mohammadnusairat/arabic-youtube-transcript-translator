import React, { createContext, useContext, useState } from 'react';

// Create the context
const JobContext = createContext();

/**
 * JobProvider component for managing job state across the application
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function JobProvider({ children }) {
  const [currentJob, setCurrentJob] = useState(null);

  // Value to be provided by the context
  const value = {
    currentJob,
    setCurrentJob
  };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
}

/**
 * Custom hook to use the job context
 * @returns {Object} The job context value
 */
export function useJobContext() {
  const context = useContext(JobContext);
  
  if (!context) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  
  return context;
}

export default JobContext;
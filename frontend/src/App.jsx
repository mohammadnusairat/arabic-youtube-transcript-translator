import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Processing from './components/Processing';
import Results from './components/Results';
import { JobProvider } from './contexts/JobContext';
import './styles/custom.css';

function App() {
  return (
    <JobProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/processing/:jobId" element={<Processing />} />
              <Route path="/results/:jobId" element={<Results />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </JobProvider>
  );
}

export default App;
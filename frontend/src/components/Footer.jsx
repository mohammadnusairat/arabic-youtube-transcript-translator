import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">&copy; {new Date().getFullYear()} Arabic YouTube Transcript Translator</p>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-sm hover:text-blue-300 transition-colors duration-300">Terms of Service</a>
            <a href="#" className="text-sm hover:text-blue-300 transition-colors duration-300">Privacy Policy</a>
            <a href="https://www.mohammadnusairat.com/" className="text-sm hover:text-blue-300 transition-colors duration-300">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
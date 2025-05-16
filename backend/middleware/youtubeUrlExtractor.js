// middleware/youtubeUrlExtractor.js

/**
 * Middleware to extract YouTube URL from various request formats
 */
module.exports = function(req, res, next) {
  console.log('YouTube URL Extractor middleware running');
  console.log('Request content-type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  console.log('Request rawBody:', req.rawBody);
  
  let youtubeUrl = null;
  
  // First check if a rawBody exists with YouTube URL
  if (req.rawBody && typeof req.rawBody === 'string') {
    if (req.rawBody.includes('youtube.com') || req.rawBody.includes('youtu.be')) {
      // If the rawBody is just a URL
      if (req.rawBody.trim().startsWith('http')) {
        youtubeUrl = req.rawBody.trim();
        console.log('URL extracted directly from rawBody:', youtubeUrl);
      }
      // Try to extract URL using regex
      else {
        const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/[^\s"']+/g;
        const matches = req.rawBody.match(urlRegex);
        if (matches && matches.length > 0) {
          youtubeUrl = matches[0];
          console.log('URL extracted from rawBody using regex:', youtubeUrl);
        }
      }
    }
  }
  
  // Then try the extracted URL from the raw body parser middleware
  if (!youtubeUrl && req.extractedYouTubeUrl) {
    youtubeUrl = req.extractedYouTubeUrl;
    console.log('Using pre-extracted YouTube URL:', youtubeUrl);
  }
  
  // Then try the standard req.body approach
  if (!youtubeUrl && req.body) {
    // Direct URL in body.url
    if (req.body.url) {
      youtubeUrl = req.body.url;
      console.log('URL extracted from req.body.url:', youtubeUrl);
    }
    // If body itself is a string
    else if (typeof req.body === 'string') {
      if (req.body.includes('youtube.com') || req.body.includes('youtu.be')) {
        youtubeUrl = req.body;
        console.log('URL extracted from body string:', youtubeUrl);
      }
    }
  }
  
  // Store the extracted URL in the request object
  if (youtubeUrl) {
    req.youtubeUrl = youtubeUrl;
    console.log('YouTube URL successfully extracted:', youtubeUrl);
  } else {
    console.log('No YouTube URL found in the request');
  }
  
  next();
};

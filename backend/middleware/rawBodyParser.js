// Raw body parser middleware to capture raw request body
const getRawBody = require('raw-body');

module.exports = function rawBodyParser() {
  return async function(req, res, next) {
    try {
      // Skip if already processed or not a POST request to the transcribe endpoint
      if (req._rawBody || req.method !== 'POST' || !req.path.includes('/transcribe')) {
        return next();
      }
      
      // Get raw body before it's parsed by bodyParser
      const rawBody = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: '10mb',
        encoding: true // Get as string
      });
      
      // Store raw body for later use
      req._rawBody = rawBody;
      
      // Try to parse YouTube URL from various formats
      if (rawBody) {
        // Check if it's possibly a direct URL
        if (rawBody.includes('youtube.com') || rawBody.includes('youtu.be')) {
          // Try to parse as JSON first
          try {
            const jsonData = JSON.parse(rawBody);
            if (jsonData && jsonData.url) {
              req.youtubeUrl = jsonData.url;
              console.log('YouTube URL extracted from JSON:', req.youtubeUrl);
            }
          } catch (e) {
            // Not a valid JSON, check if it's a direct URL
            const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/[^\s"']+/g;
            const matches = rawBody.match(urlRegex);
            if (matches && matches.length > 0) {
              req.youtubeUrl = matches[0];
              console.log('YouTube URL extracted with regex from raw body:', req.youtubeUrl);
            }
          }
        }
      }
      
      next();
    } catch (err) {
      console.error('Raw body parser error:', err);
      next(err);
    }
  };
};

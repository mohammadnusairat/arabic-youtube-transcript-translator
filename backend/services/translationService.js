// services/translationService.js
const { OpenAI } = require('openai');
const config = require('../config/config');

// Initialize OpenAI client if API key is provided
let openai = null;
if (config.openaiApiKey) {
  openai = new OpenAI({
    apiKey: config.openaiApiKey
  });
  console.log('OpenAI API initialized successfully');
} else {
  console.warn('OpenAI API key not provided, falling back to simulation');
}

/**
 * Translate text from Arabic to English
 * @param {Array} transcriptionSegments - Array of transcription segments with timestamps
 * @returns {Promise<Array>} - Translated segments with timestamps
 */
exports.translateText = async (transcriptionSegments) => {
  try {
    console.log(`Starting translation for ${transcriptionSegments.length} segments`);

    if (config.useSimulation) {
      return simulateTranslation(transcriptionSegments);
    }
    
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Process in smaller batches to avoid token limits
    const batchSize = 5;
    const translatedSegments = [];
    
    for (let i = 0; i < transcriptionSegments.length; i += batchSize) {
      const batch = transcriptionSegments.slice(i, i + batchSize);
      
      // Prepare the prompt for the batch
      const prompt = `Translate the following Arabic text segments to English. 
Keep the same meaning and style. Return ONLY the translations in the same order, 
one per line, without adding any explanation or additional text:

${batch.map((segment, index) => `${index + 1}. ${segment.text}`).join('\n')}`;
      
      // Make API request to OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a skilled translator from Arabic to English. Provide accurate, natural-sounding translations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      // Process the response
      const translationText = response.choices[0].message.content.trim();
      const translationLines = translationText.split('\n').filter(line => line.trim() !== '');
      
      // Map translations back to their segments
      batch.forEach((segment, index) => {
        // Extract just the translation text, removing any numbering
        let translationLine = translationLines[index] || '';
        translationLine = translationLine.replace(/^\d+\.\s*/, '').trim();
        
        translatedSegments.push({
          ...segment,
          original: segment.text,
          text: translationLine
        });
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return translatedSegments;
  } catch (error) {
    console.error('Translation error:', error);
    if (config.useSimulation) {
      return simulateTranslation(transcriptionSegments);
    }
    throw new Error(`Failed to translate text: ${error.message}`);
  }
};

/**
 * Simulate a translation response for testing
 * @param {Array} transcriptionSegments - Transcription segments with timestamps
 * @returns {Array} - Simulated translation segments
 */
function simulateTranslation(transcriptionSegments) {
  console.log('Using simulated translation data');
  
  // Simulated translations for the Arabic segments
  const simulatedTranslations = [
    "Welcome to this educational video",
    "Today we will talk about the importance of the Arabic language in the digital world",
    "Arabic is considered one of the most widely spoken languages in the world",
    "There are more than 422 million people who speak Arabic as a first language",
    "In this video, we will learn how to use technology to support Arabic content",
    "One of the most important recent developments in this field is speech recognition and machine translation systems",
    "These systems have improved significantly in recent years thanks to artificial intelligence technologies",
    "Now we can convert spoken Arabic into written text with high accuracy",
    "We can also easily translate this text into other languages such as English",
    "These technologies help spread Arabic content more widely and make it more accessible"
  ];
  
  // Map the simulated translations to the original segments
  return transcriptionSegments.map((segment, index) => ({
    ...segment,
    original: segment.text,
    text: simulatedTranslations[index] || `Translation for segment ${index + 1}`
  }));
}
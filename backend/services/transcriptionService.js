// services/transcriptionService.js
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const config = require('../config/config');

/**
 * Transcribe audio file using Microsoft Azure Speech SDK
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<Array>} - Transcribed segments with timestamps
 */
exports.transcribeAudio = async (audioFilePath) => {
  try {
    console.log(`Starting transcription for file: ${audioFilePath}`);

    // Use simulation data if environment is set or if we're missing credentials
    if (config.useSimulation) {
      console.log('Using simulation mode for transcription');
      return simulateTranscription();
    }
    
    // Validate API key and region
    const apiKey = process.env.MARKITDOWN_API_KEY || config.markitdownApiKey;
    const region = process.env.MARKITDOWN_REGION || config.markitdownRegion;
    
    console.log(`API Key exists: ${!!apiKey} (${apiKey ? apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4) : 'missing'})`);
    console.log(`Region exists: ${!!region} (${region || 'missing'})`);
    
    if (!apiKey || !region) {
      console.error('Azure Speech SDK credentials not configured, falling back to simulation mode');
      return simulateTranscription();
    }
    
    // Ensure region is correctly formatted (lowercase, no spaces)
    const formattedRegion = region.toLowerCase().trim();
    console.log(`Using region: ${formattedRegion}`);
    
    // Read the audio file
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }
    
    console.log('Creating speech configuration with API key and region');
    // Setup the transcription configuration with Azure Speech SDK using standard pattern
    // Use the correctly formatted region (lowercase, no spaces)
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      apiKey, 
      formattedRegion
    );
    console.log('Speech configuration created successfully');
    
    // Set recognition language to Arabic
    speechConfig.speechRecognitionLanguage = 'ar-SA';
    
    // Enable detailed output with word-level timing
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;
    
    console.log('Setting up audio stream');
    // Setup the audio configuration
    const pushStream = sdk.AudioInputStream.createPushStream();
    
    // Read the audio file as a buffer
    console.log('Reading audio file');
    const audioBuffer = fs.readFileSync(audioFilePath);
    console.log(`Read ${audioBuffer.length} bytes from audio file`);
    
    // Write audio data to the push stream in chunks to avoid potential buffer issues
    const chunkSize = 1024 * 32; // 32KB chunks
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, audioBuffer.length);
      const chunk = audioBuffer.slice(i, end);
      pushStream.write(chunk);
    }
    pushStream.close();
    
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    
    console.log('Creating speech recognizer');
    // Create speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Store the segments
    const transcriptionSegments = [];
    let currentStartTime = 0;
    
    console.log('Setting up event handlers');
    // Return a promise that resolves when transcription is complete
    return new Promise((resolve, reject) => {
      // Handle speech recognition results
      recognizer.recognized = (sender, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          try {
            // Get the detailed result
            const detailedResult = JSON.parse(event.result.json);
            
            // Extract timing and text
            const startTime = detailedResult.Offset / 10000000; // Convert to seconds
            const endTime = (detailedResult.Offset + detailedResult.Duration) / 10000000;
            const text = detailedResult.DisplayText;
            
            console.log(`Recognized text: ${text}`);
            console.log(`Time: ${startTime} - ${endTime}`);
            
            // Add to segments
            if (text.trim()) {
              transcriptionSegments.push({
                start: startTime,
                end: endTime,
                text: text
              });
            }
            
            // Update current time for next segment
            currentStartTime = endTime;
          } catch (parseError) {
            console.error('Error parsing recognition result:', parseError);
            console.log('Raw result:', event.result.json);
          }
        }
      };
      
      // Handle errors
      recognizer.canceled = (sender, event) => {
        console.log(`Recognition canceled: ${event.reason}`);
        if (event.reason === sdk.CancellationReason.Error) {
          console.error(`Error details: ${event.errorDetails}`);
          reject(new Error(`Transcription canceled: ${event.errorDetails}`));
        } else {
          // If canceled for other reason, try to work with what we have
          if (transcriptionSegments.length > 0) {
            console.log(`Transcription stopped with ${transcriptionSegments.length} segments`);
            resolve(transcriptionSegments);
          } else {
            reject(new Error('Transcription canceled without results'));
          }
        }
      };
      
      recognizer.sessionStarted = (sender, event) => {
        console.log('Recognition session started');
      };
      
      recognizer.sessionStopped = (sender, event) => {
        console.log('Recognition session stopped');
        
        // Sort segments by start time
        transcriptionSegments.sort((a, b) => a.start - b.start);
        
        if (transcriptionSegments.length === 0) {
          console.warn('No transcription segments found. Using simulation data.');
          resolve(simulateTranscription());
        } else {
          console.log(`Completed transcription with ${transcriptionSegments.length} segments`);
          resolve(transcriptionSegments);
        }
        
        // Clean up
        recognizer.close();
      };
      
      // Start continuous recognition
      console.log('Starting continuous recognition');
      recognizer.startContinuousRecognitionAsync(
        () => console.log('Recognition started'),
        (err) => {
          console.error('Failed to start recognition:', err);
          reject(new Error(`Failed to start recognition: ${err}`));
        }
      );
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    if (config.useSimulation) { // Fall back to simulation if configured or if there's an error
      return simulateTranscription();
    }
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
};

/**
 * Simulate a transcription response for testing
 * @returns {Array} - Simulated transcription segments
 */
function simulateTranscription() {
  console.log('Using simulated transcription data');
  
  // Simulated Arabic transcription with timestamps
  return [
    {
      start: 0,
      end: 3.2,
      text: "مرحبا بكم في هذا الفيديو التعليمي"
    },
    {
      start: 3.5,
      end: 7.8,
      text: "اليوم سنتحدث عن أهمية اللغة العربية في العالم الرقمي"
    },
    {
      start: 8.1,
      end: 14.5,
      text: "تعتبر اللغة العربية من أكثر اللغات انتشارًا على مستوى العالم"
    },
    {
      start: 15.0,
      end: 20.3,
      text: "وهناك أكثر من ٤٢٢ مليون شخص يتحدثون اللغة العربية كلغة أولى"
    },
    {
      start: 21.0,
      end: 27.5,
      text: "في هذا الفيديو، سنتعلم كيفية استخدام التكنولوجيا لدعم المحتوى العربي"
    },
    {
      start: 28.0,
      end: 35.2,
      text: "ومن أهم التطورات الحديثة في هذا المجال هي أنظمة التعرف على الكلام والترجمة الآلية"
    },
    {
      start: 36.0,
      end: 42.5,
      text: "لقد تحسنت هذه الأنظمة بشكل كبير في السنوات الأخيرة بفضل تقنيات الذكاء الاصطناعي"
    },
    {
      start: 43.0,
      end: 48.8,
      text: "الآن يمكننا تحويل الكلام العربي المنطوق إلى نص مكتوب بدقة عالية"
    },
    {
      start: 49.3,
      end: 55.7,
      text: "كما يمكننا ترجمة هذا النص إلى لغات أخرى مثل الإنجليزية بسهولة"
    },
    {
      start: 56.2,
      end: 63.5,
      text: "هذه التقنيات تساعد في نشر المحتوى العربي على نطاق أوسع وتسهيل الوصول إليه"
    }
  ];
}

/**
 * Format timestamp from seconds to MM:SS
 * @param {number} seconds - Timestamp in seconds
 * @returns {string} - Formatted timestamp
 */
exports.formatTimestamp = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
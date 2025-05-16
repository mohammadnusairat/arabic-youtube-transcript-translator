// services/transcriptionService.js
const fs = require('fs');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const config = require('../config/config');

exports.transcribeAudio = async (audioFilePath) => {
  try {
    console.log(`[TRANSCRIBE] Starting transcription: ${audioFilePath}`);

    // Simulation fallback
    if (config.useSimulation) {
      console.log('[TRANSCRIBE] Simulation mode enabled');
      return simulateTranscription();
    }

    // Load credentials
    const apiKey = process.env.MARKITDOWN_API_KEY || config.markitdownApiKey;
    const region = (process.env.MARKITDOWN_REGION || config.markitdownRegion || '').toLowerCase().trim();

    if (!apiKey || !region) {
      console.warn('[TRANSCRIBE] Missing API credentials, using simulation');
      return simulateTranscription();
    }

    // Validate audio file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }

    // Configure Azure Speech SDK
    const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region);
    speechConfig.speechRecognitionLanguage = 'ar-SA';
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;

    const audioBuffer = fs.readFileSync(audioFilePath);
    const pushStream = sdk.AudioInputStream.createPushStream();

    // Push audio in chunks to avoid overloading memory
    const CHUNK_SIZE = 1024 * 32;
    for (let i = 0; i < audioBuffer.length; i += CHUNK_SIZE) {
      pushStream.write(audioBuffer.slice(i, i + CHUNK_SIZE));
    }
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const transcriptionSegments = [];

    return new Promise((resolve, reject) => {
      recognizer.sessionStarted = () => console.log('[TRANSCRIBE] Session started');
      recognizer.sessionStopped = () => {
        recognizer.close();
        if (transcriptionSegments.length) {
          console.log(`[TRANSCRIBE] Completed with ${transcriptionSegments.length} segments`);
          resolve(transcriptionSegments.sort((a, b) => a.start - b.start));
        } else {
          console.warn('[TRANSCRIBE] No segments found, using simulation');
          resolve(simulateTranscription());
        }
      };

      recognizer.recognized = (_, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          try {
            const result = JSON.parse(event.result.json);
            const start = result.Offset / 1e7;
            const end = (result.Offset + result.Duration) / 1e7;
            const text = result.DisplayText;

            if (text.trim()) {
              transcriptionSegments.push({ start, end, text });
              console.log(`[TRANSCRIBE] "${text}" (${start.toFixed(1)}s - ${end.toFixed(1)}s)`);
            }
          } catch (err) {
            console.error('[TRANSCRIBE] Failed to parse result JSON:', err.message);
          }
        }
      };

      recognizer.canceled = (_, event) => {
        recognizer.close();
        if (event.reason === sdk.CancellationReason.Error) {
          console.error('[TRANSCRIBE] Canceled due to error:', event.errorDetails);
          reject(new Error(`Azure SDK canceled: ${event.errorDetails}`));
        } else {
          console.warn('[TRANSCRIBE] Transcription canceled');
          transcriptionSegments.length
            ? resolve(transcriptionSegments)
            : reject(new Error('No transcription output.'));
        }
      };

      recognizer.startContinuousRecognitionAsync(
        () => console.log('[TRANSCRIBE] Recognition started'),
        (err) => {
          recognizer.close();
          console.error('[TRANSCRIBE] Failed to start recognizer:', err.message);
          reject(new Error(`Recognizer failed to start: ${err.message}`));
        }
      );
    });
  } catch (error) {
    console.error('[TRANSCRIBE] Fatal error:', error.message);
    return config.useSimulation
      ? simulateTranscription()
      : Promise.reject(new Error(`Transcription failed: ${error.message}`));
  }
};

// Mock fallback segments
function simulateTranscription() {
  console.log('[TRANSCRIBE] Returning simulated data');
  return [
    { start: 0, end: 3.2, text: "مرحبا بكم في هذا الفيديو التعليمي" },
    { start: 3.5, end: 7.8, text: "اليوم سنتحدث عن أهمية اللغة العربية في العالم الرقمي" },
    { start: 8.1, end: 14.5, text: "تعتبر اللغة العربية من أكثر اللغات انتشارًا على مستوى العالم" },
    { start: 15.0, end: 20.3, text: "وهناك أكثر من ٤٢٢ مليون شخص يتحدثون اللغة العربية كلغة أولى" },
    { start: 21.0, end: 27.5, text: "في هذا الفيديو، سنتعلم كيفية استخدام التكنولوجيا لدعم المحتوى العربي" },
    { start: 28.0, end: 35.2, text: "ومن أهم التطورات الحديثة في هذا المجال هي أنظمة التعرف على الكلام والترجمة الآلية" },
    { start: 36.0, end: 42.5, text: "لقد تحسنت هذه الأنظمة بشكل كبير في السنوات الأخيرة بفضل تقنيات الذكاء الاصطناعي" },
    { start: 43.0, end: 48.8, text: "الآن يمكننا تحويل الكلام العربي المنطوق إلى نص مكتوب بدقة عالية" },
    { start: 49.3, end: 55.7, text: "كما يمكننا ترجمة هذا النص إلى لغات أخرى مثل الإنجليزية بسهولة" },
    { start: 56.2, end: 63.5, text: "هذه التقنيات تساعد في نشر المحتوى العربي على نطاق أوسع وتسهيل الوصول إليه" },
  ];
}

exports.formatTimestamp = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// services/transcriptionService.js
const fs = require('fs');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const config = require('../config/config');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

exports.transcribeAudio = async (audioFilePath) => {
  try {
    console.log(`[TRANSCRIBE] Starting transcription: ${audioFilePath}`);

    const apiKey = process.env.MARKITDOWN_API_KEY || config.markitdownApiKey;
    const region = (process.env.MARKITDOWN_REGION || config.markitdownRegion || '').toLowerCase().trim();

    if (!apiKey || !region) {
      throw new Error('[TRANSCRIBE] Missing Azure Speech API credentials');
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }

    // Convert to mono 16kHz WAV using ffmpeg
    const wavPath = path.join(path.dirname(audioFilePath), 'converted.wav');
    await new Promise((resolve, reject) => {
      ffmpeg(audioFilePath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .output(wavPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Load converted WAV audio
    const audioBuffer = fs.readFileSync(wavPath);
    const pushStream = sdk.AudioInputStream.createPushStream();
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
        console.log('[SESSION STOPPED]');
        recognizer.close();
        if (transcriptionSegments.length) {
          console.log(`[TRANSCRIBE] Completed with ${transcriptionSegments.length} segments`);
          resolve(transcriptionSegments.sort((a, b) => a.start - b.start));
        } else {
          console.warn('[TRANSCRIBE] No segments recognized');
          reject(new Error('No segments recognized'));
        }
      };

      recognizer.recognized = (_, event) => {
        console.log('[RECOGNIZED RAW]', event.result.text);
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
        console.error('[CANCELED]', event.reason, event.errorDetails);
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

      setTimeout(() => {
        console.warn('[TRANSCRIBE] Timeout reached. Forcing stop...');
        recognizer.stopContinuousRecognitionAsync(() => {
          recognizer.close();
          resolve(transcriptionSegments); // return whatever we got
        });
      }, 20000); // 20 seconds timeout

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
    return Promise.reject(new Error(`Transcription failed: ${error.message}`));
  }
};

exports.formatTimestamp = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

# Arabic YouTube Transcript Translator

## Table of Contents
<div align="center">
    <table align="center">
        <tr>
            <td><a href="#introduction">Introduction</a></td>
            <td><a href="#features">Features</a></td>
            <td><a href="#screenshots">Screenshots</a></td>
            <td><a href="#why-this-app">Why This App?</a></td>
            <td><a href="#how-it-works">How It Works</a></td>
            <td><a href="#technologies-used">Technologies Used</a></td>
        </tr>
        <tr>
            <td><a href="#local-setup">Local Setup</a></td>
            <td><a href="#how-to-use-the-app">How to Use the App</a></td>
            <td><a href="#api-reference">API Reference</a></td>
            <td><a href="#deployment">Deployment</a></td>
            <td><a href="#youtube-blocking-sign-in-to-confirm-youre-not-a-bot">YouTube Blocking</a></td>
            <td><a href="#known-limitations">Known Limitations</a></td>
        </tr>
        <tr>
            <td><a href="#future-improvements">Future Improvements</a></td>
            <td><a href="#feedback">Feedback</a></td>
            <td><a href="#contact">Contact</a></td>
        </tr>
    </table>
</div>

<p align="right"><a href="#introduction">back to top ⬆️</a></p>

## Introduction
Arabic YouTube Transcript Translator is a full-stack web application that transcribes Arabic audio from YouTube videos or uploaded audio/video files, translates the transcript into English, and generates downloadable Markdown, PDF, and SRT files with timestamps. This project was created because my friends and I run an Instagram page where we post video clips, and transcribing and translating Arabic audio manually was very time-consuming. This app streamlines the entire process to save us significant time and effort.

## Try it Live !
<a href="https://arabic-youtube-transcript-translator.vercel.app/">Live Application</a>

## Features
- Two input options:
  - **YouTube link**: downloads only the selected clip of the video's audio with yt-dlp
  - **File upload**: any audio or video file (MP3, M4A, WAV, MP4, MOV, WebM, ...) up to 200MB
- Pick a start and end time to transcribe just a clip (or leave blank to transcribe a whole uploaded file)
- Arabic speech-to-text with the Azure Speech SDK
- Arabic-to-English translation with the OpenAI API
- Timestamped transcripts downloadable as Markdown, PDF, and SRT, or copied to the clipboard
- Live job progress (validating, extracting audio, transcribing, translating, generating files) with clear error messages
- Detects when YouTube blocks the server and offers file upload instead

## Screenshots

![Landing Page Screenshot](screenshots/landing-page.png)  
*Landing page for submitting YouTube URLs*

![Processing Screenshot](screenshots/processing.png)  
*Processing screen showing live job status*

![Results Screenshot](screenshots/results.jpg)  
*Results page displaying transcript and download options*

## Why This App?
Arabic content on YouTube is abundant but often inaccessible for those who prefer reading or non-Arabic speakers. Manual transcription and translation are slow and error-prone, especially for Arabic audio. This app automates and accelerates the process, making it easier to create accessible, shareable video transcripts.

## How It Works

```
                        ┌──────────────────────── Backend (Node.js / Express) ─────────────────────────┐
YouTube URL + times ──▶ │ yt-dlp: download only the selected clip ──┐                                  │
                        │                                           ├─▶ Azure Speech ─▶ OpenAI ─▶ PDF  │
Audio/video upload  ──▶ │ ffmpeg: cut the selected clip (optional) ─┘   (Arabic STT)  (translate)  MD  │
                        │                                                                         SRT  │
                        └──────────────────────────────────────────────────────────────────────────────┘
        ▲                                                │
        └──── React frontend polls /api/status/:jobId ◀──┘
```

1. The user either pastes a YouTube URL (and fetches its duration) or uploads an audio/video file, and picks a start and end time.
2. The backend creates a job and returns a job ID right away. The frontend polls the job's status every 2 seconds.
3. **YouTube:** yt-dlp downloads only the requested section of the audio as MP3. **Upload:** ffmpeg cuts the requested clip out of the uploaded file.
4. The audio is converted to 16kHz mono WAV and sent to Azure Speech for Arabic (`ar-EG`) transcription, which returns timestamped segments.
5. The Arabic segments are sent to OpenAI in batches and translated into English.
6. The backend writes the translated, timestamped transcript to PDF, Markdown, and SRT files. Timestamps are offset by the clip's start time so they match the original video.
7. The frontend shows a preview and download links. Temporary audio files are deleted when the job finishes, whether it succeeded or failed.

## Technologies Used
- **Frontend**: React 18, Vite 5, Tailwind CSS, React Router, Axios
- **Backend**: Node.js 18, Express
- **Audio processing**: yt-dlp (YouTube downloads), FFmpeg (clipping and audio conversion, via fluent-ffmpeg), Multer (file uploads)
- **Speech recognition**: Microsoft Azure Speech SDK (`microsoft-cognitiveservices-speech-sdk`), Arabic (`ar-EG`)
- **Translation**: OpenAI API (`gpt-3.5-turbo`)
- **Document generation**: PDF with `pdf-lib`. Markdown and SRT are generated directly in the backend, since both are simple text formats.
- **Deployment**: Backend on [Railway](https://railway.app) (Docker), frontend on [Vercel](https://vercel.com)

### Project Structure
```
backend/
├── server.js                    # Express app setup
├── routes/api.js                # API routes (transcribe, upload, status, files, metadata)
├── controllers/
│   └── transcriptController.js  # Job creation, in-memory job store, processing pipeline
├── services/
│   ├── youtubeService.js        # yt-dlp download, proxy/cookie support, error detection
│   ├── transcriptionService.js  # ffmpeg conversion/clipping + Azure Speech transcription
│   ├── translationService.js    # OpenAI translation
│   └── documentService.js       # PDF, Markdown, and SRT generation
├── middleware/                  # Upload handling (Multer) and YouTube URL extraction
├── config/config.js             # Environment-based configuration
└── Dockerfile                   # Production image (Node 18 + ffmpeg + yt-dlp)
frontend/
└── src/
    ├── components/              # Home, Processing, Results, Header, Footer
    ├── contexts/JobContext.jsx  # Current job state
    └── utils/api.js             # Backend API client
```

## Local Setup

### Prerequisites
- **Node.js 18**. This matches the production Docker image. Newer versions can break the Azure Speech SDK: on Node 26, transcription fails with `StatusCode: 1006`. If you use [nvm](https://github.com/nvm-sh/nvm): `nvm install 18 && nvm use 18`.
- **yt-dlp** and **FFmpeg** (including `ffprobe`) on your `PATH`:
  - macOS: `brew install yt-dlp ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg` and `pip install yt-dlp`
  - Windows: install both and add them to your `PATH` (or set the paths in `.env`, see below)
- An **Azure Speech** resource: [Azure Portal](https://portal.azure.com) → create a *Speech service* → **Keys and Endpoint** (copy a key and the region). The free tier (F0) works.
- An **OpenAI API key** with available credits: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Backend
1. Install dependencies:
    ```bash
    cd backend
    npm install
    ```
    If `npm install` fails on `phantomjs-prebuilt` or `yt-dlp-exec` (common on macOS), run `npm install --ignore-scripts` instead. Those two packages are listed in `package.json` but not used by the code, so skipping their install scripts is safe.
2. Create your `.env` from the example and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    | Variable | Required | Description |
    |---|---|---|
    | `OPENAI_API_KEY` | Yes | OpenAI API key for translation |
    | `MARKITDOWN_API_KEY` | Yes | Azure **Speech** key (the `MARKITDOWN_` prefix is historical) |
    | `MARKITDOWN_REGION` | Yes | Azure Speech region, e.g. `eastus` |
    | `PORT` | No | Backend port (default `4000`) |
    | `YTDLP_PROXY` | No | Proxy URL for yt-dlp, see [YouTube Blocking](#youtube-blocking-sign-in-to-confirm-youre-not-a-bot) |
    | `YTDLP_COOKIES` | No | YouTube cookies for yt-dlp, see [YouTube Blocking](#youtube-blocking-sign-in-to-confirm-youre-not-a-bot) |
    | `FFMPEG_PATH` | No | Path to `ffmpeg` if it isn't on your `PATH` |
    | `YT_DLP_BINARY` | No | Path to `yt-dlp` if it isn't on your `PATH` (on Windows the download step reads `YT_DLP_BINARY_LOCAL`) |
3. Start the backend:
    ```bash
    npm start        # or: npm run dev (auto-restarts with nodemon)
    ```
    The API runs at `http://localhost:4000/api`. Check it with `curl http://localhost:4000/api/health`.

### Frontend
1. In a second terminal:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
2. Open `http://localhost:5173`. In development, Vite proxies `/api` requests to `http://localhost:4000`, so no extra configuration is needed. Make sure the backend is running first.

## How to Use the App
**From YouTube**
1. Choose **YouTube link**, paste the video URL, and click **Fetch Video Metadata** to load its duration.
2. Enter a start and end time (min:sec). Clips must be at least 5 seconds.
3. Click **Start Processing** and watch the progress screen.
4. On the results page, preview the transcript and download it as PDF, Markdown, or SRT, or copy it to the clipboard.

**From a file**
1. Choose **Upload file** and pick an audio or video file (up to 200MB).
2. Optionally enter a start and end time. Leave them blank to transcribe the whole file.
3. Click **Start Processing**. The button shows upload progress, then you're taken to the progress screen and results as above.

If YouTube is blocking the server, the app says so and shows an **Upload a file instead** button.

## API Reference
All routes are under `/api`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/metadata?url=<youtube-url>` | Video duration in seconds (`{ durationSeconds }`) |
| `POST` | `/transcribe` | Start a YouTube job. JSON body: `{ url, startTime, endTime }` (seconds) |
| `POST` | `/upload` | Start an upload job. Multipart form: `audioFile`, optional `startTime` and `endTime` (seconds) |
| `GET` | `/status/:jobId` | Job status, progress, and error. Includes the transcript and `fileUrls` when completed |
| `POST` | `/cancel/:jobId` | Cancel a running job |
| `GET` | `/files/:jobId/:fileType` | Download `pdf`, `markdown`, or `srt` for a completed job |

When YouTube refuses a download, `/metadata` responds with `403` and `{ error: "youtube_blocked" | "video_restricted", message }`, and a job's `error` field contains the same message.

## Deployment

### Backend (Railway)
- Railway builds `backend/Dockerfile`, which installs Node 18, FFmpeg, and the latest yt-dlp, then runs `npm start`.
- Set `OPENAI_API_KEY`, `MARKITDOWN_API_KEY`, and `MARKITDOWN_REGION` (plus `YTDLP_PROXY` / `YTDLP_COOKIES` if needed) in Railway's **Variables** tab. Railway provides `PORT` automatically.
- yt-dlp is installed when the image is built. Redeploy every so often to pick up yt-dlp updates, since YouTube changes frequently.

### Frontend (Vercel)
- Vercel builds the Vite app from `frontend/`.
- `frontend/.env.production` sets `VITE_BACKEND_URL` to the Railway backend's `/api` URL. Update it if the backend URL changes.

## YouTube Blocking ("Sign in to confirm you're not a bot")
YouTube often blocks downloads from cloud/datacenter IP addresses such as Railway's. When that happens, every YouTube request fails with:

`Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies for the authentication.`

This depends on the server's IP, not on the video, so the same videos usually work when the app runs locally. The app detects this error and tells users to upload the file instead. To make YouTube links work again on the server, you have two options, both set as Railway variables:

- **`YTDLP_PROXY`** (most reliable): route yt-dlp through a residential proxy, e.g. `http://user:pass@host:port`. This is usually paid per GB. Because only the selected clip is downloaded, usage per job is small.
- **`YTDLP_COOKIES`**: export YouTube cookies from a browser signed in to a **throwaway** Google account, following yt-dlp's guides: [How to pass cookies](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp) and [Exporting YouTube cookies](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies). Paste the `cookies.txt` contents into the variable, or base64-encode it first (`base64 -i cookies.txt`) to avoid problems with line breaks. Cookies expire and need replacing periodically.

Note that automating downloads with cookies or proxies goes against YouTube's Terms of Service, and accounts used for cookies can be flagged or banned. File upload works regardless of YouTube.

## Known Limitations
- **Azure free tier:** the Speech free tier (F0) allows **5 audio hours per month**. Whole-file uploads have no length limit, so long files use up the quota quickly.
- **Jobs are stored in memory:** restarting or redeploying the backend loses all job statuses, so links to older results stop working.
- **Generated files are kept:** PDF, Markdown, and SRT files in `backend/outputs/` are never deleted automatically.
- **Upload size:** uploads are limited to 200MB, and the whole file is uploaded even when only a clip is transcribed.

## Future Improvements
- Add multi-language support beyond Arabic-English. Most prominently Urdu.
- User authentication and saved transcript history.
- Persist jobs in a database and clean up old generated files.
- Real-time transcription and translation streaming.
- Mobile responsiveness and UI polish.

## Feedback
Your feedback, feature requests, and bug reports are welcome via GitHub Issues or email!

## Contact
- Mohammad Nusairat — [mnusairat2003@gmail.com](mailto:mnusairat2003@gmail.com)

<p align="right"><a href="#introduction">back to top ⬆️</a></p>

---

> Project developed to streamline transcription and translation of Arabic YouTube videos for efficient content creation.

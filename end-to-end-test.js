// End-to-end test for Arabic YouTube Video Transcription and Translation
// Using built-in fetch API

// API endpoint
const API_BASE = 'http://localhost:4000/api';

// Test URL
const ARABIC_VIDEO_URL = 'https://youtu.be/lhbEO0EqH5c';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runEnd2EndTest() {
    console.log('======= RUNNING END-TO-END TEST =======');
    console.log('Testing with Arabic video:', ARABIC_VIDEO_URL);
    
    try {
        // Step 1: Submit transcription job
        console.log('\nSTEP 1: Submitting transcription job...');
        const submitResponse = await fetch(`${API_BASE}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: ARABIC_VIDEO_URL
        });
        
        const submitResult = await submitResponse.json();
        console.log('Submit response:', submitResult);
        
        if (!submitResult.jobId) {
            throw new Error(`Failed to create job: ${JSON.stringify(submitResult)}`);
        }
        
        const jobId = submitResult.jobId;
        console.log('✅ Job created with ID:', jobId);
        
        // Step 2: Poll for job status until complete or failed
        console.log('\nSTEP 2: Polling for job status...');
        let jobCompleted = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 30; // 15 minutes max (30 * 30s)
        
        while (!jobCompleted && attempts < MAX_ATTEMPTS) {
            attempts++;
            console.log(`Polling attempt ${attempts}...`);
            
            const statusResponse = await fetch(`${API_BASE}/status/${jobId}`);
            const jobStatus = await statusResponse.json();
            
            console.log(`Job status: ${jobStatus.status}, Progress: ${jobStatus.progress}%`);
            console.log(`Current stage: ${jobStatus.message || 'Processing'}`);
            
            if (jobStatus.status === 'COMPLETED') {
                jobCompleted = true;
                console.log('✅ Job completed successfully!');
            } else if (jobStatus.status === 'FAILED') {
                throw new Error(`Job failed: ${jobStatus.error}`);
            } else {
                // Wait 30 seconds before polling again
                console.log('Waiting 30 seconds before next poll...');
                await sleep(30000);
            }
        }
        
        if (!jobCompleted) {
            throw new Error('Job timed out after 15 minutes');
        }
        
        // Step 3: Get job results
        console.log('\nSTEP 3: Retrieving job results...');
        const resultsResponse = await fetch(`${API_BASE}/jobs/${jobId}/results`);
        const results = await resultsResponse.json();
        
        console.log('Job Title:', results.title);
        console.log('\nArabic Transcription (first 300 characters):');
        console.log(results.transcription.substring(0, 300) + '...');
        
        console.log('\nEnglish Translation (first 300 characters):');
        console.log(results.translation.substring(0, 300) + '...');
        
        console.log('\nOutput Files:');
        console.log('PDF URL:', results.pdfUrl);
        console.log('Markdown URL:', results.markdownUrl);
        
        console.log('\n✅ END-TO-END TEST COMPLETED SUCCESSFULLY!');
        return true;
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        return false;
    }
}

// Run the test
console.log('Starting end-to-end test for Arabic YouTube transcription and translation...');
runEnd2EndTest().then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
}).catch(err => {
    console.error('Fatal error:', err);
});

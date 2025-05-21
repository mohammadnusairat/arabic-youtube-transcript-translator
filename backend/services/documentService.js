// services/documentService.js
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fontkit = require('fontkit');
const { formatTimestamp } = require('./transcriptionService');
const config = require('../config/config');

/**
 * Sanitize a string for safe use as a filename.
 * @param {string} input - Original string (e.g., video title)
 * @returns {string} - Sanitized safe filename
 */
function sanitizeTitle(input) {
  return input
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ')                   // Collapse multiple spaces
    .trim()                                 // Trim leading/trailing spaces
    .substring(0, 100);                     // Limit length (optional)
}

/**
 * Splits a long string into an array of strings with a max character length per line.
 * @param {string} text - The input string.
 * @param {number} maxLength - Max characters per line.
 * @returns {string[]} - Array of strings.
 */
function splitText(text, maxLength) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }

  return lines;
}

/**
 * Generate a PDF document from transcription segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @param {string} outputPath - Path to save the PDF
 * @param {number} startTime - start time offset in seconds (default 0)
 * @returns {Promise<string>} - Path to the generated PDF
 */
exports.generatePDF = async (segments, title, outputPath, startTime = 0) => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit); // ✅ FIXED: Register fontkit

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let { width, height } = page.getSize();
  let y = height - 40;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica); // fallback to a standard font

  const fontSize = 12;
  const lineHeight = 18;

  for (const segment of segments) {
    // Add startTime to get absolute timestamps
    const start = segment.start + startTime;
    const end = segment.end + startTime;

    // // Ensure timestamps are not negative
    // const safeStart = start < 0 ? 0 : start;
    // const safeEnd = end < 0 ? 0 : end;

    const formatTime = (seconds) => {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };
    const timestamp = `[${formatTime(start)} - ${formatTime(end)}]`;
    const line = `${timestamp} ${segment.text}`;
    const lines = splitText(line, 90);

    for (const text of lines) {
      if (y < 40) {
        page = pdfDoc.addPage([595.28, 841.89]);
        ({ height } = page.getSize());
        y = height - 40;
      }
      page.drawText(text, { x: 40, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  await fs.outputFile(outputPath, pdfBytes);
  console.log(`✅ PDF saved to ${outputPath}`);
};

/**
 * Generate a Markdown document from transcription segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @param {string} outputPath - Path to save the Markdown file
 * @param {number} startTime - start time offset in seconds (default 0)
 * @returns {Promise<string>} - Path to the generated markdown file
 */
exports.generateMarkdown = async (segments, title, outputPath, startTime = 0) => {
  try {
    console.log(`Generating Markdown document to ${outputPath}`);
    
    const sanitizedTitle = sanitizeTitle(title);

    // Create markdown content
    let markdown = `# ${sanitizedTitle}\n\n## English Transcript with Timestamps\n\n`;
    
    // Add each segment
    for (const segment of segments) {
      const start = (segment.start + startTime).toFixed(1);
      const end = (segment.end + startTime).toFixed(1);
      const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
      };
      const timestamp = `[${formatTime(start)} - ${formatTime(end)}]`;
      markdown += `**${timestamp}** ${segment.text}\n\n`;
    }
    
    // Save the markdown file
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, markdown);
    
    console.log(`Markdown document saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating Markdown:', error);
    throw new Error(`Failed to generate Markdown: ${error.message}`);
  }
};

/**
 * Generate HTML preview for transcript segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @returns {string} - HTML content
 */
exports.generateHtmlPreview = (segments, title, startTime = 0) => {
  try {
    const sanitizedTitle = sanitizeTitle(title);
    let html = `<h1>${sanitizedTitle}</h1><div class="transcript">`;
    
    for (const segment of segments) {
      const adjustedStart = segment.start + startTime;
      const timestamp = formatTimestamp(adjustedStart);
      html += `
        <div class="transcript-segment">
          <span class="timestamp">[${timestamp}]</span>
          <span class="text">${segment.text}</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  } catch (error) {
    console.error('Error generating HTML preview:', error);
    return `<p>Error generating preview: ${error.message}</p>`;
  }
};

/**
 * Generate SRT file for transcript segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @param {string} outputPath - Path to save the SRT
 * @param {number} startTime - start time offset in seconds (default 0)
 * @returns {Promise<string>} - Path to the generated SRT file
 */
exports.generateSRT = async (segments, title, outputPath, startTime = 0) => {
  try {
    console.log(`Generating SRT to ${outputPath}`);

    const formatTime = (seconds) => {
      const date = new Date(0);
      date.setSeconds(seconds);
      return date.toISOString().substr(11, 8) + ',000'; // HH:MM:SS,000 format
    };

    const srtLines = segments.map((seg, index) => {
      const start = formatTime(seg.start + startTime);
      const end = formatTime(seg.end + startTime);
      return `${index + 1}\n${start} --> ${end}\n${seg.text}\n`;
    });

    const srtContent = srtLines.join('\n');

    await fs.outputFile(outputPath, srtContent);
    console.log(`✅ SRT saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating SRT:', error);
    throw new Error(`Failed to generate SRT: ${error.message}`);
  }
};
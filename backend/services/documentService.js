// services/documentService.js
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { formatTimestamp } = require('./transcriptionService');
const config = require('../config/config');

/**
 * Generate a PDF document from transcription segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
exports.generatePDF = async (segments, title, outputPath) => {
  try {
    console.log(`Generating PDF document to ${outputPath}`);

    // Load a font that supports Arabic
    const fontPath = path.join(config.baseDir, 'fonts', 'Amiri_Quran', 'AmiriQuran-Regular.ttf');
    if (!fs.existsSync(fontPath)) {
      throw new Error(`Font not found at: ${fontPath}`);
    }
    const fontBytes = fs.readFileSync(fontPath);

    const pdfDoc = await PDFDocument.create();
    const arabicFont = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;
    const lineHeight = 20;

    // Draw title
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: 18,
      font: arabicFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 2;

    // Subtitle
    page.drawText('English Transcript with Timestamps', {
      x: margin,
      y: yPosition,
      size: 14,
      font: arabicFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 2;

    for (const segment of segments) {
      const timestamp = formatTimestamp(segment.start);

      const text = `[${timestamp}] ${segment.text}`;

      page.drawText(text, {
        x: margin,
        y: yPosition,
        size: 12,
        font: arabicFont,
        color: rgb(0, 0, 0)
      });

      yPosition -= lineHeight;

      if (yPosition < margin) {
        const newPage = pdfDoc.addPage();
        page = newPage;
        yPosition = height - margin;
      }
    }

    const pdfBytes = await pdfDoc.save();
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`PDF document saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

/**
 * Generate a Markdown document from transcription segments
 * @param {Array} segments - Transcription segments with timestamps
 * @param {string} title - Video title
 * @param {string} outputPath - Path to save the Markdown file
 * @returns {Promise<string>} - Path to the generated markdown file
 */
exports.generateMarkdown = async (segments, title, outputPath) => {
  try {
    console.log(`Generating Markdown document to ${outputPath}`);
    
    // Create markdown content
    let markdown = `# ${title}\n\n## English Transcript with Timestamps\n\n`;
    
    // Add each segment
    for (const segment of segments) {
      const timestamp = formatTimestamp(segment.start);
      markdown += `**[${timestamp}]** ${segment.text}\n\n`;
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
exports.generateHtmlPreview = (segments, title) => {
  try {
    let html = `<h1>${title}</h1><div class="transcript">`;
    
    for (const segment of segments) {
      const timestamp = formatTimestamp(segment.start);
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
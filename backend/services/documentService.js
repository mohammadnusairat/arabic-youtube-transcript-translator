// services/documentService.js
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const markdownpdf = require('markdown-pdf');
const { formatTimestamp } = require('./transcriptionService');

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
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Add a page
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;
    const lineHeight = 15;
    
    // Add title
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 2;
    
    // Add timestamp and heading
    page.drawText('English Transcript with Timestamps', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight * 2;
    
    // Add each segment
    for (const segment of segments) {
      const timestamp = formatTimestamp(segment.start);
      
      // Add timestamp
      page.drawText(`[${timestamp}]`, {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.7)
      });
      
      // Add translation text
      const text = segment.text;
      page.drawText(text, {
        x: margin + 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      yPosition -= lineHeight * 1.5;
      
      // Add a new page if needed
      if (yPosition < margin) {
        const newPage = pdfDoc.addPage();
        yPosition = height - margin;
      }
    }
    
    // Save the PDF
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
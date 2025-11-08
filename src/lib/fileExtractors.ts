/**
 * Client-side text extraction for PDF and DOCX files
 * Runs in the browser before sending to the server
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker - use the bundled worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract text from PDF file
 */
export async function extractPDF(file: File): Promise<string> {
  try {
    console.log('[PDF] Starting extraction for:', file.name, 'Size:', file.size, 'bytes');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[PDF] ArrayBuffer loaded, length:', arrayBuffer.byteLength);

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('[PDF] PDF loaded successfully, pages:', pdf.numPages);
    const numPages = pdf.numPages;

    const textPages: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textPages.push(pageText);
      console.log(`[PDF] Extracted page ${pageNum}/${numPages}, text length:`, pageText.length);
    }

    const fullText = textPages.join('\n\n').trim();
    console.log('[PDF] Total extracted text length:', fullText.length);

    if (!fullText || fullText.length < 10) {
      throw new Error('Could not extract text from PDF. The file might be an image-based PDF.');
    }

    return fullText;
  } catch (error) {
    console.error('[PDF] Extraction failed with error:', error);
    if (error instanceof Error) {
      console.error('[PDF] Error name:', error.name);
      console.error('[PDF] Error message:', error.message);
      console.error('[PDF] Error stack:', error.stack);
    }
    throw new Error(
      error instanceof Error && error.message.includes('image-based')
        ? error.message
        : `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();

    if (!text || text.length < 10) {
      throw new Error('Could not extract text from DOCX. The file might be empty or corrupted.');
    }

    return text;
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    throw new Error('Failed to extract text from DOCX. Please ensure the file is a valid Word document.');
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTXT(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.trim();
  } catch (error) {
    console.error('TXT extraction failed:', error);
    throw new Error('Failed to read text file.');
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split('.').pop();

  switch (extension) {
    case 'pdf':
      return await extractPDF(file);
    case 'docx':
    case 'doc':
      return await extractDOCX(file);
    case 'txt':
      return await extractTXT(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
}

/**
 * Extract text from multiple files
 */
export async function extractTextFromFiles(
  files: File[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ text: string; errors: Array<{ filename: string; error: string }> }> {
  const texts: string[] = [];
  const errors: Array<{ filename: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Safety check: ensure file exists
    if (!file) {
      errors.push({ filename: 'Unknown', error: 'File is undefined' });
      continue;
    }

    onProgress?.(i + 1, files.length, file.name);

    try {
      const text = await extractTextFromFile(file);
      texts.push(`\n\n--- Content from ${file.name} ---\n\n${text}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ filename: file.name, error: errorMessage });
    }
  }

  return {
    text: texts.join('\n\n').trim(),
    errors,
  };
}

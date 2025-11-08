/**
 * Text extraction utilities for various file formats and URLs
 * Supports: TXT and URL content fetching
 * Note: PDF/DOCX extraction is not supported in edge runtime - use copy-paste or URLs instead
 */

/**
 * Extract text from PDF file buffer
 * Note: PDF text extraction is not available in edge runtime
 */
export async function extractPDF(buffer: ArrayBuffer): Promise<string> {
  throw new Error('PDF text extraction is not supported. Please copy and paste the text content, or provide a URL to the document.');
}

/**
 * Extract text from DOCX file buffer
 * Note: DOCX text extraction is not available in edge runtime
 */
export async function extractDOCX(buffer: ArrayBuffer): Promise<string> {
  throw new Error('DOCX text extraction is not supported. Please copy and paste the text content, or provide a URL to the document.');
}

/**
 * Extract text from plain text file buffer
 */
export function extractTXT(buffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer).trim();
  } catch (error) {
    console.error('txt_extraction_failed', error);
    throw new Error('Failed to extract text from TXT file');
  }
}

/**
 * Fetch and extract text content from URL
 * Strips HTML tags and returns clean text
 */
export async function fetchURL(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FlashStudy/1.0 (Content Extraction Bot)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('URL does not point to text content');
    }

    const html = await response.text();

    // Strip HTML tags and clean up
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!text || text.length < 50) {
      throw new Error('Extracted text is too short or empty');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('URL fetch timed out (30s limit)');
      }
      throw error;
    }
    throw new Error('Failed to fetch URL content');
  }
}

/**
 * Extract text from file based on extension
 */
export async function extractFile(filename: string, buffer: ArrayBuffer): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      throw new Error(`PDF files are not supported. Please copy and paste the text content instead, or provide a URL to an online version of the document.`);
    case 'docx':
    case 'doc':
      throw new Error(`Word documents are not supported. Please copy and paste the text content instead, or save as .txt and upload.`);
    case 'txt':
      return extractTXT(buffer);
    default:
      throw new Error(`Unsupported file type: .${ext}. Only .txt files are supported. Please copy and paste your content or provide a URL instead.`);
  }
}

/**
 * Result type for extraction operations
 */
export interface ExtractionResult {
  text: string;
  metadata: {
    source: 'file' | 'url' | 'text';
    filename?: string;
    url?: string;
    wordCount: number;
    charCount: number;
  };
}

/**
 * Extract text with metadata
 */
export async function extractWithMetadata(
  source: { type: 'file'; filename: string; buffer: ArrayBuffer } |
          { type: 'url'; url: string } |
          { type: 'text'; content: string }
): Promise<ExtractionResult> {
  let text: string;
  let metadata: ExtractionResult['metadata'];

  if (source.type === 'file') {
    text = await extractFile(source.filename, source.buffer);
    metadata = {
      source: 'file',
      filename: source.filename,
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    };
  } else if (source.type === 'url') {
    text = await fetchURL(source.url);
    metadata = {
      source: 'url',
      url: source.url,
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    };
  } else {
    text = source.content;
    metadata = {
      source: 'text',
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    };
  }

  return { text, metadata };
}

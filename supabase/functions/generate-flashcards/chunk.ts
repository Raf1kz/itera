/**
 * Deterministic text chunking for token budget management
 * Splits text by paragraphs while respecting size limits
 */

export interface ChunkOptions {
  /** Target characters per chunk (soft limit) */
  targetChars?: number;
  /** Maximum number of chunks to generate */
  maxChunks?: number;
}

/**
 * Chunk text by paragraphs with deterministic behavior
 * - Splits on double newlines (paragraph boundaries)
 * - Attempts to keep chunks under targetChars
 * - Never exceeds maxChunks
 * - Deterministic: same input = same output
 *
 * @param text Input text to chunk
 * @param targetChars Target characters per chunk (default 8000)
 * @param maxChunks Maximum chunks to generate (default 10)
 * @returns Array of text chunks
 */
export function chunkByParagraphs(text: string, targetChars = 8000, maxChunks = 10): string[] {
  // Normalize: remove carriage returns, trim
  const clean = text.replace(/\r/g, '').trim();

  // Handle empty or small inputs
  if (clean.length === 0) return [];
  if (clean.length <= targetChars) return [clean];

  // Split by paragraph boundaries (2+ newlines)
  const paragraphs = clean.split(/\n{2,}/);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const combined = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;

    // If adding this paragraph exceeds target, finalize current chunk
    if (combined.length > targetChars) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;

      // Stop if we've reached max chunks
      if (chunks.length >= maxChunks) break;
    } else {
      currentChunk = combined;
    }
  }

  // Add remaining content if we haven't hit max chunks
  if (currentChunk && chunks.length < maxChunks) {
    chunks.push(currentChunk);
  }

  // Ensure we never exceed maxChunks
  return chunks.slice(0, maxChunks);
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total budget for a chunked text
 */
export function calculateBudget(chunks: string[]): {
  totalChars: number;
  totalTokens: number;
  chunkCount: number;
} {
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  return {
    totalChars,
    totalTokens: estimateTokens(chunks.join('')),
    chunkCount: chunks.length,
  };
}

/**
 * Simple hash function for paragraph identification
 */
export function hashString(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export interface ParagraphWithMetadata {
  text: string;
  hash: string;
  index: number;
}

/**
 * Split text into paragraphs with metadata for concept clustering
 */
export function extractParagraphsWithMetadata(text: string): ParagraphWithMetadata[] {
  const clean = text.replace(/\r/g, '').trim();
  if (clean.length === 0) return [];

  const paragraphs = clean.split(/\n{2,}/);

  return paragraphs
    .filter((p) => p.trim().length > 0)
    .map((p, index) => ({
      text: p.trim(),
      hash: hashString(p.trim()),
      index,
    }));
}

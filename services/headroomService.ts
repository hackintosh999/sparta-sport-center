import { HeadroomClient, compress, HeadroomError } from 'headroom-ai';

const HEADROOM_BASE_URL = process.env.HEADROOM_BASE_URL || 'http://localhost:8787';
const HEADROOM_API_KEY = process.env.HEADROOM_API_KEY || '';

export interface CompressionStats {
  originalTokens?: number;
  compressedTokens?: number;
  tokensSaved?: number;
  savingsPercentage?: string;
  isCompressed: boolean;
}

export interface CompressMessagesResult<T = any> {
  messages: T[];
  stats: CompressionStats;
}

// Initialize Headroom Client instance
export const headroomClient = new HeadroomClient({
  baseUrl: HEADROOM_BASE_URL,
  apiKey: HEADROOM_API_KEY || undefined,
});

/**
 * Checks if the local or remote Headroom proxy server is online and healthy.
 */
export async function checkHeadroomHealth(): Promise<{ healthy: boolean; details?: any }> {
  try {
    const health = await headroomClient.health();
    return { healthy: health?.status === 'healthy', details: health };
  } catch (error: any) {
    return { healthy: false, details: error?.message || 'Headroom proxy offline' };
  }
}

/**
 * Safely compresses input prompt messages using Headroom AI.
 * If Headroom proxy is unreachable or compression fails, it gracefully falls back to original messages.
 */
export async function compressPromptMessages<T = any>(
  messages: T[],
  options: { model?: string; tokenBudget?: number } = {}
): Promise<CompressMessagesResult<T>> {
  if (!messages || messages.length === 0) {
    return {
      messages: [],
      stats: { isCompressed: false, tokensSaved: 0 }
    };
  }

  try {
    const result = await compress(messages, {
      baseUrl: HEADROOM_BASE_URL,
      apiKey: HEADROOM_API_KEY || undefined,
      model: options.model,
      tokenBudget: options.tokenBudget,
    });

    const originalTokens = result.tokensBefore || 0;
    const compressedTokens = result.tokensAfter || 0;
    const tokensSaved = result.tokensSaved || Math.max(0, originalTokens - compressedTokens);
    const savingsPct = originalTokens > 0 ? ((tokensSaved / originalTokens) * 100).toFixed(1) + '%' : '0%';

    console.log(`[Headroom AI] Compressed messages: ${originalTokens} -> ${compressedTokens} tokens (${savingsPct} saved)`);

    return {
      messages: (result.messages as T[]) || messages,
      stats: {
        originalTokens,
        compressedTokens,
        tokensSaved,
        savingsPercentage: savingsPct,
        isCompressed: result.compressed || false
      }
    };
  } catch (error: any) {
    console.warn('[Headroom AI] Proxy compression fallback (passing uncompressed messages):', error?.message || error);
    return {
      messages,
      stats: {
        isCompressed: false,
        tokensSaved: 0
      }
    };
  }
}

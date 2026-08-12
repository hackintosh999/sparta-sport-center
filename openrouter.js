/**
 * OpenRouter AI Client Helper (Token Optimized)
 * Uses max_tokens limiting and cost-efficient models for maximum token economy.
 */

import { compress } from 'headroom-ai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const HEADROOM_BASE_URL = process.env.HEADROOM_BASE_URL || 'http://localhost:8787';

export async function queryOpenRouter(
  prompt,
  model = 'openai/gpt-4o-mini',
  maxTokens = 500,
  systemPrompt = null
) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing in environment variables');
  }

  let messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Optional Headroom AI Context Compression
  try {
    const compResult = await compress(messages, { baseUrl: HEADROOM_BASE_URL });
    if (compResult && compResult.messages) {
      messages = compResult.messages;
      console.log(`[Headroom AI] OpenRouter prompt compressed (${compResult.tokensSaved || 0} tokens saved)`);
    }
  } catch (err) {
    // Graceful fallback to uncompressed messages if headroom proxy is offline
    console.debug('[Headroom AI] Proxy not available, continuing with original prompt:', err.message);
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/ruvnet/ruflo',
      'X-Title': 'Ruflo OpenRouter Agent',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// CLI Direct Execution Test
if (process.argv[1] && process.argv[1].endsWith('openrouter.js')) {
  const args = process.argv.slice(2);
  const prompt = args[0] || 'Explain token economy in multi-agent AI systems in 2 concise sentences.';
  const model = args[1] || 'openai/gpt-4o-mini';

  console.log(`[OpenRouter] Querying '${model}' (max_tokens: 500)...`);
  queryOpenRouter(prompt, model, 500)
    .then((reply) => {
      console.log('\n--- OpenRouter Response ---');
      console.log(reply);
    })
    .catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

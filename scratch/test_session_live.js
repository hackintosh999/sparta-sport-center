import { HeadroomClient } from 'headroom-ai';

async function testLiveSession() {
  console.log('=== Headroom Live Session Verification Test ===');

  const client = new HeadroomClient({
    baseUrl: 'http://127.0.0.1:8787',
  });

  const heavyPrompt = `
  SYSTEM LOG RECORD #1001:
  2026-08-10 15:40:00 [DEBUG] Initializing database connection pool...
  2026-08-10 15:40:00 [DEBUG] Initializing database connection pool...
  2026-08-10 15:40:00 [DEBUG] Initializing database connection pool...
  2026-08-10 15:40:01 [INFO] Connected to Supabase DB at postgresql://user:pass@localhost:5432/sparta
  2026-08-10 15:40:02 [INFO] Connected to Supabase DB at postgresql://user:pass@localhost:5432/sparta
  
  CONTEXT DATA:
  {"app": "Sparta Sports Center", "version": "1.0.0", "status": "active", "config": {"debug": true, "env": "development", "env": "development"}}
  {"app": "Sparta Sports Center", "version": "1.0.0", "status": "active", "config": {"debug": true, "env": "development", "env": "development"}}

  USER QUESTION: Summarize the current system state.
  `;

  for (let i = 1; i <= 3; i++) {
    console.log(`\n[Request #${i}] Sending live request through Headroom Proxy...`);
    try {
      const res = await client.chat.completions.simulate({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a sports center system diagnostic bot. System OK. System OK.' },
          { role: 'user', content: heavyPrompt }
        ]
      });

      console.log(`  -> Tokens Before: ${res.tokensBefore}`);
      console.log(`  -> Tokens After:  ${res.tokensAfter}`);
      console.log(`  -> Tokens Saved:  ${res.tokensSaved}`);
    } catch (err) {
      console.error(`  -> Error in request #${i}:`, err.message);
    }
  }

  console.log('\n=== Live Session Test Completed ===');
}

testLiveSession();

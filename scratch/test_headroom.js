import { HeadroomClient } from 'headroom-ai';

async function testHeadroom() {
  console.log('--- Testing Headroom AI Proxy Agent Integration ---');

  const client = new HeadroomClient({
    baseUrl: 'http://127.0.0.1:8787',
  });

  const messages = [
    {
      role: 'system',
      content: 'You are an assistant for Sparta Sports Center. System status: OK. System status: OK. System status: OK.'
    },
    {
      role: 'user',
      content: `Analyze logs:
2026-08-10 15:30:00 INFO [UserService] Fetching users for tenant 1001...
2026-08-10 15:30:01 INFO [UserService] Fetching users for tenant 1001...
2026-08-10 15:30:02 INFO [UserService] Fetching users for tenant 1001...
2026-08-10 15:30:03 INFO [UserService] User record: {"id": 1, "name": "Alexander", "role": "admin"}
2026-08-10 15:30:04 INFO [UserService] User record: {"id": 1, "name": "Alexander", "role": "admin"}`
    }
  ];

  try {
    console.log('Simulating chat completion request through Headroom Proxy (127.0.0.1:8787)...');
    const simulation = await client.chat.completions.simulate({
      model: 'openai/gpt-4o-mini',
      messages,
    });

    console.log('\n--- Proxy Agent Usage Result ---');
    console.log(`Tokens Before: ${simulation.tokensBefore}`);
    console.log(`Tokens After:  ${simulation.tokensAfter}`);
    console.log(`Tokens Saved:  ${simulation.tokensSaved}`);
    console.log(`Estimated Savings: ${simulation.estimatedSavings}`);
    console.log(`Transforms: ${simulation.transforms?.join(', ')}`);
  } catch (err) {
    console.error('Error during proxy simulation:', err.message);
  }
}

testHeadroom();

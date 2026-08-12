async function testRealProxyCall() {
  console.log('--- Sending Chat Completion POST to http://127.0.0.1:8787/v1/chat/completions ---');

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a sports center system diagnostic bot. System status: OK. System status: OK. System status: OK.' },
      {
        role: 'user',
        content: `Analyze system logs:
2026-08-10 15:40:00 [DEBUG] Initializing database connection pool...
2026-08-10 15:40:00 [DEBUG] Initializing database connection pool...
2026-08-10 15:40:01 [INFO] Connected to Supabase DB
2026-08-10 15:40:02 [INFO] Connected to Supabase DB`
      }
    ]
  };

  try {
    const res = await fetch('http://127.0.0.1:8787/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-mock-key-for-headroom-test'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', res.status, res.statusText);
    const data = await res.text();
    console.log('Response Body snippet:', data.slice(0, 300));
  } catch (err) {
    console.error('Error hitting proxy /v1/chat/completions:', err.message);
  }
}

testRealProxyCall();

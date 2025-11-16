export default {
  async fetch(request, env, ctx) {
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
    };

    // quick helper to reply with JSON + CORS
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
      });

    // preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // health check
    if (request.method === 'GET') {
      // /?debug=1 or /health both ok
      const url = new URL(request.url);
      if (url.pathname === '/' || url.pathname === '/health') {
        return json({ ok: true, ts: new Date().toISOString() });
      }
      // unknown GET path
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    // Only handle POST beyond this point
    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    // parse JSON body safely
    let bodyText = '';
    try {
      bodyText = await request.text();
    } catch (e) {
      return json({ success: false, error: 'Failed to read request body' }, 400);
    }

    let data = null;
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch (e) {
      return json({ success: false, error: 'Malformed JSON' }, 400);
    }

    const url = new URL(request.url);
    // Debug echo route - useful to see what headers Roblox actually sends
    if (url.pathname === '/debug') {
      // Return headers/body and whether X-API-KEY matched server secret
      const headersObj = {};
      for (const [k, v] of request.headers.entries()) headersObj[k] = v;

      const incomingKey = request.headers.get('X-API-KEY') || request.headers.get('x-api-key') || '';
      const expected = String(env.SECRET_API_KEY || '');
      const keyOk = expected !== '' && incomingKey === expected;

      return json({
        ok: keyOk,
        expectedSecretConfigured: expected !== '',
        incomingKeyProvided: incomingKey !== '',
        incomingKey: incomingKey ? ('REDACTED_IF_MISMATCH' + (keyOk ? '_MATCH' : '_MISMATCH')) : '',
        headers: headersObj,
        body: data,
        note: keyOk ? 'API key matched' : (expected ? 'API key missing/invalid' : 'No secret configured on server'),
      }, keyOk ? 200 : (expected ? 403 : 200));
    }

    // Authentication: optionally require API key if SECRET_API_KEY is set
    const SECRET = String(env.SECRET_API_KEY || '');
    if (SECRET) {
      const incomingKey = request.headers.get('X-API-KEY') || request.headers.get('x-api-key') || '';
      if (incomingKey !== SECRET) {
        // Return a helpful error so you can see from Roblox why it's 403
        return json({ success: false, error: 'Forbidden: missing or invalid X-API-KEY' }, 403);
      }
    }

    // Validate minimal payload fields
    const job_id = String(data.job_id || '');
    const player_name = String(data.player_name || '');
    const place_id = String(data.place_id || '');

    // Determine webhook target:
    // - If env.WEBHOOK_URL is provided we use that and ignore client webhook
    // - Else if ALLOW_CLIENT_WEBHOOK === 'true' and client supplied data.webhook we validate it
    let targetWebhook = '';
    if (env.WEBHOOK_URL) {
      targetWebhook = String(env.WEBHOOK_URL);
    } else {
      const allowClient = String(env.ALLOW_CLIENT_WEBHOOK || '').toLowerCase() === 'true';
      if (allowClient && data.webhook) {
        try {
          const u = new URL(String(data.webhook));
          if (u.protocol !== 'https:' && u.protocol !== 'http:') {
            return json({ success: false, error: 'Invalid webhook protocol' }, 400);
          }
          if (String(data.webhook).length > 2000) {
            return json({ success: false, error: 'Webhook URL too long' }, 400);
          }
          targetWebhook = String(data.webhook);
        } catch (e) {
          return json({ success: false, error: 'Invalid webhook URL' }, 400);
        }
      } else {
        return json({ success: false, error: 'No webhook configured on server and client webhooks not allowed' }, 400);
      }
    }

    // Prepare outgoing payload (Discord-compatible)
    const webhookBody = {
      content: `Job ${job_id || 'N/A'} from ${player_name || 'N/A'}`,
      embeds: [
        {
          title: 'Job Processing',
          fields: [
            { name: 'Job ID', value: job_id || 'N/A' },
            { name: 'Player', value: player_name || 'N/A' },
            { name: 'Place ID', value: place_id || 'N/A' },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Outgoing fetch with timeout and basic error handling
    const TIMEOUT_MS = 5000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
        signal: controller.signal,
      });
      clearTimeout(id);

      const text = await res.text().catch(() => '');

      if (res.ok) {
        return json({ success: true, forwarded: true, webhook_status: res.status }, 200);
      }

      // If we get 4xx from webhook, return it back to client as 502 but include details
      if (res.status >= 400 && res.status < 500) {
        return json({ success: false, error: 'Webhook responded with client error', status: res.status, webhook_body: text }, 502);
      }

      // For 5xx or other errors, return 502
      return json({ success: false, error: 'Webhook responded with server error', status: res.status, webhook_body: text }, 502);
    } catch (err) {
      clearTimeout(id);
      // Distinguish aborts from network/errors
      if (err.name === 'AbortError') {
        return json({ success: false, error: 'Request to webhook timed out' }, 504);
      }
      return json({ success: false, error: 'Failed to forward to webhook', details: String(err && err.message ? err.message : err) }, 502);
    }
  }
}

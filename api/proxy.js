export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();
        
        // Forward to your webhook
        if (data.webhook) {
          await fetch(data.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `Job ${data.job_id} from ${data.player_name}`,
              embeds: [{
                title: "Job Processing",
                fields: [
                  { name: "Job ID", value: data.job_id || "N/A" },
                  { name: "Player", value: data.player_name || "N/A" },
                  { name: "Place ID", value: data.place_id || "N/A" }
                ],
                timestamp: new Date().toISOString()
              }]
            })
          });
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
}

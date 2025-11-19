const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/to-discord', async (req, res) => {
  try {
    const webhookURL = 'https://discord.com/api/webhooks/1439213000455360624/Dj7Uh7hGHMX7CN5wRNN6hijz8ppS-bXFSwTuTX68n00k9YBNZ9miRmbR_HQ3TBW3iOeQ';
    await axios.post(webhookURL, req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

app.listen(8080, () => {
  console.log('Proxy server running on port 8080');
});

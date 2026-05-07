// Ana Bridge Server - MiniMax Chat + TTS
const http = require('http');

const MINIMAX_API_KEY = "sk-api-YYV9lvW4Eh1Y7yWUoI6h4J_yMNolXe0-IqL3cIqI1M_KiX1iO3ouRjMbYDvr8wpiBHrCWa7htpLJTmnAPpdMhAQSVupTr3f9WHoWWJWZA-7iKBjXrtmldJM";
const MINIMAX_BASE_URL = "https://api.minimax.chat/v1";
const gestureQueue = [];

const log = (msg) => console.log(msg);

function createHandler(port) {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url;

    if (url === '/gesture' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ gesture: gestureQueue.shift() || null }));
      return;
    }

    if (url === '/gesture' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.gesture) {
            gestureQueue.push(payload.gesture);
            log(`[Gesture] ${payload.gesture}`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // /v1/models
    if (url === '/v1/models' || url === '/models' || url === '/api/tags') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: [{ id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' }]
      }));
      return;
    }

    // /v1/chat/completions
    if (url.startsWith('/v1/chat/completions') || url.startsWith('/chat/completions')) {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const userMessage = payload.messages?.[payload.messages.length - 1]?.content || '';
          log(`[${port}] Message: ${userMessage}`);

          const mmResponse = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${MINIMAX_API_KEY}`
            },
            body: JSON.stringify({
              model: 'MiniMax-Text-01',
              messages: [
                { role: 'system', content: '你是一个可爱的桌面宠物助手，名叫 Ana。回复要简短自然，像朋友聊天一样，通常1-3句话就好，不要啰嗦。语气轻松随意，可以适当用一些语气词。' },
                { role: 'user', content: userMessage }
              ]
            })
          });

          const data = await mmResponse.json();

          if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            log(`[AI] ${reply}`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              id: 'chatcmpl-' + Date.now(),
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: 'MiniMax-Text-01',
              choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
            }));
          } else {
            log(`MiniMax error: ${JSON.stringify(data)}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: data.base_resp?.status_msg || 'API Error' }));
          }
        } catch (e) {
          log(`Error: ${e.message}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // /v1/audio/speech — MiniMax TTS
    if (url === '/v1/audio/speech' || url === '/audio/speech') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const text = payload.input || payload.text || '';
          log(`[TTS] text=${text.slice(0, 30)}`);

          const mmResponse = await fetch(`${MINIMAX_BASE_URL}/t2a_v2`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${MINIMAX_API_KEY}`
            },
            body: JSON.stringify({
              model: 'speech-2.8-hd',
              text: text,
              stream: false,
              voice_setting: {
                voice_id: 'female-tianmei',
                speed: 1.0,
                vol: 1,
                pitch: 0,
                emotion: 'happy'
              },
              audio_setting: {
                sample_rate: 32000,
                bitrate: 128000,
                format: 'mp3',
                channel: 1
              }
            })
          });

          const mmData = await mmResponse.json();
          if (!mmResponse.ok || mmData.base_resp?.status_code !== 0) {
            log(`TTS error: ${JSON.stringify(mmData)}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: mmData.base_resp?.status_msg || 'TTS failed' }));
            return;
          }

          const buffer = Buffer.from(mmData.data.audio, 'hex');
          res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
          res.end(buffer);
        } catch (e) {
          log(`TTS Error: ${e.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

const server1 = createHandler(1234);
const server2 = createHandler(11434);

server1.listen(1234, '0.0.0.0', () => log('Server on http://0.0.0.0:1234 (Chat + TTS)'));
server2.listen(11434, '0.0.0.0', () => log('Server on http://0.0.0.0:11434 (Chat + TTS)'));

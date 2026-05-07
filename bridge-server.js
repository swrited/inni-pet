// Inni Bridge Server - Chat Gateway + MiniMax TTS
const http = require('http');
const fs = require('fs');
const os = require('os');

const INNI_SYSTEM_PROMPT = '你是一个可爱的桌面宠物助手，名叫 Inni。回复要简短自然，像朋友聊天一样，通常1-3句话就好，不要啰嗦。语气轻松随意，可以适当用一些语气词。';
const CHAT_PROVIDER = (process.env.INNI_CHAT_PROVIDER || process.env.CHAT_PROVIDER || 'minimax').toLowerCase();
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "sk-api-YYV9lvW4Eh1Y7yWUoI6h4J_yMNolXe0-IqL3cIqI1M_KiX1iO3ouRjMbYDvr8wpiBHrCWa7htpLJTmnAPpdMhAQSVupTr3f9WHoWWJWZA-7iKBjXrtmldJM";
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1";
const MINIMAX_CHAT_MODEL = process.env.MINIMAX_CHAT_MODEL || 'MiniMax-Text-01';
const OPENAI_COMPAT_BASE_URL = process.env.INNI_CHAT_BASE_URL || process.env.OPENAI_BASE_URL || 'http://127.0.0.1:8000/v1';
const OPENAI_COMPAT_API_KEY = process.env.INNI_CHAT_API_KEY || process.env.OPENAI_API_KEY || 'not-needed';
const OPENAI_COMPAT_MODEL = process.env.INNI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const OPENCLAW_SESSION_ID = process.env.INNI_OPENCLAW_SESSION_ID || 'inni-pet';
const gestureQueue = [];

const log = (msg) => console.log(msg);
log(`[Bridge] chat provider=${CHAT_PROVIDER}`);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function chatCompletion(reply, model) {
  return {
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

function normalizeMessages(messages = []) {
  const hasSystem = messages.some(message => message.role === 'system');
  return hasSystem ? messages : [{ role: 'system', content: INNI_SYSTEM_PROMPT }, ...messages];
}

function lastUserMessage(messages = []) {
  const last = [...messages].reverse().find(message => message.role === 'user');
  const content = last?.content || '';
  return Array.isArray(content)
    ? content.map(part => part.text || part.content || '').join('\n')
    : String(content);
}

async function chatWithMiniMax(payload) {
  const userMessage = lastUserMessage(payload.messages);
  const mmResponse = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model: MINIMAX_CHAT_MODEL,
      messages: [
        { role: 'system', content: INNI_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
  });

  const data = await mmResponse.json();
  if (data.choices && data.choices[0]) {
    return chatCompletion(data.choices[0].message.content, MINIMAX_CHAT_MODEL);
  }

  throw new Error(data.base_resp?.status_msg || JSON.stringify(data));
}

function chatCompletionsUrl(baseUrl) {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return new URL('chat/completions', cleanBase).toString();
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function openClawConfig() {
  const explicitPath = process.env.OPENCLAW_CONFIG_PATH;
  const candidates = [
    explicitPath,
    `${os.homedir()}/.qclaw/openclaw.json`,
    `${os.homedir()}/.openclaw/openclaw.json`
  ].filter(Boolean);

  for (const filePath of candidates) {
    const config = readJsonFile(filePath);
    if (config?.gateway?.port) {
      return { config, filePath };
    }
  }
  return { config: {}, filePath: null };
}

function openClawConnection() {
  const { config } = openClawConfig();
  const port = process.env.INNI_OPENCLAW_PORT || config.gateway?.port || 28789;
  const baseUrl = process.env.INNI_OPENCLAW_BASE_URL || process.env.INNI_CHAT_BASE_URL || `http://127.0.0.1:${port}/v1`;
  const token = process.env.INNI_OPENCLAW_TOKEN || process.env.INNI_CHAT_API_KEY || process.env.OPENCLAW_GATEWAY_TOKEN || config.gateway?.auth?.token || 'not-needed';
  const model = process.env.INNI_CHAT_MODEL || 'openclaw:main';
  return { baseUrl, token, model };
}

async function chatWithOpenAICompatible(payload, options = {}) {
  const baseUrl = options.baseUrl || OPENAI_COMPAT_BASE_URL;
  const apiKey = options.apiKey || OPENAI_COMPAT_API_KEY;
  const model = options.model || OPENAI_COMPAT_MODEL;
  const extraHeaders = options.headers || {};
  const upstreamPayload = {
    ...payload,
    model: process.env.INNI_CHAT_MODEL || payload.model || model,
    messages: normalizeMessages(payload.messages)
  };
  if (options.user && !upstreamPayload.user) {
    upstreamPayload.user = options.user;
  }

  const response = await fetch(chatCompletionsUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify(upstreamPayload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `upstream ${response.status}`);
  }

  if (data.choices?.[0]?.message?.content) {
    return data;
  }

  const reply = data.response || data.message?.content || data.content || data.text;
  if (reply) {
    return chatCompletion(reply, upstreamPayload.model);
  }

  throw new Error(`OpenAI-compatible response missing assistant content: ${JSON.stringify(data).slice(0, 500)}`);
}

async function chatWithOpenClaw(payload) {
  const conn = openClawConnection();
  return chatWithOpenAICompatible(payload, {
    baseUrl: conn.baseUrl,
    apiKey: conn.token,
    model: conn.model,
    user: OPENCLAW_SESSION_ID,
    headers: { 'x-openclaw-agent-id': 'main' }
  });
}

async function chat(payload) {
  if (CHAT_PROVIDER === 'openclaw') return chatWithOpenClaw(payload);
  if (CHAT_PROVIDER === 'hermes' || CHAT_PROVIDER === 'openai' || CHAT_PROVIDER === 'compatible') {
    return chatWithOpenAICompatible(payload);
  }
  return chatWithMiniMax(payload);
}

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
      readBody(req).then(body => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.gesture) {
            gestureQueue.push(payload.gesture);
            log(`[Gesture] ${payload.gesture}`);
          }
          sendJson(res, 200, { ok: true });
        } catch (e) {
          sendJson(res, 400, { error: e.message });
        }
      }).catch(e => sendJson(res, 400, { error: e.message }));
      return;
    }

    // /v1/models
    if (url === '/v1/models' || url === '/models' || url === '/api/tags') {
      sendJson(res, 200, {
        object: 'list',
        data: [{ id: process.env.INNI_CHAT_MODEL || OPENAI_COMPAT_MODEL, object: 'model', created: 1677610602, owned_by: CHAT_PROVIDER }]
      });
      return;
    }

    // /v1/chat/completions
    if (url.startsWith('/v1/chat/completions') || url.startsWith('/chat/completions')) {
      readBody(req).then(async body => {
        try {
          const payload = JSON.parse(body || '{}');
          const userMessage = lastUserMessage(payload.messages);
          log(`[${port}] Message: ${userMessage}`);

          const data = await chat(payload);
          const reply = data.choices?.[0]?.message?.content || '';
          log(`[AI:${CHAT_PROVIDER}] ${reply}`);
          sendJson(res, 200, data);
        } catch (e) {
          log(`Error: ${e.message}`);
          sendJson(res, 500, { error: e.message });
        }
      }).catch(e => sendJson(res, 400, { error: e.message }));
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

function listen(server, port) {
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use; using the existing bridge if it is running.`);
      return;
    }
    throw error;
  });

  server.listen(port, '0.0.0.0', () => log(`Server on http://0.0.0.0:${port} (Chat + TTS)`));
}

const servers = [server1, server2];

listen(server1, 1234);
listen(server2, 11434);

// 优雅退出
function gracefulShutdown(signal) {
  log(`收到 ${signal}，正在关闭服务器...`);
  for (const srv of servers) {
    srv.close(() => log('服务器已关闭'));
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

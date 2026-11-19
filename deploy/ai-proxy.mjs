import http from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const token = readFileSync(process.env.FICCT_AI_TOKEN_FILE, 'utf8').trim();
if (token.length < 32) throw new Error('AI token is missing or too short');
let busy = false;

const server = http.createServer((request, response) => {
  const supplied = request.headers.authorization?.replace(/^Bearer /i, '') ?? '';
  const authorized = supplied.length === token.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
  if (!authorized) {
    response.writeHead(401).end('Unauthorized');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
    response.writeHead(404).end('Not found');
    return;
  }
  if (busy) {
    response.writeHead(429).end('Model busy');
    return;
  }
  busy = true;
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: 11434,
    path: request.url,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    timeout: 120000,
  }, (result) => {
    response.writeHead(result.statusCode ?? 502, { 'content-type': result.headers['content-type'] ?? 'application/json' });
    result.pipe(response);
    result.on('end', () => { busy = false; });
  });
  upstream.on('error', () => {
    busy = false;
    if (!response.headersSent) response.writeHead(502);
    response.end('Local model unavailable');
  });
  upstream.on('timeout', () => upstream.destroy(new Error('Local model timeout')));
  request.on('aborted', () => { busy = false; upstream.destroy(); });
  request.pipe(upstream);
});
server.requestTimeout = 120000;
server.listen(11435, '127.0.0.1');

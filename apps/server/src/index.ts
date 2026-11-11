import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CATALOG, INTEGRATIONS } from '../../../packages/protocol/src/index.ts';
import { MachineRoom, matchResults } from './rooms.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const webRoot = resolve(root, 'apps/web/dist');
let labBusy = false;
type RouteRequest = IncomingMessage & { path: string; params: Record<string, string> };
type RouteResponse = ServerResponse & {
  json(value: unknown): void;
  status(code: number): RouteResponse;
  type(value: string): RouteResponse;
  send(value: Buffer): void;
};

async function readJson(request: IncomingMessage): Promise<unknown> {
  let length = 0;
  const chunks: Buffer[] = [];
  // Absolute deadline: incoming bytes must not keep refreshing a slow upload.
  const timer = setTimeout(() => {
    request.destroy(Object.assign(new Error('request-body-timeout'), { status: 408 }));
  }, 2000);
  timer.unref();
  try {
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += buffer.length;
      if (length > 16_384) throw Object.assign(new Error('request-too-large'), { status: 413 });
      chunks.push(buffer);
    }
  } finally {
    clearTimeout(timer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('invalid-json'), { status: 400 }); }
}

export function createGameServer() {
  const server = new Server({
    transport: new WebSocketTransport({ pingInterval: 2000, pingMaxRetries: 3, maxPayload: 4096 }),
    greet: false,
    express: (app) => {
      app.get('/health', (_req: RouteRequest, res: RouteResponse) => res.json({ ok: true, service: 'mecha-authoritative-server', localDevelopment: true }));
      app.get('/api/catalog', (_req: RouteRequest, res: RouteResponse) => res.json(CATALOG));
      app.get('/api/integrations', async (_req: RouteRequest, res: RouteResponse) => {
        try {
          const registry = JSON.parse(await readFile(resolve(root, 'integrations/registry.json'), 'utf8'));
          res.json({ ...registry, runtime: INTEGRATIONS });
        } catch { res.json(INTEGRATIONS); }
      });
      app.get('/api/matches/:id', (req: RouteRequest, res: RouteResponse) => {
        const result = matchResults.get(String(req.params.id));
        if (!result) { res.status(404).json({ code: 'result-not-found' }); return; }
        res.json(result);
      });
      app.post('/api/lab/check', async (req: RouteRequest, res: RouteResponse) => {
        let acquired = false;
        try {
          const contentType = req.headers['content-type'] ?? '';
          if (!contentType.includes('application/json')) { res.status(415).json({ code: 'json-required' }); return; }
          const input = await readJson(req);
          if (!input || typeof input !== 'object' || Array.isArray(input)) { res.status(400).json({ code: 'invalid-input' }); return; }
          if (labBusy) { res.status(429).json({ code: 'lab-busy', message: '机械工作台正在检查另一份模型，请稍后再试。' }); return; }
          labBusy = true;
          acquired = true;
          const lab = await import('../../lab/src/index.js');
          const report = await lab.runMechanicalCheck(input as Parameters<typeof lab.runMechanicalCheck>[0]);
          res.json(report);
        } catch (error) {
          // A body timeout destroys its socket; never write another response to it.
          if (res.destroyed || res.writableEnded) return;
          const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 422;
          const safeCode = status === 413 ? 'request-too-large' : status === 400 ? 'invalid-json' : 'mechanical-check-failed';
          res.status(status >= 400 && status < 600 ? status : 422).json({ code: safeCode, message: '机械检查未完成，请检查输入或稍后重试。' });
        } finally { if (acquired) labBusy = false; }
      });
      const contentTypes: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary' };
      app.use(async (req: RouteRequest, res: RouteResponse, next: () => void) => {
        if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/matchmake')) { next(); return; }
        try {
          let relative = decodeURIComponent(req.path);
          const candidate = resolve(webRoot, '.' + relative);
          if (candidate !== webRoot && !candidate.startsWith(webRoot + sep)) { res.status(403).end(); return; }
          let path = candidate;
          try { if (!(await stat(path)).isFile()) path = resolve(webRoot, 'index.html'); }
          catch { path = resolve(webRoot, 'index.html'); }
          const content = await readFile(path);
          res.type(contentTypes[extname(path)] ?? 'application/octet-stream').send(content);
        } catch { next(); }
      });
    },
  });
  server.define('training', MachineRoom, { mode: 'training' });
  server.define('arena', MachineRoom, { mode: 'arena' });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createGameServer();
  const port = Number(process.env.PORT ?? 2567);
  const host = process.env.HOST ?? '127.0.0.1';
  await server.listen(port, host);
  console.log(`Mecha server listening on http://${host}:${port} (local development; no account authentication)`);
}

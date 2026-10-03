import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const { version } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const port = Number(process.env.SHIYUE_PORT || 4399);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('SHIYUE_PORT 必须是 1024–65535 之间的数字。');
const root = fileURLToPath(new URL('./dist/', import.meta.url));
let html;
try { html = await readFile(join(root, 'index.html')); }
catch { console.error('未找到软件文件。请先在项目目录运行 npm install 和 npm run build。'); process.exit(1); }
const url = `http://127.0.0.1:${port}`;
const shouldOpen = process.argv.includes('--open');
function openBrowser() {
  if (!shouldOpen) return;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`请在浏览器打开 ${url}`));
  child.unref();
}
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, url).pathname;
  if (pathname === '/__shiyue') { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ app: 'shiyue', version })); return; }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  if (pathname !== '/' && pathname !== '/index.html') { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  response.end(request.method === 'HEAD' ? undefined : html);
});
server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    try {
      const result = await fetch(`${url}/__shiyue`, { signal: AbortSignal.timeout(1500) });
      if ((await result.json()).app === 'shiyue') { console.log(`拾页已经在运行：${url}`); openBrowser(); process.exit(0); }
    } catch {}
    console.error(`端口 ${port} 被其他软件占用，请关闭占用后重试。`);
  } else console.error(error.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`拾页 · Markdown 阅读器\n\n已启动：${url}\n文件和标注会保存在当前浏览器中。\n保持这个窗口开启；按 Control + C 可关闭阅读器。`);
  openBrowser();
});

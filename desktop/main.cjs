const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const READER_URL = 'shiyue://reader/index.html';
const documents = new Set(['md', 'markdown', 'mdown', 'shiyue']);
const images = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const mime = { md: 'text/markdown', markdown: 'text/markdown', mdown: 'text/markdown', shiyue: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
let window, ready = false, quitting = false, pending = [], panelOpen = false;
app.setName('拾页');
app.setPath('userData', process.env.SHIYUE_PROFILE_DIR || path.join(app.getPath('appData'), 'io.shiyue.reader'));
protocol.registerSchemesAsPrivileged([{ scheme: 'shiyue', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

async function filePayload(urls, directory = false) {
  const candidates = [];
  async function walk(root, relative) {
    for (const item of await fs.readdir(root, { withFileTypes: true })) {
      if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
      const child = path.join(root, item.name), name = path.posix.join(relative, item.name);
      if (item.isDirectory() && !/\.(app|bundle|framework)$/i.test(item.name)) await walk(child, name);
      else if (item.isFile()) candidates.push([child, name]);
      if (candidates.length > 5000) throw Error('文件夹内容过多，请选择较小的文件夹。');
    }
  }
  for (const url of urls) {
    if (directory) await walk(url, path.basename(url));
    else candidates.push([url, '']);
  }
  let total = 0;
  const result = [];
  for (const [url, relativePath] of candidates) {
    const ext = path.extname(url).slice(1).toLowerCase();
    if (!documents.has(ext) && !images.has(ext)) continue;
    const info = await fs.stat(url);
    if (!info.isFile()) continue;
    if (info.size > (ext === 'shiyue' ? 36 : 10) * 1024 * 1024) throw Error(`${path.basename(url)} 过大，请选择较小的文件。`);
    total += info.size;
    if (total > 64 * 1024 * 1024 || result.length >= 1000) throw Error('一次打开的资料过多，请分批选择。');
    result.push({ name: path.basename(url), relativePath, mime: mime[ext], base64: (await fs.readFile(url)).toString('base64') });
  }
  return result;
}
async function deliverPending() {
  if (!ready || !pending.length || !window || window.isDestroyed()) return;
  const urls = pending; pending = [];
  try { window.webContents.send('shiyue:files', await filePayload(urls)); }
  catch (error) { dialog.showErrorBox('拾页未能打开文档', error.message); }
}
function command(name) {
  if (!window || window.isDestroyed()) return;
  window.show(); window.focus();
  if (ready) window.webContents.send('shiyue:command', name);
}
function setupMenus() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '拾页', submenu: [{ role: 'about', label: '关于拾页' }, { type: 'separator' }, { role: 'hide', label: '隐藏拾页' }, { role: 'hideOthers', label: '隐藏其他' }, { role: 'unhide', label: '显示全部' }, { type: 'separator' }, { role: 'quit', label: '退出拾页' }] },
    { label: '文件', submenu: [
      { label: '打开文档…', accelerator: 'CmdOrCtrl+O', click: () => command('open') },
      { label: '打开文件夹…', accelerator: 'CmdOrCtrl+Shift+O', click: () => command('folder') },
      { type: 'separator' }, { label: '导出阅读存档…', accelerator: 'CmdOrCtrl+S', click: () => command('save') },
      { label: '打印…', accelerator: 'CmdOrCtrl+P', click: () => command('print') }, { type: 'separator' }, { role: 'close', label: '关闭窗口' },
    ] },
    { label: '编辑', submenu: [
      { label: '撤销', accelerator: 'CmdOrCtrl+Z', click: () => command('undo') }, { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', click: () => command('redo') },
      { type: 'separator' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' },
      { type: 'separator' }, { label: '搜索正文', accelerator: 'CmdOrCtrl+F', click: () => command('search') },
    ] },
    { label: '窗口', submenu: [{ role: 'minimize', label: '最小化' }, { role: 'zoom', label: '缩放' }, { role: 'front', label: '全部置于前面' }] },
  ]));
  app.setAboutPanelOptions({ applicationName: '拾页', applicationVersion: app.getVersion(), copyright: 'Markdown 阅读器 · 高亮 · 下划线 · 批注 · 本地保存' });
}
async function flush() {
  if (!ready || !window || window.isDestroyed()) return;
  await window.webContents.executeJavaScript('window.shiyueFlush ? window.shiyueFlush() : Promise.resolve()');
}
function createWindow() {
  window = new BrowserWindow({
    title: '拾页', width: 1320, height: 890, minWidth: 780, minHeight: 590, show: false,
    backgroundColor: '#f5f5ef',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, navigateOnDragDrop: false },
  });
  window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => {
    if (url === READER_URL) return;
    event.preventDefault(); if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url);
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    flush().finally(() => { if (!window.isDestroyed()) window.hide(); });
  });
  window.once('ready-to-show', () => window.show());
  window.loadURL(READER_URL);
}
ipcMain.handle('shiyue:request', async (event, body) => {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== READER_URL || !body || typeof body !== 'object') throw Error('桌面操作来源无效。');
  if (body.action === 'ready') { ready = true; void deliverPending(); return { ready: true }; }
  if (body.action === 'hash' && typeof body.text === 'string' && Buffer.byteLength(body.text) <= 12 * 1024 * 1024) return { hash: createHash('sha256').update(body.text).digest('hex') };
  if (body.action === 'open') {
    if (panelOpen) return { files: [] };
    panelOpen = true;
    try {
      const directory = body.directory === true;
      const result = await dialog.showOpenDialog(window, {
        title: directory ? '打开 Markdown 所在文件夹' : '打开 Markdown 或阅读存档', buttonLabel: '打开',
        properties: directory ? ['openDirectory'] : ['openFile', 'multiSelections'],
        ...(directory ? {} : { filters: [{ name: 'Markdown 与拾页存档', extensions: [...documents] }, { name: '所有文件', extensions: ['*'] }] }),
      });
      return { files: result.canceled ? [] : await filePayload(result.filePaths, directory) };
    } finally { panelOpen = false; }
  }
  if (body.action === 'save') {
    if (typeof body.filename !== 'string' || typeof body.content !== 'string' || Buffer.byteLength(body.content) > 50 * 1024 * 1024) throw Error('导出内容格式不正确或超过 50 MB。');
    if (panelOpen) return { saved: false };
    panelOpen = true;
    try {
      const name = path.basename(body.filename).replace(/[/:]/g, '_') || '拾页存档.shiyue';
      const result = await dialog.showSaveDialog(window, { title: '导出拾页文档', defaultPath: path.join(app.getPath('documents'), name), properties: ['createDirectory', 'showOverwriteConfirmation'] });
      if (result.canceled || !result.filePath) return { saved: false };
      const temporary = path.join(path.dirname(result.filePath), `.${path.basename(result.filePath)}.${createHash('sha256').update(String(process.hrtime.bigint())).digest('hex').slice(0, 12)}.tmp`);
      try { await fs.writeFile(temporary, body.content, 'utf8'); await fs.rename(temporary, result.filePath); }
      finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
      return { saved: true };
    } finally { panelOpen = false; }
  }
  if (body.action === 'print') {
    await new Promise((resolve, reject) => window.webContents.print({ printBackground: true }, (success, reason) => success || reason === 'cancelled' || reason === 'Print job canceled' ? resolve() : reject(Error(reason || '打印未完成。'))));
    return { printing: true };
  }
  throw Error('不支持的桌面操作。');
});
app.on('open-file', (event, filename) => { event.preventDefault(); pending.push(filename); void deliverPending(); });
app.on('before-quit', (event) => {
  if (quitting) return;
  event.preventDefault();
  flush().finally(() => { quitting = true; app.quit(); });
});
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  protocol.handle('shiyue', async (request) => {
    if (request.url !== READER_URL) return new Response('Not found', { status: 404 });
    const html = await fs.readFile(path.join(__dirname, '..', 'dist', 'index.html'));
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'" } });
  });
  setupMenus(); createWindow();
});
app.on('activate', () => { if (!window || window.isDestroyed()) createWindow(); else { window.show(); window.focus(); } });

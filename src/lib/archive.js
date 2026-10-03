import { validateAnnotations, normalizePath } from './annotations';
import { renderMarkdown, decorateHTML } from './markdown';
import { isDesktop, desktopRequest } from './desktop';

const MAX_SOURCE = 10 * 1024 * 1024;
const MAX_ASSETS = 24 * 1024 * 1024;
export async function documentId(name, source) {
  const bytes = new TextEncoder().encode(name + '\0' + source);
  if (!crypto.subtle && isDesktop) return (await desktopRequest({ action: 'hash', text: name + '\0' + source })).hash;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function checkAssets(value) {
  const assets = {};
  let length = 0;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return assets;
  for (const [key, data] of Object.entries(value)) {
    if (typeof data !== 'string' || !/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[a-zA-Z0-9+/=\s]+$/.test(data)) throw new Error('存档中的图片格式不正确。');
    length += data.length;
    if (length > MAX_ASSETS) throw new Error('图片总大小超过 24 MB，请减少图片后再打开。');
    const path = normalizePath(key);
    if (path && !['__proto__', 'constructor', 'prototype'].includes(path)) assets[path] = data;
  }
  return assets;
}

export async function parseArchive(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('这不是有效的拾页阅读存档。'); }
  const doc = value?.document;
  if (value?.format !== 'shiyue-reading-archive' || value?.version !== 1 || !doc
    || typeof doc.name !== 'string' || !doc.name.trim() || doc.name.length > 500
    || typeof doc.source !== 'string' || new TextEncoder().encode(doc.source).length > MAX_SOURCE) {
    throw new Error('阅读存档格式不正确，或原文超过 10 MB。');
  }
  const sourcePath = typeof doc.sourcePath === 'string' ? normalizePath(doc.sourcePath) : doc.name;
  const assets = checkAssets(doc.assets);
  const text = renderMarkdown(doc.source, assets, sourcePath).text;
  const annotations = validateAnnotations(doc.annotations, text);
  return {
    id: await documentId(sourcePath, doc.source), name: doc.name, sourcePath, source: doc.source,
    assets, annotations, createdAt: Number.isFinite(doc.createdAt) ? doc.createdAt : Date.now(),
    updatedAt: Date.now(), scrollTop: Math.max(0, Number(doc.scrollTop) || 0),
  };
}

function imageData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function readFiles(files) {
  const list = [...files];
  const images = list.filter((file) => /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name));
  if (images.reduce((sum, file) => sum + file.size, 0) > MAX_ASSETS * .72) throw new Error('本地图片过大，请减少图片后再打开。');
  const assets = {};
  for (const file of images) assets[normalizePath(file.webkitRelativePath || file.name)] = await imageData(file);
  const docs = [], errors = [];
  for (const file of list.filter((file) => /\.(md|markdown|mdown|shiyue)$/i.test(file.name))) {
    try {
      if (file.size > (/\.shiyue$/i.test(file.name) ? 36 : 10) * 1024 * 1024) throw new Error('文件过大（Markdown 上限 10 MB，阅读存档上限 36 MB）。');
      const raw = await file.text();
      if (/\.shiyue$/i.test(file.name)) docs.push(await parseArchive(raw));
      else {
        const sourcePath = normalizePath(file.webkitRelativePath || file.name);
        docs.push({
          id: await documentId(sourcePath, raw), name: file.name, sourcePath, source: raw,
          assets, annotations: [], createdAt: Date.now(), updatedAt: Date.now(), scrollTop: 0,
        });
      }
    } catch (error) { errors.push(`${file.name}：${error.message}`); }
  }
  return { docs, errors };
}

export function archiveJSON(doc) {
  const { id: _id, ...content } = doc;
  return JSON.stringify({ format: 'shiyue-reading-archive', version: 1, exportedAt: new Date().toISOString(), document: content }, null, 2);
}

export function notesMarkdown(doc) {
  return `# ${doc.name.replace(/\.(md|markdown|mdown)$/i, '')} · 阅读笔记\n\n` +
    [...doc.annotations].sort((a, b) => a.start - b.start).map((a, i) =>
      `## ${i + 1}. ${{ highlight: '高亮', underline: '下划线', note: '批注' }[a.type]}\n\n` +
      a.text.split('\n').map((line) => '> ' + line).join('\n') + '\n\n' + (a.note ? a.note + '\n\n' : '')).join('');
}

export function annotatedHTML(doc) {
  const base = renderMarkdown(doc.source, doc.assets, doc.sourcePath);
  const body = decorateHTML(base.html, doc.annotations);
  const title = doc.name.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const notes = document.createElement('section');
  if (doc.annotations.length) {
    const heading = document.createElement('h2'); heading.textContent = '阅读笔记'; notes.append(heading);
    for (const annotation of [...doc.annotations].sort((a, b) => a.start - b.start)) {
      const quote = document.createElement('blockquote'); quote.textContent = annotation.text; notes.append(quote);
      if (annotation.note) { const p = document.createElement('p'); p.textContent = annotation.note; notes.append(p); }
    }
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{max-width:800px;margin:60px auto;padding:0 24px;color:#252923;background:white;font:18px/1.9 Georgia,"Songti SC",serif}h1{line-height:1.4}h2{margin-top:2em}img{max-width:100%}pre{padding:20px;background:#f5f5f1;overflow:auto;line-height:1.6}code{font-family:monospace}blockquote{margin:20px 0;padding:12px 20px;background:#f6f5f1;border-left:4px solid #596449;white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}.highlight-yellow{background:#fff0ae}.highlight-green{background:#d5ebd6}.highlight-blue{background:#d8e7fc}.highlight-pink{background:#f8dce7}.reading-underline{text-decoration:underline;text-decoration-color:#596449;text-underline-offset:5px}.reading-note{border-bottom:2px dotted #9a8b59}section{border-top:1px solid #ddd;margin-top:64px}@media print{body{margin:0;max-width:none}.reading-mark{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><article>${body}</article>${notes.outerHTML}</body></html>`;
}

export async function download(content, filename, type = 'text/plain;charset=utf-8') {
  if (isDesktop) return (await desktopRequest({ action: 'save', content, filename, type })).saved;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

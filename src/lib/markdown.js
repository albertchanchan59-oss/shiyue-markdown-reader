import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import { normalizePath } from './annotations';

Object.entries({ javascript, typescript, python, json, bash, css, xml, sql }).forEach(([name, lang]) => hljs.registerLanguage(name, lang));
marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(source, assets = {}, sourcePath = '') {
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(marked.parse(source), {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'textarea', 'button'],
    FORBID_ATTR: ['style', 'id', 'name'], ALLOW_DATA_ATTR: false,
  });
  const element = template.content;
  element.querySelectorAll('input').forEach((input) => { input.disabled = true; });
  const dir = sourcePath.slice(0, sourcePath.lastIndexOf('/') + 1);
  element.querySelectorAll('img').forEach((img) => {
    const path = img.getAttribute('src') || '';
    if (!/^(?:https?:|data:image\/)/i.test(path)) {
      const asset = assets[normalizePath(dir + path)] || assets[normalizePath(path)];
      if (asset) img.src = asset;
      else {
        const missing = document.createElement('span');
        missing.className = 'missing-image';
        missing.setAttribute('aria-label', `[图片：${img.alt || path} · 打开所在文件夹以载入]`);
        img.replaceWith(missing);
      }
    }
    img.loading = 'lazy';
  });
  element.querySelectorAll('a').forEach((a) => {
    if (!a.getAttribute('href')?.startsWith('#')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  element.querySelectorAll('pre code').forEach((code) => {
    const language = /language-([\w-]+)/.exec(code.className)?.[1];
    if (language && hljs.getLanguage(language)) {
      code.innerHTML = hljs.highlight(code.textContent, { language }).value;
      code.classList.add('hljs');
    }
  });
  const headings = [...element.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h, index) => {
    h.id = `heading-${index}`;
    return { id: h.id, label: h.textContent, level: Number(h.tagName[1]) };
  });
  // The same rendered text is used for selection, persisted anchors, search and archive checks.
  return { html: template.innerHTML, text: element.textContent, headings };
}

export function decorateHTML(baseHTML, annotations, matches = [], activeMatch = -1) {
  const template = document.createElement('template');
  template.innerHTML = baseHTML;
  const element = template.content;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let total = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    nodes.push({ node, start: total, end: total + node.textContent.length });
    total += node.textContent.length;
  }
  for (const { node, start, end } of nodes) {
    const relevant = annotations.filter((a) => a.start < end && a.end > start);
    const searches = matches.filter((a) => a.start < end && a.end > start);
    if (!relevant.length && !searches.length) continue;
    const boundaries = [...new Set([start, end, ...[...relevant, ...searches].flatMap((a) => [Math.max(start, a.start), Math.min(end, a.end)])])].sort((a, b) => a - b);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < boundaries.length - 1; i++) {
      const left = boundaries[i], right = boundaries[i + 1];
      const active = relevant.filter((a) => a.start <= left && a.end >= right);
      const hits = searches.filter((a) => a.start <= left && a.end >= right);
      const content = node.textContent.slice(left - start, right - start);
      if (!active.length && !hits.length) { fragment.append(document.createTextNode(content)); continue; }
      const span = document.createElement('span');
      span.textContent = content;
      const highlight = active.filter((a) => a.type === 'highlight').at(-1);
      const classes = ['reading-mark'];
      if (highlight) classes.push(`highlight-${highlight.color}`);
      if (active.some((a) => a.type === 'underline')) classes.push('reading-underline');
      if (active.some((a) => a.type === 'note')) classes.push('reading-note');
      if (hits.length) {
        classes.push(hits.some((a) => a.index === activeMatch) ? 'search-current' : 'search-match');
        span.dataset.searchIds = hits.map((a) => a.index).join(',');
      }
      span.className = classes.join(' ');
      if (active.length) span.dataset.annIds = active.map((a) => a.id).join(',');
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
  return template.innerHTML;
}

export function readSelection(root) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const leading = range.toString().length - range.toString().trimStart().length;
  const text = range.toString().trim();
  if (!text) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length + leading;
  const rect = range.getBoundingClientRect();
  return { start, end: start + text.length, text, rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } };
}

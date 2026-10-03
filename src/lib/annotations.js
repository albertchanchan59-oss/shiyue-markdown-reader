export const COLORS = {
  yellow: { label: '黄色', fill: '#fff0ae', dot: '#ffd64d' },
  green: { label: '绿色', fill: '#d5ebd6', dot: '#7bcda1' },
  blue: { label: '蓝色', fill: '#d8e7fc', dot: '#86aaf0' },
  pink: { label: '粉色', fill: '#f8dce7', dot: '#f19bbd' },
};

export function findMatches(text, query) {
  if (!query.trim()) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(escaped, 'giu');
  return [...text.matchAll(expression)].slice(0, 2000).map((match, i) => ({
    start: match.index, end: match.index + match[0].length, index: i,
  }));
}

export function validateAnnotations(value, text) {
  if (!Array.isArray(value) || value.length > 5000) throw new Error('阅读存档中的标注格式不正确。');
  const used = new Set();
  return value.map((item) => {
    if (!item || !Number.isInteger(item.start) || !Number.isInteger(item.end)
      || item.start < 0 || item.end <= item.start || item.end > text.length
      || typeof item.text !== 'string' || text.slice(item.start, item.end) !== item.text
      || !['highlight', 'underline', 'note'].includes(item.type)
      || typeof item.note !== 'string' || item.note.length > 20000
      || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || used.has(item.id)) {
      throw new Error('存档中的标注与原文不一致，请使用完整的拾页阅读存档。');
    }
    used.add(item.id);
    return {
      id: item.id, start: item.start, end: item.end, text: item.text,
      type: item.type, color: COLORS[item.color] ? item.color : 'yellow', note: item.note,
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      example: Boolean(item.example),
    };
  });
}

export function normalizePath(path) {
  const output = [];
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { decoded = path; }
  for (const part of decoded.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') output.pop(); else output.push(part);
  }
  return output.join('/');
}

export function annotationId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

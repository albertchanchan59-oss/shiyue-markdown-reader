import { copyFile } from 'node:fs/promises';
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../拾页阅读器.html', import.meta.url));
console.log('已生成可双击打开的「拾页阅读器.html」。');

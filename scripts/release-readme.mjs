import { readFile, writeFile } from 'node:fs/promises';
const [destination, identity] = process.argv.slice(2);
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
let text = (await readFile('macos/安装说明.txt', 'utf8')).replace('1.0.0', version);
if (identity !== '-') text = text.split('当前发布状态')[0] + '发布状态\n此应用使用 Apple Developer ID 发布证书签名。\nApple 公证结果以随安装包提供的 release-manifest.json 为准。\n';
await writeFile(destination, text);

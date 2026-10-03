import { renderMarkdown } from '../lib/markdown';
import { isDesktop } from '../lib/desktop';

export const welcomeSource = `# 把阅读，变成自己的理解

打开一份 Markdown，读一读，划一划。让值得记住的文字，有一个安静的去处。

---

## 01 从一段文字开始

读到让你停下来的一句话，就把它留下。

选中文字，在浮动工具栏中选择高亮、下划线，或者写下一条批注。

## 02 留下你的思考

标记是为了下一次更快找回。

在右侧查看所有标注，点击就能回到原文。你可以修改批注，也可以删除不再需要的标记。

> 真正留下来的，是读完之后自己的想法。

## 03 安心保存与带走

所有的标注会自动保存在本地。完成阅读后，你可以将带有标注的文档导出为一个完整的阅读存档，随时在其他设备上继续阅读。

**打开自己的文件**

点击左侧「打开文件」，或直接把一个或多个 .md 文件拖进窗口。再次打开同一份文件，已有标注会保留。想读带有本地图片的文章，可以用左侧「打开文件夹」，选择文章所在文件夹。图片会和文章一起保存在本机。

**四种带走方式**

- **阅读存档**：包括完整原文、标注、批注和已导入的图片。把 .shiyue 文件拖回拾页，就能接着读。
- **带标注的 HTML**：保留文章的排版与标注，双击文件即可阅读。
- **笔记 Markdown**：把标记过的句子和自己的思考汇总成一份笔记。
- **原始 Markdown**：导出导入时的原文。

**阅读时的小帮手**

| 操作 | 快捷键 |
| --- | --- |
| 打开文件 | ⌘ / Ctrl + O |
| 搜索正文 | ⌘ / Ctrl + F |
| 导出阅读存档 | ⌘ / Ctrl + S |
| 撤销标注操作 | ⌘ / Ctrl + Z |
| 重做标注操作 | ⌘ / Ctrl + Shift + Z |
| 选中后高亮 / 下划线 / 批注 | H / U / N |

右上角的 Aa 可以调整字号、行距和阅读宽度；月亮按钮可以切换深色模式。底部显示阅读进度，并自动记住阅读位置。

**常用 Markdown 格式都能阅读**

这里有 **粗体**、*斜体*、~~删除线~~，也有 [Markdown 语法介绍](https://commonmark.org/help/)。

\`行内代码\` 和代码块同样可以标注。代码块会保留空格与换行：

\`\`\`javascript
const reader = {
  name: '拾页',
  highlights: true,
  underline: true,
};
console.log('留下一句值得记住的话。');
\`\`\`

- [x] 阅读指南
- [ ] 打开一份自己的文件
- [ ] 留下一条自己的批注

在同一浏览器、同一个拾页地址里打开，文件与标注会自动恢复。清除浏览器数据会清除本地资料；读完一份重要文章，记得导出阅读存档留一份备份。
`;

export function createWelcome() {
  const text = renderMarkdown(welcomeSource).text;
  const make = (id, quote, type, note) => ({
    id, text: quote, start: text.indexOf(quote), end: text.indexOf(quote) + quote.length,
    type, color: 'yellow', note, createdAt: Date.now(), example: true,
  });
  return {
    id: 'shiyue-welcome', name: '使用指南.md', sourcePath: '使用指南.md', source: isDesktop ? welcomeSource.replace('在同一浏览器、同一个拾页地址里打开，文件与标注会自动恢复。清除浏览器数据会清除本地资料；', '再次启动拾页，文件与标注会自动恢复。资料保存在这台 Mac 的拾页应用数据中；') : welcomeSource,
    assets: {}, createdAt: Date.now(), updatedAt: Date.now(), scrollTop: 0,
    annotations: [
      make('welcome-highlight', '读到让你停下来的一句话，就把它留下。', 'highlight', '值得记住的句子，随手标记。'),
      make('welcome-underline', '标记是为了下一次更快找回。', 'underline', '下次复习时，重点关注这部分。'),
    ],
  };
}

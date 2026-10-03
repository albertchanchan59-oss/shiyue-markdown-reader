import { BookOpen, Plus, FileText, FolderOpen, List, HardDrive, X, Trash2 } from 'lucide-react';

export function Library({ documents, active, headings, openFile, openFolder, selectDocument, jumpHeading, requestDelete, visible, close }) {
  const toc = headings.filter((h) => h.level > 1);
  return <aside id="file-library" hidden={!visible} className={`library panel ${visible ? 'drawer-visible' : ''}`} aria-label="文件和目录">
    <div className="brand"><BookOpen size={32} strokeWidth={1.8} /><div><strong>拾页</strong><span>Markdown 阅读器</span></div>
      <button className="icon-button drawer-close" onClick={close} aria-label="收起文件栏"><X size={20} /></button>
    </div>
    <div className="drop-hint"><FileText size={18} strokeWidth={1.6} /><span>拖入 .md 文件即可阅读</span></div>
    <div className="library-heading"><h2>我的文件</h2><div className="library-actions"><button className="library-open" onClick={openFile} title="打开 Markdown 或阅读存档" aria-label="打开文件"><Plus size={16} /><span>打开</span></button><button className="icon-button" title="打开文件夹（同时导入本地图片）" aria-label="打开文件夹" onClick={openFolder}><FolderOpen size={18} /></button></div></div>
    <div className="file-list">
      {documents.length ? documents.map((doc) => <div className={`file-row ${active?.id === doc.id ? 'selected' : ''}`} key={doc.id}>
        <button className="file-select" onClick={() => { selectDocument(doc.id); close(); }} title={doc.sourcePath || doc.name}><FileText size={21} strokeWidth={1.6} /><span>{doc.name}</span></button>
        <button className="icon-button remove-file" aria-label={`移除 ${doc.name}`} title="从拾页移除" onClick={() => requestDelete(doc)}><Trash2 size={14} /></button>
      </div>) : <p className="library-empty">打开文件，开始阅读。</p>}
    </div>
    <div className="toc-section"><h2>目录</h2><nav aria-label="文章目录" tabIndex={0}>
      {toc.length ? toc.map((h) => <button className={`toc-row level-${h.level}`} key={h.id} onClick={() => { jumpHeading(h.id); close(); }} title={h.label}><List size={17} /><span>{h.label.replace(/^\d+\s+/, '')}</span></button>) : <p className="library-empty">这份文档还没有章节标题。</p>}
    </nav></div>
    <div className="local-note"><HardDrive size={21} strokeWidth={1.7} /><span>文件和标注保存在本地</span></div>
  </aside>;
}

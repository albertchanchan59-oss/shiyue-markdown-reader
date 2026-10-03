import { useEffect, useRef, useState } from 'react';
import { Search, Moon, Sun, Upload, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, NotebookPen, X, ChevronUp, ChevronDown, Download, FileText, FileArchive, Printer, Undo2, Redo2 } from 'lucide-react';

export function Header({ doc, preferences, setPreferences, searchOpen, setSearchOpen, query, setQuery, matches, matchIndex, moveMatch, exportDoc, toggleLibrary, toggleNotes, libraryVisible, notesVisible, undo, redo, canUndo, canRedo }) {
  const [popover, setPopover] = useState(null);
  const container = useRef(null), inputRef = useRef(null);
  useEffect(() => {
    const close = (event) => { if (!container.current?.contains(event.target)) setPopover(null); };
    const escape = (event) => { if (event.key === 'Escape') setPopover(null); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
  return <div className="reader-header-group" ref={container}>
    <header className="reader-header">
      <button className="icon-button sidebar-toggle library-toggle" aria-label={libraryVisible ? "收起文件栏" : "展开文件栏"} title={libraryVisible ? "收起文件和目录" : "展开文件和目录"} aria-expanded={libraryVisible} aria-controls="file-library" onClick={toggleLibrary}>{libraryVisible ? <PanelLeftClose size={21} /> : <PanelLeftOpen size={21} />}</button>
      <strong className="header-filename" title={doc?.sourcePath}>{doc?.name || '开始阅读'}</strong>
      <div className="header-tools">
        <div className="history-tools"><button className="icon-button" aria-label="撤销" title="撤销标注 (⌘/Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={18} /></button><button className="icon-button" aria-label="重做" title="重做标注" disabled={!canRedo} onClick={redo}><Redo2 size={18} /></button></div>
        <button className={`icon-button ${searchOpen ? 'pressed' : ''}`} aria-label="搜索正文" title="搜索 (⌘/Ctrl+F)" onClick={() => { setSearchOpen(!searchOpen); setPopover(null); }} disabled={!doc}><Search size={22} /></button>
        <button className={`icon-button font-button ${popover === 'type' ? 'pressed' : ''}`} title="阅读设置" aria-label="阅读设置" aria-expanded={popover === 'type'} onClick={() => setPopover(popover === 'type' ? null : 'type')}>Aa</button>
        <button className="icon-button theme-button" title={preferences.theme === 'light' ? '切换深色模式' : '切换浅色模式'} aria-label={preferences.theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={() => setPreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}>{preferences.theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}</button>

        <button className="export-button" disabled={!doc} onClick={() => setPopover(popover === 'export' ? null : 'export')} aria-expanded={popover === 'export'}><Upload size={19} /><span>导出</span></button>
        <button className="icon-button sidebar-toggle notes-toggle" aria-label={notesVisible ? "收起笔记栏" : "展开笔记栏"} title={notesVisible ? "收起阅读笔记" : "展开阅读笔记"} aria-expanded={notesVisible} aria-controls="reading-notes" onClick={toggleNotes}>{notesVisible ? <PanelRightClose size={21} /> : <PanelRightOpen size={21} />}</button>
      </div>
    </header>
    {searchOpen && <div className="search-bar"><Search size={17} /><input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索这份文档…" aria-label="搜索关键词" onKeyDown={(e) => { if (e.key === 'Enter') moveMatch(e.shiftKey ? -1 : 1); if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); } }} />
      <span className="search-count">{query ? matches.length ? `${matchIndex + 1} / ${matches.length}${matches.length === 2000 ? '+' : ''}` : '没有结果' : ''}</span>
      <button className="icon-button" aria-label="上一个搜索结果" disabled={!matches.length} onClick={() => moveMatch(-1)}><ChevronUp size={18} /></button><button className="icon-button" aria-label="下一个搜索结果" disabled={!matches.length} onClick={() => moveMatch(1)}><ChevronDown size={18} /></button><button className="icon-button" aria-label="关闭搜索" onClick={() => { setSearchOpen(false); setQuery(''); }}><X size={17} /></button>
    </div>}
    {popover === 'type' && <div className="settings-popover popover"><h3>阅读设置</h3><label>字号</label><div className="option-row">{[18, 20, 22, 24, 26].map((size) => <button key={size} className={preferences.fontSize === size ? 'chosen' : ''} onClick={() => setPreferences({ fontSize: size })}>{size}</button>)}</div><label>行距</label><div className="option-row">{[[1.6, '紧凑'], [1.85, '舒适'], [2.1, '宽松']].map(([height, name]) => <button key={height} className={preferences.lineHeight === height ? 'chosen' : ''} onClick={() => setPreferences({ lineHeight: height })}>{name}</button>)}</div><label>阅读宽度</label><div className="option-row">{[['normal', '标准'], ['wide', '宽幅']].map(([width, name]) => <button key={width} className={preferences.width === width ? 'chosen' : ''} onClick={() => setPreferences({ width })}>{name}</button>)}</div></div>}
    {popover === 'export' && <div className="export-popover popover" role="menu" aria-label="导出选项">{[
      ['archive', FileArchive, '阅读存档', '含原文、标注与图片，可重新打开'],
      ['html', Download, '带标注的 HTML', '保留排版，双击即可阅读'],
      ['notes', NotebookPen, '笔记 Markdown', '汇总摘录与自己的批注'],
      ['source', FileText, '原始 Markdown', '保留原始文件内容'],
      ['print', Printer, '打印 / 保存 PDF', '使用浏览器打印'],
    ].map(([type, Icon, label, description]) => <button role="menuitem" key={type} onClick={() => { exportDoc(type); setPopover(null); }}><Icon size={19} /><span>{label}<small>{description}</small></span></button>)}</div>}
  </div>;
}

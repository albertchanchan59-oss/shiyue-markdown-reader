import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, AlertCircle, Upload, X, BookOpen } from 'lucide-react';
import { useLibrary } from './hooks/useLibrary';
import { useMediaQuery } from './hooks/useMediaQuery';
import { renderMarkdown, decorateHTML } from './lib/markdown';
import { findMatches, annotationId } from './lib/annotations';
import { isDesktop, desktopRequest, desktopFiles } from './lib/desktop';
import { waitForSaves } from './lib/storage';
import { readFiles, archiveJSON, annotatedHTML, notesMarkdown, download } from './lib/archive';
import { Library } from './components/Library';
import { Header } from './components/Header';
import { Reader } from './components/Reader';
import { Notes } from './components/Notes';
import { SelectionToolbar } from './components/SelectionToolbar';
import { Dialog } from './components/Dialog';

const emptyBase = { html: '', text: '', headings: [] };
export default function App() {
  const library = useLibrary();
  const { active: doc, preferences } = library;
  const libraryOverlay = useMediaQuery('(max-width: 760px)');
  const notesOverlay = useMediaQuery('(max-width: 1150px)');
  const [selection, setSelection] = useState(null), [focusId, setFocusId] = useState(null);
  const [noteDialog, setNoteDialog] = useState(null), [noteText, setNoteText] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null), [toast, setToast] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState(''), [matchIndex, setMatchIndex] = useState(0);
  const [progress, setProgress] = useState(0), [drawers, setDrawers] = useState({ library: false, notes: false });
  const libraryVisible = libraryOverlay ? drawers.library : !preferences.libraryCollapsed;
  const notesVisible = notesOverlay ? drawers.notes : !preferences.notesCollapsed;
  const overlayVisible = (libraryOverlay && drawers.library) || (notesOverlay && drawers.notes);
  const [dragging, setDragging] = useState(false), [importing, setImporting] = useState(false);
  const fileInput = useRef(null), folderInput = useRef(null), bodyRef = useRef(null), scrollRef = useRef(null), toastTimer = useRef(null), dragDepth = useRef(0);
  const base = useMemo(() => doc ? renderMarkdown(doc.source, doc.assets, doc.sourcePath) : emptyBase, [doc?.source, doc?.assets, doc?.sourcePath]);
  const matches = useMemo(() => findMatches(base.text, searchOpen ? query : ''), [base.text, query, searchOpen]);
  const html = useMemo(() => decorateHTML(base.html, doc?.annotations || [], matches, matchIndex), [base.html, doc?.annotations, matches, matchIndex]);

  const showToast = useCallback((message, error = false) => {
    clearTimeout(toastTimer.current); setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), error ? 8000 : 3500);
  }, []);
  const clearSelection = useCallback(() => { setSelection(null); window.getSelection()?.removeAllRanges(); }, []);
  const openFile = useCallback(() => {
    if (isDesktop) desktopRequest({ action: 'open', directory: false }).then((result) => importFiles(desktopFiles(result.files || []))).catch((error) => showToast(error.message, true));
    else fileInput.current?.click();
  }, [library.ready, library.activeId]);
  function toggleLibrary() {
    clearSelection();
    if (libraryOverlay) setDrawers((d) => ({ library: !d.library, notes: false }));
    else library.changePreferences({ libraryCollapsed: !preferences.libraryCollapsed });
  }
  function toggleNotes() {
    clearSelection();
    if (notesOverlay) setDrawers((d) => ({ library: false, notes: !d.notes }));
    else library.changePreferences({ notesCollapsed: !preferences.notesCollapsed });
  }
  function revealNotes() {
    if (notesOverlay) setDrawers((d) => ({ ...d, library: false, notes: true }));
    else if (preferences.notesCollapsed) library.changePreferences({ notesCollapsed: false });
  }
  function openFolder() {
    if (isDesktop) desktopRequest({ action: 'open', directory: true }).then((result) => importFiles(desktopFiles(result.files || []))).catch((error) => showToast(error.message, true));
    else folderInput.current?.click();
  }
  useEffect(() => {
    if (library.ready && isDesktop) desktopRequest({ action: 'ready' }).catch(() => {});
  }, [library.ready]);
  useEffect(() => {
    const incoming = (event) => importFiles(desktopFiles(event.detail || []));
    const command = (event) => {
      const action = event.detail;
      if (action === 'open') openFile();
      if (action === 'folder') openFolder();
      if (action === 'save') exportDoc('archive');
      if (action === 'print') exportDoc('print');
      if (action === 'search') setSearchOpen(true);
      if (action === 'undo' || action === 'redo') {
        if (document.activeElement?.matches('input,textarea,[contenteditable="true"]')) document.execCommand(action);
        else { action === 'undo' ? library.undo() : library.redo(); clearSelection(); }
      }
    };
    window.shiyueFlush = () => { if (doc && scrollRef.current) library.savePosition(doc.id, scrollRef.current.scrollTop); return waitForSaves(); };
    window.addEventListener('shiyue-desktop-files', incoming);
    window.addEventListener('shiyue-desktop-command', command);
    return () => { window.removeEventListener('shiyue-desktop-files', incoming); window.removeEventListener('shiyue-desktop-command', command); };
  });

  useEffect(() => {
    clearSelection(); setFocusId(null); setQuery(''); setMatchIndex(0); setNoteDialog(null);
  }, [doc?.id]);
  useEffect(() => { document.documentElement.dataset.theme = preferences.theme; }, [preferences.theme]);
  useEffect(() => { setMatchIndex(0); clearSelection(); }, [query]);
  useEffect(() => {
    if (searchOpen && matches.length) {
      const element = [...(bodyRef.current?.querySelectorAll('[data-search-ids]') || [])].find((span) => span.dataset.searchIds.split(',').includes(String(matchIndex)));
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [html, matchIndex, searchOpen]);

  function addAnnotation(type, color = 'yellow', note = '', anchor = selection) {
    if (!doc || !anchor) return;
    if (base.text.slice(anchor.start, anchor.end) !== anchor.text) { showToast('选中文字已发生变化，请重新选择。', true); clearSelection(); return; }
    const duplicate = doc.annotations.find((a) => a.start === anchor.start && a.end === anchor.end && a.type === type && (type !== 'highlight' || a.color === color));
    if (duplicate && !note) { setFocusId(duplicate.id); clearSelection(); showToast('这段文字已有相同标注。'); return; }
    const annotation = { id: annotationId(), start: anchor.start, end: anchor.end, text: anchor.text, type, color, note, createdAt: Date.now() };
    library.changeAnnotations((annotations) => [...annotations, annotation]);
    setFocusId(annotation.id); clearSelection(); showToast({ highlight: '已添加高亮', underline: '已添加下划线', note: '已保存批注' }[type]);
  }
  function openNote(annotation = null) {
    if (!annotation && !selection) return;
    setNoteDialog(annotation ? { annotation, docId: doc.id } : { anchor: selection, docId: doc.id });
    setNoteText(annotation?.note || ''); clearSelection();
  }
  function saveNote() {
    if (!noteDialog || noteDialog.docId !== doc?.id) return;
    if (noteDialog.annotation) {
      library.changeAnnotations((items) => items.map((a) => a.id === noteDialog.annotation.id ? { ...a, note: noteText.trim(), example: false } : a));
      showToast('批注已更新');
    } else addAnnotation('note', 'yellow', noteText.trim(), noteDialog.anchor);
    setNoteDialog(null);
  }
  function deleteAnnotation(id) {
    library.changeAnnotations((items) => items.filter((a) => a.id !== id));
    if (focusId === id) setFocusId(null); showToast('标注已删除，可以撤销。');
  }
  function jumpAnnotation(id) {
    clearSelection(); setFocusId(id);
    const element = [...(bodyRef.current?.querySelectorAll('[data-ann-ids]') || [])].find((span) => span.dataset.annIds.split(',').includes(id));
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (element) { element.classList.remove('mark-flash'); void element.offsetWidth; element.classList.add('mark-flash'); }
  }
  function jumpHeading(id) { clearSelection(); bodyRef.current?.querySelector(`#${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function moveMatch(direction) { if (matches.length) setMatchIndex((index) => (index + direction + matches.length) % matches.length); }

  async function importFiles(files) {
    if (!files?.length) return;
    setImporting(true); clearSelection();
    try {
      const { docs, errors } = await readFiles(files);
      if (docs.length) { await library.importDocuments(docs); showToast(`已打开 ${docs.length} 份文档，已有标注会保留。`); }
      if (errors.length) showToast(errors.slice(0, 3).join('\n'), true);
      else if (!docs.length) showToast('请选择 .md、.markdown 或 .shiyue 文件。', true);
    } catch (error) { showToast(error.message || '文件未能打开，请重试。', true); }
    finally { setImporting(false); }
  }
  async function exportDoc(type) {
    if (!doc) return;
    const name = doc.name.replace(/\.(md|markdown|mdown)$/i, '');
    try {
      let saved = false;
      if (type === 'archive') saved = await download(archiveJSON(doc), `${name}.shiyue`, 'application/json;charset=utf-8');
      if (type === 'html') saved = await download(annotatedHTML(doc), `${name}-标注.html`, 'text/html;charset=utf-8');
      if (type === 'notes') saved = await download(notesMarkdown(doc), `${name}-阅读笔记.md`, 'text/markdown;charset=utf-8');
      if (type === 'source') saved = await download(doc.source, doc.name, 'text/markdown;charset=utf-8');
      if (type === 'print') { if (isDesktop) await desktopRequest({ action: 'print' }); else window.print(); return; }
      if (saved) showToast(isDesktop ? '已保存到所选位置。' : '已导出，请在浏览器下载中查看。');
    } catch (error) { showToast(error.message || '导出未能完成，请重试。', true); }
  }

  useEffect(() => {
    const handleKey = (event) => {
      const typing = event.target.closest('input,textarea,[contenteditable="true"]');
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (command && key === 'o' && !noteDialog && !deleteDialog) { event.preventDefault(); openFile(); }
      if (command && key === 'f' && !noteDialog && !deleteDialog) { event.preventDefault(); setSearchOpen(true); }
      if (command && key === 's' && !noteDialog) { event.preventDefault(); exportDoc('archive'); }
      if (command && key === 'z' && !typing && !noteDialog && !deleteDialog) { event.preventDefault(); event.shiftKey ? library.redo() : library.undo(); clearSelection(); }
      if (command && key === 'enter' && noteDialog && noteText.trim()) { event.preventDefault(); saveNote(); }
      if (!command && !event.altKey && !typing && selection && !noteDialog) {
        if (key === 'h') { event.preventDefault(); addAnnotation('highlight'); }
        if (key === 'u') { event.preventDefault(); addAnnotation('underline'); }
        if (key === 'n') { event.preventDefault(); openNote(); }
      }
      if (event.key === 'Escape') { clearSelection(); setDrawers({ library: false, notes: false }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!library.ready) return <div className="loading-screen"><BookOpen size={38} /><span>正在打开拾页…</span></div>;
  return <div className={`app-shell ${libraryVisible ? "" : "library-collapsed"} ${notesVisible ? "" : "notes-collapsed"}`} onDragEnter={(e) => {
    if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); dragDepth.current++; setDragging(true); }
  }} onDragOver={(e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); }} onDragLeave={(e) => { e.preventDefault(); if (--dragDepth.current <= 0) { setDragging(false); dragDepth.current = 0; } }} onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); importFiles(e.dataTransfer.files); }}>
    <input ref={fileInput} className="hidden-input" type="file" accept=".md,.markdown,.mdown,.shiyue" multiple aria-label="选择 Markdown 文件" onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
    <input ref={folderInput} className="hidden-input" type="file" webkitdirectory="" multiple aria-label="选择 Markdown 文件夹" onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
    {overlayVisible && <button className="drawer-backdrop" aria-label="关闭侧栏" onClick={() => setDrawers({ library: false, notes: false })} />}
    <Library documents={library.documents} active={doc} headings={base.headings} openFile={openFile} openFolder={openFolder} selectDocument={library.selectDocument} jumpHeading={jumpHeading} requestDelete={setDeleteDialog} visible={libraryVisible} close={() => setDrawers((d) => ({ ...d, library: false }))} />
    <main className="reader-pane" aria-label="文档阅读区">
      <Header doc={doc} preferences={preferences} setPreferences={library.changePreferences} searchOpen={searchOpen} setSearchOpen={setSearchOpen} query={query} setQuery={setQuery} matches={matches} matchIndex={matchIndex} moveMatch={moveMatch} exportDoc={exportDoc} toggleLibrary={toggleLibrary} toggleNotes={toggleNotes} libraryVisible={libraryVisible} notesVisible={notesVisible} undo={() => { library.undo(); clearSelection(); }} redo={() => { library.redo(); clearSelection(); }} canUndo={library.canUndo} canRedo={library.canRedo} />
      <Reader doc={doc} base={base} html={html} preferences={preferences} bodyRef={bodyRef} scrollRef={scrollRef} selectionChanged={setSelection} savePosition={library.savePosition} progressChanged={setProgress} openFile={openFile} onMarkClick={(id) => { setFocusId(id); revealNotes(); }} />
    </main>
    <Notes key={doc?.id || 'empty'} annotations={doc?.annotations || []} focusId={focusId} jumpAnnotation={jumpAnnotation} editAnnotation={openNote} deleteAnnotation={deleteAnnotation} visible={notesVisible} close={() => setDrawers((d) => ({ ...d, notes: false }))} />
    <footer className="status-bar"><span>{doc?.annotations.length || 0} 处标注</span><span className={`save-indicator ${library.saveState}`} title={isDesktop ? "文件和标注保存在拾页应用中" : "文件和标注保存在当前浏览器中"}>{library.saveState === 'saved' ? <Check size={14} /> : library.saveState === 'error' ? <AlertCircle size={14} /> : null}{library.saveState === 'saved' ? '已自动保存' : library.saveState === 'error' ? '保存失败，请导出备份' : '保存中…'}</span><div className="reading-progress"><span>阅读进度 {doc ? progress : 0}%</span><div role="progressbar" aria-label="阅读进度" aria-valuenow={doc ? progress : 0} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${doc ? progress : 0}%` }} /></div></div></footer>
    <SelectionToolbar selection={selection} add={addAnnotation} addNote={() => openNote()} close={clearSelection} />
    {library.storageError && <div className="storage-error" role="alert"><AlertCircle size={17} />{library.storageError}<button onClick={() => exportDoc('archive')}>导出存档</button></div>}
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <AlertCircle size={17} /> : <Check size={17} />}<span>{toast.message}</span><button className="icon-button" aria-label="关闭提示" onClick={() => setToast(null)}><X size={16} /></button></div>}
    {(dragging || importing) && <div className="drop-overlay"><div><Upload size={42} strokeWidth={1.4} /><h2>{importing ? '正在打开文档…' : '松开，开始阅读'}</h2><p>Markdown 文件 · 拾页阅读存档</p></div></div>}
    {noteDialog && <Dialog title={noteDialog.annotation ? '编辑批注' : '留下一点思考'} close={() => setNoteDialog(null)} footer={<><button className="button-secondary" onClick={() => setNoteDialog(null)}>取消</button><button className="button-primary" disabled={!noteDialog.annotation && !noteText.trim()} onClick={saveNote}>保存批注</button></>}><blockquote>{(noteDialog.annotation || noteDialog.anchor).text}</blockquote><label htmlFor="note-text">你的思考</label><textarea id="note-text" autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="这段文字让你想到了什么？" maxLength={20000} rows={5} /><small>⌘ / Ctrl + Enter 保存</small></Dialog>}
    {deleteDialog && <Dialog title="从拾页移除文档" close={() => setDeleteDialog(null)} footer={<><button className="button-secondary" onClick={() => setDeleteDialog(null)}>取消</button><button className="button-danger" onClick={() => { library.deleteDocument(deleteDialog.id); setDeleteDialog(null); showToast('文档已从拾页移除。'); }}>移除文档</button></>}><p>移除「{deleteDialog.name}」及其在拾页中的标注？电脑上的原始文件会保留。</p>{deleteDialog.annotations.length > 0 && <button className="backup-before-delete" onClick={async () => { try { const saved = await download(archiveJSON(deleteDialog), `${deleteDialog.name.replace(/\.md$/i, '')}.shiyue`, 'application/json;charset=utf-8'); if (saved) showToast('已导出阅读存档。'); } catch (error) { showToast(error.message, true); } }}>先导出含 {deleteDialog.annotations.length} 处标注的阅读存档</button>}</Dialog>}
  </div>;
}

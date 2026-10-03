import { useEffect, useRef } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { readSelection } from '../lib/markdown';

export function Reader({ doc, base, html, preferences, bodyRef, scrollRef, selectionChanged, savePosition, progressChanged, openFile, onMarkClick }) {
  const saveTimer = useRef(null);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !doc) return;
    let done = false;
    const restore = () => {
      if (done) return;
      scroll.scrollTop = doc.scrollTop || 0;
      progressChanged(scroll.scrollHeight <= scroll.clientHeight ? 100 : Math.round(scroll.scrollTop / (scroll.scrollHeight - scroll.clientHeight) * 100));
      done = true;
    };
    const frame = requestAnimationFrame(restore);
    const save = () => { clearTimeout(saveTimer.current); savePosition(doc.id, scroll.scrollTop); };
    const visibility = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); save(); window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', visibility); };
  }, [doc?.id]);

  return <div className="reading-scroll" ref={scrollRef} onScroll={(event) => {
    const element = event.currentTarget;
    progressChanged(element.scrollHeight <= element.clientHeight ? 100 : Math.round(element.scrollTop / (element.scrollHeight - element.clientHeight) * 100));
    selectionChanged(null);
    clearTimeout(saveTimer.current);
    if (doc) saveTimer.current = setTimeout(() => savePosition(doc.id, element.scrollTop), 250);
  }}>
    {!doc ? <div className="reader-empty"><BookOpen size={48} strokeWidth={1.2} /><h1>打开一页，留下一点思考。</h1><p>支持 Markdown 文件与拾页阅读存档。</p><button className="open-button" onClick={openFile}><FileText size={18} />打开文件</button></div> : <article className={`article article-${preferences.width}`} style={{ '--reading-size': `${preferences.fontSize}px`, '--reading-leading': preferences.lineHeight }}>
      <p className="article-meta">{doc.id === 'shiyue-welcome' ? '使用指南' : 'Markdown 文档'} · 约 {Math.max(1, Math.ceil(base.text.replace(/\s/g, '').length / 450))} 分钟</p>
      {doc.source.trim() ? <div className="markdown-body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: html }} onMouseUp={() => requestAnimationFrame(() => selectionChanged(readSelection(bodyRef.current)))} onTouchEnd={() => setTimeout(() => selectionChanged(readSelection(bodyRef.current)), 80)} onKeyUp={(event) => { if (event.key === 'Shift') selectionChanged(readSelection(bodyRef.current)); }} onClick={(event) => {
        if (window.getSelection()?.toString().trim()) return;
        const span = event.target.closest('[data-ann-ids]');
        if (span) onMarkClick(span.dataset.annIds.split(',')[0]);
        const anchor = event.target.closest('a[href^="#"]');
        if (anchor) {
          event.preventDefault();
          const target = decodeURIComponent(anchor.getAttribute('href').slice(1));
          const heading = base.headings.find((h) => h.id === target || h.label.toLowerCase().replace(/\s+/g, '-') === target.toLowerCase());
          if (heading) bodyRef.current.querySelector(`#${heading.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }} /> : <div className="empty-document"><FileText size={36} strokeWidth={1.3} /><h1>这份文件还是空的</h1><p>可以打开另一份 Markdown 文件继续阅读。</p></div>}
      <div className="article-end"><span />读到这里，留下一点自己的想法。<span /></div>
    </article>}
  </div>;
}

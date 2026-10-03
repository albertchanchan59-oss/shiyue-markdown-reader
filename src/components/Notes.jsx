import { useState } from 'react';
import { MessageSquare, Underline, Pencil, Trash2, X, Bookmark } from 'lucide-react';
import { COLORS } from '../lib/annotations';

export function Notes({ annotations, focusId, jumpAnnotation, editAnnotation, deleteAnnotation, visible, close }) {
  const [filter, setFilter] = useState('all');
  const items = [...annotations].filter((a) => filter === 'all' || a.type === filter).sort((a, b) => a.start - b.start);
  return <aside id="reading-notes" hidden={!visible} className={`notes panel ${visible ? 'drawer-visible' : ''}`} aria-label="阅读笔记">
    <div className="notes-heading"><h2>阅读笔记</h2><span className="note-count">{annotations.length}</span><button className="icon-button drawer-close" onClick={close} aria-label="收起笔记栏"><X size={20} /></button></div>
    <div className="notes-tabs" role="tablist" aria-label="标注筛选">{[['all', '全部'], ['highlight', '高亮'], ['underline', '下划线']].map(([type, label]) => <button key={type} role="tab" aria-selected={filter === type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{label}</button>)}</div>
    <div className="notes-list">
      {items.map((a) => <section key={a.id} className={`note-row ${focusId === a.id ? 'focused' : ''}`} data-note-id={a.id}>
        <div className="note-meta"><span className="note-type">{a.type === 'highlight' ? <i className="note-dot" style={{ background: COLORS[a.color].dot }} /> : a.type === 'underline' ? <Underline size={17} /> : <MessageSquare size={16} />}
          {{ highlight: '高亮', underline: '下划线', note: '批注' }[a.type]}</span><span className="note-date">{a.example ? '示例' : new Date(a.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
          <button className="icon-button" title="编辑批注" aria-label={`编辑批注：${a.text.slice(0, 12)}`} onClick={() => editAnnotation(a)}><Pencil size={14} /></button>
          <button className="icon-button note-delete" title="删除标注（可撤销）" aria-label={`删除标注：${a.text.slice(0, 12)}`} onClick={() => deleteAnnotation(a.id)}><Trash2 size={14} /></button>
        </div>
        <button className="note-quote" onClick={() => { jumpAnnotation(a.id); close(); }} title="回到原文">“{a.text}”</button>
        <button className={`note-comment ${a.note ? '' : 'add-comment'}`} onClick={() => editAnnotation(a)}>{a.note || '添加一条自己的思考…'}</button>
      </section>)}
      {!items.length && <div className="notes-empty"><Bookmark size={30} strokeWidth={1.3} /><p>{annotations.length ? '还没有这类标注' : '留下一句值得记住的话'}</p><span>选中文字，即可高亮、划线或批注。</span></div>}
    </div>
  </aside>;
}

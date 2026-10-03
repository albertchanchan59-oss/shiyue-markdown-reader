import { Underline, MessageSquare, X } from 'lucide-react';
import { COLORS } from '../lib/annotations';

export function SelectionToolbar({ selection, add, addNote, close }) {
  if (!selection) return null;
  const mobile = window.innerWidth < 600;
  const width = mobile ? Math.min(320, window.innerWidth - 24) : 304;
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, selection.rect.right - width / 3));
  const top = mobile ? undefined : (selection.rect.top > 140 ? selection.rect.top - 44 : Math.min(window.innerHeight - 62, selection.rect.bottom + 12));
  return <div className={`selection-toolbar ${mobile ? 'mobile-toolbar' : ''}`} style={{ left, top, width }} role="toolbar" aria-label="文字标注工具" onMouseDown={(e) => e.preventDefault()}>
    <div className="color-tools">{Object.entries(COLORS).map(([color, value]) => <button key={color} className="color-button" style={{ '--swatch': value.dot }} title={`${value.label}高亮 (H)`} aria-label={`${value.label}高亮`} onClick={() => add('highlight', color)}><span /></button>)}</div>
    <i className="toolbar-divider" />
    <button className="icon-button" title="下划线 (U)" aria-label="添加下划线" onClick={() => add('underline')}><Underline size={21} /></button>
    <button className="icon-button" title="批注 (N)" aria-label="添加批注" onClick={addNote}><MessageSquare size={20} /></button>
    <button className="icon-button selection-close" title="取消选择" aria-label="取消选择" onClick={close}><X size={15} /></button>
  </div>;
}

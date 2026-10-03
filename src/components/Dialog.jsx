import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, children, close, footer, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => {
    if (event.target === ref.current) {
      const bounds = ref.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  }}><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="关闭对话框" onClick={close}><X size={20} /></button></div><div className="dialog-content">{children}</div><div className="dialog-footer">{footer}</div></dialog>;
}

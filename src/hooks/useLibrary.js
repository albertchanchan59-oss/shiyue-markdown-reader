import { useEffect, useRef, useState } from 'react';
import { isDesktop } from '../lib/desktop';
import { createWelcome } from '../data/welcome';
import { loadLibrary, saveDocument, removeDocument, savePreferences } from '../lib/storage';

export function useLibrary() {
  const [documents, setDocuments] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [preferences, setPreferences] = useState({ fontSize: 18, lineHeight: 1.85, width: 'normal', theme: 'light', libraryCollapsed: false, notesCollapsed: false });
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const [storageError, setStorageError] = useState('');
  const [, updateHistory] = useState(0);
  const docsRef = useRef([]), prefsRef = useRef(preferences), historyRef = useRef({}), sequence = useRef(0);

  function persist(promise) {
    const ticket = ++sequence.current;
    setSaveState('saving');
    promise.then(() => {
      if (ticket === sequence.current) { setSaveState('saved'); setStorageError(''); }
    }).catch(() => {
      setSaveState('error');
      setStorageError('本地保存失败。请导出阅读存档，保留原文和标注。');
    });
  }

  useEffect(() => {
    let live = true;
    async function boot() {
      try {
        const data = await loadLibrary();
        if (!live) return;
        const docs = data.preferences.initialized ? data.documents : [createWelcome()];
        const prefs = { ...prefsRef.current, ...data.preferences, initialized: true };
        // Discard unsupported preferences rather than allowing bad imported state to break the layout.
        prefs.fontSize = [18, 20, 22, 24, 26].includes(prefs.fontSize) ? prefs.fontSize : 18;
        prefs.lineHeight = [1.6, 1.85, 2.1].includes(prefs.lineHeight) ? prefs.lineHeight : 1.85;
        prefs.width = ['normal', 'wide'].includes(prefs.width) ? prefs.width : 'normal';
        prefs.theme = prefs.theme === 'dark' ? 'dark' : 'light';
        prefs.libraryCollapsed = prefs.libraryCollapsed === true;
        prefs.notesCollapsed = prefs.notesCollapsed === true;
        const id = docs.some((d) => d.id === prefs.activeId) ? prefs.activeId : docs[0]?.id || null;
        docsRef.current = docs; prefsRef.current = { ...prefs, activeId: id };
        setDocuments(docs); setPreferences(prefsRef.current); setActiveId(id);
        if (!data.preferences.initialized) {
          await saveDocument(docs[0]);
          await savePreferences(prefsRef.current);
        }
      } catch {
        if (!live) return;
        const docs = [createWelcome()];
        docsRef.current = docs; setDocuments(docs); setActiveId(docs[0].id);
        setSaveState('error'); setStorageError(isDesktop ? '本地资料库未能打开。可以继续阅读，请用阅读存档保存标注。' : '浏览器未能开启本地存储。可以继续阅读，请用阅读存档保存标注。');
      } finally { if (live) setReady(true); }
    }
    boot();
    return () => { live = false; };
  }, []);

  function changePreferences(update) {
    const next = { ...prefsRef.current, ...update, initialized: true };
    prefsRef.current = next; setPreferences(next); persist(savePreferences(next));
  }
  function selectDocument(id) { setActiveId(id); changePreferences({ activeId: id }); }

  function commitDocument(doc) {
    const next = docsRef.current.map((d) => d.id === doc.id ? doc : d);
    docsRef.current = next; setDocuments(next); persist(saveDocument(doc));
  }

  function changeAnnotations(transform) {
    const doc = docsRef.current.find((d) => d.id === activeId);
    if (!doc) return;
    const annotations = typeof transform === 'function' ? transform(doc.annotations) : transform;
    const history = historyRef.current[doc.id] ||= { past: [], future: [] };
    history.past = [...history.past, doc.annotations].slice(-50); history.future = [];
    commitDocument({ ...doc, annotations, updatedAt: Date.now() });
    updateHistory((n) => n + 1);
  }

  function historyAction(direction) {
    const doc = docsRef.current.find((d) => d.id === activeId);
    const history = doc && historyRef.current[doc.id];
    if (!history) return;
    const from = direction === 'undo' ? history.past : history.future;
    const to = direction === 'undo' ? history.future : history.past;
    if (!from.length) return;
    to.push(doc.annotations);
    const annotations = from.pop();
    commitDocument({ ...doc, annotations, updatedAt: Date.now() });
    updateHistory((n) => n + 1);
  }

  async function importDocuments(incoming) {
    const current = [...docsRef.current];
    for (const doc of incoming) {
      const index = current.findIndex((d) => d.id === doc.id);
      let merged = doc;
      if (index >= 0) {
        const existing = current[index];
        const annotations = new Map(doc.annotations.map((a) => [a.id, a]));
        for (const a of existing.annotations) annotations.set(a.id, a);
        merged = { ...doc, createdAt: existing.createdAt, scrollTop: existing.scrollTop,
          // Original rendered anchors remain stable when reopening the same source.
          assets: { ...existing.assets, ...doc.assets },
          annotations: [...annotations.values()] };
        current[index] = merged;
      } else current.unshift(merged);
      persist(saveDocument(merged));
    }
    docsRef.current = current; setDocuments(current);
    if (incoming.length) selectDocument(incoming[0].id);
  }

  function deleteDocument(id) {
    const next = docsRef.current.filter((d) => d.id !== id);
    docsRef.current = next; setDocuments(next); delete historyRef.current[id];
    persist(removeDocument(id));
    if (id === activeId) selectDocument(next[0]?.id || null);
  }

  function savePosition(id, scrollTop) {
    const doc = docsRef.current.find((d) => d.id === id);
    if (doc && Math.abs((doc.scrollTop || 0) - scrollTop) > 2) commitDocument({ ...doc, scrollTop });
  }

  return {
    documents, active: documents.find((d) => d.id === activeId), activeId, ready,
    preferences, saveState, storageError, selectDocument, changePreferences,
    changeAnnotations, importDocuments, deleteDocument, savePosition,
    undo: () => historyAction('undo'), redo: () => historyAction('redo'),
    canUndo: Boolean(historyRef.current[activeId]?.past.length),
    canRedo: Boolean(historyRef.current[activeId]?.future.length),
  };
}

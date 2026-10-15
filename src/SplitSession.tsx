import { useEffect, useRef, useState } from 'react';
import './split-session.css';

type Props = { onClose: () => void; onMove: (direction: 'right' | 'below') => void; onFocus: () => void; focused: boolean; sessionTitles: string[] };
type Message = { id: string; role: 'user' | 'assistant'; text: string };
type Session = { id: string; title: string; draft: string; messages: Message[] };
type Saved = { sessions: Session[]; active: string; model: string; permission: string };
const key = 'cw.splitSession';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
function initial(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (value && Array.isArray(value.sessions) && value.sessions.length && value.sessions.every((s: Session) => typeof s.id === 'string' && typeof s.title === 'string' && typeof s.draft === 'string' && Array.isArray(s.messages) && s.messages.every(m => typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant')))) {
      return { sessions: value.sessions, active: value.sessions.some((s: Session) => s.id === value.active) ? value.active : value.sessions[0].id, model: value.model || 'Sonnet', permission: value.permission || 'Ask before edits' };
    }
  } catch { /* Use a fresh local session if stored data is unavailable. */ }
  const id = uid();
  return { sessions: [{ id, title: 'New session', draft: '', messages: [] }], active: id, model: 'Sonnet', permission: 'Ask before edits' };
}

export default function SplitSession({ onClose, onMove, onFocus, focused, sessionTitles }: Props) {
  const [saved, setSaved] = useState<Saved>(initial);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [running, setRunning] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const active = saved.sessions.find(s => s.id === saved.active) || saved.sessions[0];

  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(saved)); setStorageError(false); } catch { setStorageError(true); } }, [saved]);
  useEffect(() => { const focus = () => input.current?.focus(); window.addEventListener('focus-secondary-pane', focus); return () => window.removeEventListener('focus-secondary-pane', focus); }, []);
  useEffect(() => () => { generation.current++; if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'smooth' }); }, [active.messages, running]);
  const update = (fn: (s: Session) => Session) => setSaved(s => ({ ...s, sessions: s.sessions.map(item => item.id === s.active ? fn(item) : item) }));
  function cancel() { generation.current++; if (timer.current) clearTimeout(timer.current); timer.current = null; setRunning(false); }
  function select(id: string) { cancel(); setSaved(s => ({ ...s, active: id })); setRenaming(false); setMenu(false); }
  function create(name = 'New session') {
    cancel(); const id = uid();
    setSaved(s => ({ ...s, active: id, sessions: [...s.sessions, { id, title: name, draft: '', messages: name === 'New session' ? [] : [{ id: uid(), role: 'assistant', text: `This is a local demo of “${name}”. No original conversation or workspace files have been loaded. What would you like to explore?` }] }] }));
    setMenu(false); setRenaming(false); requestAnimationFrame(() => input.current?.focus());
  }
  function send() {
    const prompt = active.draft.trim(); if (!prompt || running) return;
    const sessionId = active.id; const token = ++generation.current;
    update(s => ({ ...s, title: s.title === 'New session' ? prompt.slice(0, 42) : s.title, draft: '', messages: [...s.messages, { id: uid(), role: 'user', text: prompt }] }));
    setRunning(true);
    timer.current = setTimeout(() => {
      if (generation.current !== token) return;
      const text = saved.permission === 'Plan mode' ? 'I’d start by identifying the files involved, outlining the smallest change, and checking the expected behavior before making edits.\n\nThis is a local interface demo: no model is connected and no files were read or changed.' : 'I can help break that down into a focused coding task. Share the relevant code or describe the expected behavior, and we can work through an implementation.\n\nThis is a local interface demo: no model is connected and no commands were run.';
      setSaved(s => ({ ...s, sessions: s.sessions.map(item => item.id === sessionId ? { ...item, messages: [...item.messages, { id: uid(), role: 'assistant', text }] } : item) }));
      timer.current = null; setRunning(false);
    }, 1400);
  }
  function rename() { const value = title.trim(); if (value) update(s => ({ ...s, title: value })); setRenaming(false); }
  const externalTitles = [...new Set(sessionTitles)].filter(t => !saved.sessions.some(s => s.title === t));

  return <section className={`cw-split-session${focused ? ' is-focused' : ''}`} onFocusCapture={onFocus} onPointerDown={onFocus} aria-label="Secondary session pane">
    <header className="cw-split-header">
      <span className="cw-split-mark" aria-hidden="true">✳</span>
      {renaming ? <input className="cw-split-rename" aria-label="Session name" value={title} autoFocus onChange={e => setTitle(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setRenaming(false); }} /> : <select className="cw-split-session-select" aria-label="Select secondary session" value={active.id} onChange={e => e.target.value.startsWith('existing:') ? create(e.target.value.slice(9)) : select(e.target.value)}>
        <optgroup label="Sessions in this pane">{saved.sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>
        {externalTitles.length > 0 && <optgroup label="Open existing session (demo)">{externalTitles.map(t => <option key={t} value={`existing:${t}`}>{t}</option>)}</optgroup>}
      </select>}
      <button className="cw-split-icon" title="New session" aria-label="New session in secondary pane" onClick={() => create()}>+</button>
      <div className="cw-split-menu-wrap">
        <button className="cw-split-icon" aria-label="Pane options" aria-expanded={menu} onClick={() => setMenu(v => !v)}>⋯</button>
        {menu && <><button className="cw-split-menu-dismiss" aria-label="Dismiss pane menu" onClick={() => setMenu(false)} /><div className="cw-split-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenu(false); }}>
          <button role="menuitem" onClick={() => { setTitle(active.title); setRenaming(true); setMenu(false); }}>Rename session</button>
          <button role="menuitem" onClick={() => { onMove('right'); setMenu(false); }}>Move pane right <span>◧</span></button>
          <button role="menuitem" onClick={() => { onMove('below'); setMenu(false); }}>Move pane below <span>⬒</span></button>
          <div className="cw-split-menu-divider" />
          <button role="menuitem" onClick={() => { cancel(); onClose(); }}>Close pane <span>×</span></button>
        </div></>}
      </div>
    </header>
    <div className="cw-split-transcript" ref={transcript}>
      {active.messages.length === 0 ? <div className="cw-split-empty"><span aria-hidden="true">✳</span><h2>What are we working on?</h2><p>Start another conversation alongside your current task.</p><button onClick={() => { update(s => ({ ...s, draft: 'Help me plan a small, testable refactor.' })); input.current?.focus(); }}>Plan a refactor <span>↗</span></button></div> : active.messages.map(message => <article className={`cw-split-message ${message.role}`} key={message.id}><div className="cw-split-message-label">{message.role === 'user' ? 'You' : '✳ Claude'}</div><div>{message.text}</div></article>)}
      {running && <div className="cw-split-thinking" role="status"><span>✳</span> Thinking…</div>}
    </div>
    <div className="cw-split-bottom">
      {storageError && <p className="cw-split-storage" role="status">Local storage is unavailable. This session will last until you close the page.</p>}
      <form className="cw-split-composer" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea ref={input} aria-label="Message secondary session" placeholder="Ask Claude to help with a task…" value={active.draft} rows={3} onChange={e => update(s => ({ ...s, draft: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="cw-split-composer-tools"><select aria-label="Secondary session permission mode" value={saved.permission} onChange={e => setSaved(s => ({ ...s, permission: e.target.value }))}><option>Ask before edits</option><option>Plan mode</option><option>Accept edits</option></select><span className="cw-split-tools-spacer" /><select aria-label="Secondary session model" value={saved.model} onChange={e => setSaved(s => ({ ...s, model: e.target.value }))}><option>Sonnet</option><option>Opus</option><option>Haiku</option></select>{running ? <button className="cw-split-send" type="button" aria-label="Stop response" title="Stop response" onClick={cancel}>■</button> : <button className="cw-split-send" type="submit" aria-label="Send message" disabled={!active.draft.trim()}>↑</button>}</div>
      </form>
      <p className="cw-split-footnote">Local demo · Shift + Enter for a new line</p>
    </div>
  </section>;
}

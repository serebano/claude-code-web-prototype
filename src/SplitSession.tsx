import {runResponse} from './api/client';
import {scheduleWorkspaceSave} from './workspaceApi';
import { useEffect, useRef, useState } from 'react';
import './split-session.css';
import { WorkspaceMenu } from './WorkspaceMenus';

type Props = { onClose: () => void; onMove: (direction: 'right' | 'below') => void; onFocus: () => void; focused: boolean; sessions: { id: string; title: string; messages: { role: 'user' | 'assistant'; text: string }[] }[]; bypass?: boolean };
type Message = { id: string; role: 'user' | 'assistant'; text: string };
type Session = { id: string; title: string; draft: string; messages: Message[]; sourceId?: string; sourceTitle?: string };
type Saved = { sessions: Session[]; active: string; model: string; permission: string };
const key = 'cw.splitSession';
const models = ['Opus 5.5', 'Fable 5.1', 'Sonnet 5.5', 'Haiku 5.5'];
const permissions = ['Manual', 'Auto', 'Accept edits', 'Plan'];
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
function initial(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (value && Array.isArray(value.sessions) && value.sessions.length && value.sessions.every((s: Session) => typeof s.id === 'string' && typeof s.title === 'string' && typeof s.draft === 'string' && Array.isArray(s.messages) && s.messages.every(m => typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant')))) {
      return { sessions: value.sessions, active: value.sessions.some((s: Session) => s.id === value.active) ? value.active : value.sessions[0].id, model: models.includes(value.model) ? value.model : 'Sonnet 5.5', permission: [...permissions, 'Bypass permissions'].includes(value.permission) ? value.permission : value.permission === 'Plan mode' ? 'Plan' : 'Manual' };
    }
  } catch { /* Use a fresh local session if stored data is unavailable. */ }
  const id = uid();
  return { sessions: [{ id, title: 'New session', draft: '', messages: [] }], active: id, model: 'Sonnet 5.5', permission: 'Manual' };
}

export default function SplitSession({ onClose, onMove, onFocus, focused, sessions, bypass = false }: Props) {
  const [saved, setSaved] = useState<Saved>(initial);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [running, setRunning] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const renameCancelled = useRef(false);
  const renameFinished = useRef(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const sessionPicker = useRef<HTMLSelectElement>(null);
  const effectivePermission = !bypass && saved.permission === 'Bypass permissions' ? 'Manual' : saved.permission;
  const active = saved.sessions.find(s => s.id === saved.active) || saved.sessions[0];

  useEffect(() => { if (!bypass && saved.permission === 'Bypass permissions') setSaved(s => ({ ...s, permission: 'Manual' })); }, [bypass, saved.permission]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(saved)); scheduleWorkspaceSave(); setStorageError(false); } catch { setStorageError(true); } }, [saved]);
  useEffect(() => { const focus = () => input.current?.focus(); window.addEventListener('focus-secondary-pane', focus); return () => window.removeEventListener('focus-secondary-pane', focus); }, []);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'smooth' }); }, [active.messages, running]);
  const update = (fn: (s: Session) => Session) => setSaved(s => ({ ...s, sessions: s.sessions.map(item => item.id === s.active ? fn(item) : item) }));
  function cancel() { generation.current++; controller.current?.abort(); controller.current = null; setRunning(false); }
  function select(id: string) { cancel(); setSaved(s => ({ ...s, active: id })); setRenaming(false); setMenu(false); }
  function create(source?: Props['sessions'][number]) {
    cancel(); const id = uid();
    setSaved(s => ({ ...s, active: id, sessions: [...s.sessions, { id, title: source ? `${source.title} · fork` : 'New session', draft: '', sourceId: source?.id, sourceTitle: source?.title, messages: source ? source.messages.map(message => ({ ...message, id: uid() })) : [] }] }));
    setMenu(false); setRenaming(false); requestAnimationFrame(() => input.current?.focus());
  }
  function openSource(id: string) {
    const source = sessions.find(s => s.id === id); if (!source) return;
    const fork = saved.sessions.find(s => s.sourceId === id);
    if (fork) select(fork.id); else create(source);
  }
  async function send() {
    const prompt = active.draft.trim(); if (!prompt || controller.current) return;
    const sessionId = active.id, token = ++generation.current, request = new AbortController();
    controller.current = request;
    update(s => ({ ...s, title: s.title === 'New session' ? prompt.slice(0, 42) : s.title, draft: '', messages: [...s.messages, { id: uid(), role: 'user', text: prompt }] }));
    setRunning(true);
    try {
      const response = await runResponse({sessionId,prompt,permission:effectivePermission,model:saved.model,effort:'Medium',channel:'secondary'},request.signal);
      if (generation.current !== token || request.signal.aborted) return;
      setSaved(s => ({ ...s, sessions: s.sessions.map(item => item.id === sessionId ? { ...item, messages: [...item.messages, { id: uid(), role: 'assistant', text: response.text }] } : item) }));
    } catch(error) {
      if(!request.signal.aborted && generation.current === token) setSaved(s=>({...s,sessions:s.sessions.map(item=>item.id===sessionId?{...item,messages:[...item.messages,{id:uid(),role:'assistant',text:'The mock service could not respond. Your message is saved; try again.'}]}:item)}));
    } finally { if(controller.current === request){controller.current=null;setRunning(false);} }
  }
  function rename() {
    if (renameFinished.current) return; renameFinished.current = true;
    const value = title.trim(); if (!renameCancelled.current && value) update(s => ({ ...s, title: value }));
    setRenaming(false);
  }
  function startRename() { renameCancelled.current = false; renameFinished.current = false; setTitle(active.title); setRenaming(true); }
  function label(id: string, title: string, list: {id: string; title: string}[]) {
    return list.filter(s => s.title === title).length > 1 ? `${title} (${list.findIndex(s => s.id === id) + 1})` : title;
  }

  return <section className={`cw-split-session${focused ? ' is-focused' : ''}`} onFocusCapture={onFocus} onPointerDown={onFocus} aria-label="Secondary session pane">
    <header className="cw-split-header">
      <span className="cw-split-mark" aria-hidden="true">✳</span>
      {renaming ? <input className="cw-split-rename" aria-label="Session name" value={title} autoFocus onChange={e => setTitle(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); rename(); requestAnimationFrame(() => sessionPicker.current?.focus()); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renameCancelled.current = true; rename(); requestAnimationFrame(() => sessionPicker.current?.focus()); } }} /> : <select ref={sessionPicker} className="cw-split-session-select" aria-label="Select secondary session" value={active.id} onChange={e => e.target.value.startsWith('existing:') ? openSource(e.target.value.slice(9)) : select(e.target.value)}>
        <optgroup label="Sessions in this pane">{saved.sessions.map(s => <option key={s.id} value={s.id}>{label(s.id, s.title, saved.sessions)}</option>)}</optgroup>
        {sessions.length > 0 && <optgroup label="Existing sessions · independent fork">{sessions.map(s => <option key={s.id} value={`existing:${s.id}`}>{label(s.id, s.title, sessions)}</option>)}</optgroup>}
      </select>}
      <button className="cw-split-icon" title="New session" aria-label="New session in secondary pane" onClick={() => create()}>+</button>
      <div className="cw-split-menu-wrap">
        <button ref={menuTrigger} className="cw-split-icon" aria-label="Pane options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(v => !v)}>⋯</button>
        {menu && <><button className="cw-split-menu-dismiss" tabIndex={-1} aria-label="Dismiss pane menu" onClick={() => { setMenu(false); menuTrigger.current?.focus(); }} /><WorkspaceMenu className="cw-split-menu" label="Secondary pane options" close={() => setMenu(false)} items={[
          { label: 'Rename session', action: startRename },
          { label: 'Move pane right', action: () => onMove('right') },
          { label: 'Move pane below', action: () => onMove('below') },
          { label: '', separator: true },
          { label: 'Close pane', action: () => { cancel(); onClose(); } },
        ]} /></>}

      </div>
    </header>
    <div className="cw-split-transcript" ref={transcript}>
      {active.sourceId && <p className="cw-split-fork-note">Independent fork of “{active.sourceTitle}”. New messages stay in this pane.</p>}
      {active.messages.length === 0 ? <div className="cw-split-empty"><span aria-hidden="true">✳</span><h2>What are we working on?</h2><p>Start another conversation alongside your current task.</p><button onClick={() => { update(s => ({ ...s, draft: 'Help me plan a small, testable refactor.' })); input.current?.focus(); }}>Plan a refactor <span>↗</span></button></div> : active.messages.map(message => <article className={`cw-split-message ${message.role}`} key={message.id}><div className="cw-split-message-label">{message.role === 'user' ? 'You' : '✳ Claude'}</div><div>{message.text}</div></article>)}
      {running && <div className="cw-split-thinking" role="status"><span>✳</span> Thinking…</div>}
    </div>
    <div className="cw-split-bottom">
      {storageError && <p className="cw-split-storage" role="status">Local storage is unavailable. This session will last until you close the page.</p>}
      <form className="cw-split-composer" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea ref={input} aria-label="Message secondary session" placeholder="Ask Claude to help with a task…" value={active.draft} rows={3} onChange={e => update(s => ({ ...s, draft: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="cw-split-composer-tools"><select aria-label="Secondary session permission mode" value={effectivePermission} onChange={e => setSaved(s => ({ ...s, permission: e.target.value }))}>{permissions.map(mode => <option key={mode}>{mode}</option>)}{bypass && <option>Bypass permissions</option>}</select><span className="cw-split-tools-spacer" /><select aria-label="Secondary session model" value={saved.model} onChange={e => setSaved(s => ({ ...s, model: e.target.value }))}>{models.map(model => <option key={model}>{model}</option>)}</select>{running ? <button className="cw-split-send" type="button" aria-label="Stop response" title="Stop response" onClick={cancel}>■</button> : <button className="cw-split-send" type="submit" aria-label="Send message" disabled={!active.draft.trim()}>↑</button>}</div>
      </form>
      <p className="cw-split-footnote">Local demo · Shift + Enter for a new line</p>
    </div>
  </section>;
}

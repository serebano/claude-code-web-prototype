import {useEffect,useRef} from 'react';
import {Check} from 'lucide-react';
export type MenuEntry={label:string;shortcut?:string;action?:()=>void;checked?:boolean;disabled?:boolean;danger?:boolean;separator?:boolean;description?:string;icon?:React.ReactNode};
export function WorkspaceMenu({items,label,close,className=''}:{items:MenuEntry[];label:string;close:()=>void;className?:string}){
 const ref=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLElement|null>(null);
 const search=useRef('');
 const searchAt=useRef(0);
 useEffect(()=>{
   const active=document.activeElement;
   trigger.current=active instanceof HTMLElement && active!==document.body && !ref.current?.contains(active)
     ? active
     : ref.current?.parentElement?.querySelector<HTMLElement>('[aria-expanded="true"], [aria-haspopup="menu"]') ?? null;
   ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
 },[]);
 const dismiss=()=>{trigger.current?.isConnected&&trigger.current.focus();close()};
 return <div ref={ref} className={'workspace-menu '+className} role="menu" aria-label={label} onKeyDown={e=>{
   const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);
   const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
     e.preventDefault();e.stopPropagation();
     const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:index<0?(e.key==='ArrowDown'?0:buttons.length-1):(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
     buttons[next]?.focus();
   }else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss()}
   else if(e.key==='Tab'){dismiss()}
   else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){
     e.preventDefault();e.stopPropagation();
     const now=Date.now();search.current=now-searchAt.current>700?e.key.toLowerCase():search.current+e.key.toLowerCase();searchAt.current=now;
     const query=search.current.split('').every(c=>c===search.current[0])?search.current[0]:search.current;
     for(let step=1;step<=buttons.length;step++){const button=buttons[(index+step+buttons.length)%buttons.length];if(button.querySelector('.menu-label')?.textContent?.trim().toLowerCase().startsWith(query)){button.focus();break}}
   }
 }}>
 {items.map((item,i)=>item.separator?<div className="menu-separator" role="separator" key={i}/>:<button role={item.checked!==undefined?'menuitemcheckbox':'menuitem'} aria-checked={item.checked} key={i} disabled={item.disabled} className={item.danger?'danger':''} onClick={()=>{dismiss();item.action?.()}}><span className="menu-icon">{item.checked?<Check size={15}/>:item.icon}</span><span className="menu-label">{item.label}{item.description&&<small>{item.description}</small>}</span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}</button>)}
 </div>
}

export const shortcutGroups=[
 ['Workspace',[['New session','⌘ N'],['Command palette','⌘ K'],['Search sessions','⇧ ⌘ K'],['Show / hide sidebar','⌘ B'],['Settings','⌘ ,'],['Keyboard shortcuts','⌘ /'],['Previous session','⇧ ⌘ ['],['Next session','⇧ ⌘ ]'],['Back','⌘ ['],['Forward','⌘ ]']]],
 ['Panels',[['Changes','⇧ ⌘ D'],['Files','⇧ ⌘ F'],['Browser','⇧ ⌘ B'],['Preview','⇧ ⌘ P'],['Terminal','⌃ `'],['Side chat','⌘ ;'],['Close pane','⌘ \\']]],
 ['Split view',[['New session on the right','⌃ ⌘ \\'],['New session below','⌃ ⌘ −'],['Focus next split','⌃ ]'],['Focus previous split','⌃ ['],['Close split view','⌃ ⌘ W']]],
 ['Conversation',[['Send message','Enter'],['Insert a new line','⇧ Enter'],['Close menu or dialog','Esc']]]
] as const;
export function KeyboardHelp(){return <div className="keyboard-help"><h2>Keyboard shortcuts</h2><p>Move through your workspace without leaving the keyboard.</p><div className="shortcut-grid">{shortcutGroups.map(([group,items])=><section key={group}><h3>{group}</h3>{items.map(([label,keys])=><div key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}</section>)}</div><footer>On Windows and Linux, use Ctrl in place of ⌘. Some browser-reserved shortcuts may stay with your browser; all commands are also available in menus.</footer></div>}

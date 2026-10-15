import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Check,ChevronRight} from 'lucide-react';
import {createPortal} from 'react-dom';
export type MenuEntry={label:string;shortcut?:string;action?:()=>void;checked?:boolean;disabled?:boolean;danger?:boolean;separator?:boolean;description?:string;icon?:React.ReactNode;children?:MenuEntry[];heading?:boolean;radio?:boolean};
type Props={items:MenuEntry[];label:string;close:()=>void;className?:string;anchor?:HTMLElement|null;onSelect?:()=>void;description?:string};

function modelEntries(items:MenuEntry[]):MenuEntry[]{
 const efforts=items.filter(item=>item.label.endsWith(' effort'));
 const models=items.filter(item=>!item.separator&&!item.label.endsWith(' effort')&&item.label!=='Enable fast mode');
 const current=efforts.find(item=>item.checked)?.label.replace(' effort','')||'Medium';
 const fast=items.find(item=>item.label==='Enable fast mode');
 return [{label:'Model · this session',heading:true},...models.slice(0,4).map(item=>({...item,radio:true})),
  {label:'Effort',shortcut:current,children:efforts.map(item=>({...item,label:item.label.replace(' effort',''),radio:true,description:item.label==='Medium effort'?'Recommended':item.label==='Max effort'?'3.5× or more usage':undefined})),description:'Higher effort means more thorough responses, but takes longer and uses your limits faster.'},
  {label:'More models',children:models.length>4?models.slice(4).map(item=>({...item,radio:true})):[{label:'No additional demo models',disabled:true}]},
  ...(fast?[{label:'',separator:true},{label:'Fast mode',heading:true},fast]:[])];
}

export function WorkspaceMenu({items,label,close,className='',anchor,onSelect,description}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLElement|null>(anchor??(document.activeElement instanceof HTMLElement?document.activeElement:null));
 const [submenu,setSubmenu]=useState<{item:MenuEntry;anchor:HTMLElement}|null>(null);
 const search=useRef('');const searchAt=useRef(0);
 const model=label==='Model and effort';
 const entries=model?modelEntries(items):items;
 useLayoutEffect(()=>{
   const menu=ref.current;if(!menu)return;
   const rect=menu.getBoundingClientRect();
   const bounds=trigger.current?.getBoundingClientRect()??rect;
   const margin=8,above=/account-menu|add-menu/.test(className),right=/view-menu|group-menu|model-options/.test(className),row=className.includes('row-menu');
   let left=anchor?bounds.right+4:row?bounds.right+4:right?bounds.right-rect.width:bounds.left;
   if(anchor&&left+rect.width>window.innerWidth-margin)left=bounds.left-rect.width-4;
   const top=anchor||row?bounds.top:above?bounds.top-rect.height-8:bounds.bottom+8;
   menu.style.position='fixed';menu.style.left=Math.min(Math.max(margin,left),Math.max(margin,window.innerWidth-rect.width-margin))+'px';
   menu.style.top=Math.min(Math.max(margin,top),Math.max(margin,window.innerHeight-rect.height-margin))+'px';
   menu.style.right='auto';menu.style.bottom='auto';menu.style.margin='0';menu.style.maxHeight=(window.innerHeight-margin*2)+'px';menu.style.overflowY='auto';
 },[]);
 useEffect(()=>{(ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')??ref.current)?.focus()},[]);
 const dismiss=()=>{trigger.current?.isConnected&&trigger.current.focus();close()};
 const select=()=>{dismiss();onSelect?.()};
 const open=(item:MenuEntry,element:HTMLElement)=>setSubmenu({item,anchor:element});
 return createPortal(<><div ref={ref} className={'workspace-menu '+className} role="menu" tabIndex={-1} aria-label={label} style={model?{width:172,minWidth:172,borderRadius:10}:undefined} onKeyDown={e=>{
   if(submenu)return;
   const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);
   const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
     e.preventDefault();e.stopPropagation();
     const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:index<0?(e.key==='ArrowDown'?0:buttons.length-1):(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
     buttons[next]?.focus();
   }else if(e.key==='ArrowRight'){
     const element=document.activeElement as HTMLElement,item=entries.find(entry=>entry.label===element.dataset.menuLabel);
     if(item?.children){e.preventDefault();e.stopPropagation();open(item,element)}
   }else if(e.key==='Escape'||(anchor&&e.key==='ArrowLeft')){e.preventDefault();e.stopPropagation();dismiss()}
   else if(e.key==='Tab'){select()}
   else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){
     e.preventDefault();e.stopPropagation();const now=Date.now();search.current=now-searchAt.current>700?e.key.toLowerCase():search.current+e.key.toLowerCase();searchAt.current=now;
     const query=search.current.split('').every(c=>c===search.current[0])?search.current[0]:search.current;
     for(let step=1;step<=buttons.length;step++){const button=buttons[(index+step+buttons.length)%buttons.length];if(button.querySelector('.menu-label')?.textContent?.trim().toLowerCase().startsWith(query)){button.focus();break}}
   }
 }}>
 {entries.map((item,i)=>item.separator?<div className="menu-separator" role="separator" key={i}/>:item.heading?<div className="menu-section-label" style={{fontSize:11,color:'var(--muted)',padding:'5px 8px'}} key={i}>{item.label}</div>:<button role={item.radio?'menuitemradio':item.checked!==undefined?'menuitemcheckbox':'menuitem'} aria-checked={item.checked} aria-haspopup={item.children?'menu':undefined} aria-expanded={item.children?submenu?.item.label===item.label:undefined} data-menu-label={item.label} key={i} onPointerEnter={e=>{if(e.pointerType==='mouse'&&item.children&&!item.disabled)open(item,e.currentTarget)}} onPointerMove={e=>{if(e.pointerType==='mouse'&&!item.disabled){e.currentTarget.focus({preventScroll:true});if(submenu&&submenu.item.label!==item.label)setSubmenu(null)}}} disabled={item.disabled} className={item.danger?'danger':''} onClick={e=>{if(item.children){open(item,e.currentTarget);return}select();item.action?.()}}>
 <span className="menu-icon">{item.checked?<Check size={15}/>:item.icon}</span><span className="menu-label">{item.label}{item.description&&!item.children&&<small>{item.description}</small>}</span>{item.shortcut&&<kbd style={model?{marginLeft:0}:undefined}>{item.shortcut}</kbd>}{item.children&&<ChevronRight size={12}/>}</button>)}
 {description&&<p className="menu-description" style={{fontSize:11,lineHeight:1.5,color:'var(--muted)',padding:'8px',margin:0,maxWidth:220}}>{description}</p>}
 </div>{submenu&&<WorkspaceMenu key={submenu.item.label} label={submenu.item.label} className="nested-menu" items={submenu.item.children!} anchor={submenu.anchor} close={()=>setSubmenu(null)} onSelect={select} description={submenu.item.description}/>}</>,document.body)
}

export const shortcutGroups=[
 ['Workspace',[['New session','⌘ N'],['Command palette','⌘ K'],['Search sessions','⇧ ⌘ K'],['Show / hide sidebar','⌘ B'],['Settings','⌘ ,'],['Keyboard shortcuts','⌘ /'],['Previous session','⇧ ⌘ ['],['Next session','⇧ ⌘ ]'],['Back','⌘ ['],['Forward','⌘ ]']]],
 ['Panels',[['Changes','⇧ ⌘ D'],['Files','⇧ ⌘ F'],['Browser','⇧ ⌘ B'],['Preview','⇧ ⌘ P'],['Terminal','⌃ `'],['Side chat','⌘ ;'],['Close pane','⌘ \\']]],
 ['Split view',[['New session on the right','⌃ ⌘ \\'],['New session below','⌃ ⌘ −'],['Focus next split','⌃ ]'],['Focus previous split','⌃ ['],['Close split view','⌃ ⌘ W']]],
 ['Conversation',[['Send message','Enter'],['Insert a new line','⇧ Enter'],['Close menu or dialog','Esc']]]
] as const;
export function KeyboardHelp(){return <div className="keyboard-help"><h2>Keyboard shortcuts</h2><p>Move through your workspace without leaving the keyboard.</p><div className="shortcut-grid">{shortcutGroups.map(([group,items])=><section key={group}><h3>{group}</h3>{items.map(([label,keys])=><div key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}</section>)}</div><footer>On Windows and Linux, use Ctrl in place of ⌘. Some browser-reserved shortcuts may stay with your browser; all commands are also available in menus.</footer></div>}

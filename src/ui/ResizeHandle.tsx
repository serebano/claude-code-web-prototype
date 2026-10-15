import {useEffect, useRef, useState} from 'react';

type Props = {
  className: string;
  label: string;
  value: number;
  min: number;
  max: number;
  initial: number;
  step: number;
  axis?: 'x' | 'y';
  responsive?: boolean;
  percent?: boolean;
  fromEnd?: boolean;
  minPixels?: number;
  onChange: (value: number) => void;
};

/** Shared pointer/keyboard separator. The hit region is wider than its visible seam. */
export default function ResizeHandle({className,label,value,min,max,initial,step,axis='x',responsive=false,percent=false,fromEnd=false,minPixels=0,onChange}: Props) {
  const ref=useRef<HTMLDivElement>(null);
  const drag=useRef<{pointerId:number;initial:number}|null>(null);
  const [narrow,setNarrow]=useState(()=>matchMedia('(max-width: 800px)').matches);
  const [extent,setExtent]=useState(0);
  const vertical=axis==='y'||(responsive&&narrow);
  useEffect(()=>{
    const media=matchMedia('(max-width: 800px)');
    const changed=()=>setNarrow(media.matches);
    media.addEventListener('change',changed);
    return()=>media.removeEventListener('change',changed);
  },[]);
  useEffect(()=>{
    const parent=ref.current?.parentElement;
    if(!parent)return;
    const measure=()=>setExtent(vertical?parent.clientHeight:parent.clientWidth);
    measure();
    const observer=new ResizeObserver(measure);observer.observe(parent);
    return()=>observer.disconnect();
  },[vertical]);
  const floor=percent&&extent?Math.min(50,Math.max(min,minPixels/extent*100)):min;
  const ceiling=percent?Math.min(max,100-floor):max;
  const clamp=(next:number)=>Math.max(floor,Math.min(ceiling,next));
  useEffect(()=>{const next=clamp(value);if(next!==value)onChange(next)},[floor,ceiling,value,onChange]);
  function finish(element:HTMLDivElement,commit:boolean){
    const current=drag.current;if(!current)return;
    drag.current=null;
    if(!commit)onChange(clamp(current.initial));
    if(element.hasPointerCapture(current.pointerId))element.releasePointerCapture(current.pointerId);
  }
  function move(event: React.PointerEvent<HTMLDivElement>){
    if(drag.current?.pointerId!==event.pointerId||!event.currentTarget.hasPointerCapture(event.pointerId))return;
    const rect=event.currentTarget.parentElement!.getBoundingClientRect();
    const length=vertical?rect.height:rect.width;
    const offset=vertical?event.clientY-rect.top:event.clientX-rect.left;
    onChange(clamp(percent?offset/length*100:fromEnd?length-offset:offset));
  }
  return <div ref={ref} className={className} role="separator" aria-label={label}
    aria-orientation={vertical?'horizontal':'vertical'} aria-valuemin={Math.round(floor)}
    aria-valuemax={Math.round(ceiling)} aria-valuenow={Math.round(value)} tabIndex={0}
    onDoubleClick={()=>onChange(clamp(initial))}
    onPointerDown={event=>{if(event.button!==0||drag.current)return;event.preventDefault();event.currentTarget.focus();drag.current={pointerId:event.pointerId,initial:value};event.currentTarget.setPointerCapture(event.pointerId)}}
    onPointerMove={move}
    onPointerUp={event=>{if(drag.current?.pointerId===event.pointerId)finish(event.currentTarget,true)}}
    onPointerCancel={event=>{if(drag.current?.pointerId===event.pointerId)finish(event.currentTarget,false)}}
    onLostPointerCapture={event=>{if(drag.current?.pointerId===event.pointerId)finish(event.currentTarget,false)}}
    onKeyDown={event=>{
      if(event.key==='Escape'&&drag.current){event.preventDefault();event.stopPropagation();finish(event.currentTarget,false);return}
      if(drag.current)return;
      const previous=vertical?'ArrowUp':'ArrowLeft',next=vertical?'ArrowDown':'ArrowRight';
      if(![previous,next,'Home','End'].includes(event.key))return;
      event.preventDefault();
      onChange(event.key==='Home'?floor:event.key==='End'?ceiling:clamp(value+(event.key===previous?-1:1)*(fromEnd?-1:1)*step));
    }}/>
}

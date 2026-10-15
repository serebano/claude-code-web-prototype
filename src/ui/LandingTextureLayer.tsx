import { useEffect, useRef } from 'react';
import './landing-texture.css';

export type LandingTextureLayerProps = {
  reducedMotion?: boolean;
  theme?: string;
  /** Pins the animation clock (seconds), skips the entrance delay, and renders on demand for visual tests. */
  time?: number;
};

type Trail = { x: number; y: number; dx: number; dy: number; at: number; force: number };
type Ripple = { x: number; y: number; at: number; heart: boolean };
const interactive = 'a,button,input,textarea,select,label,summary,[contenteditable]:not([contenteditable="false"]),[draggable="true"],[tabindex]:not([tabindex="-1"]),[role="button"],[role="link"],[role="textbox"],[role="combobox"],[role="listbox"],[role="option"],[role="menu"],[role="menuitem"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="slider"],[role="dialog"]';

// Original implementation: one low-resolution field pass, one glyph-atlas pass.
// No application source, shaders, or font assets are embedded here.
const vertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); uv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }
`;
const fieldShader = `#version 300 es
precision highp float;
in vec2 uv; out vec4 outColor;
uniform vec2 pane;
uniform float clock, reveal, seed;
uniform int trailCount, tapCount;
uniform vec4 trails[48], paths[48], taps[6];
float rand(vec2 p){ return fract(sin(dot(p,vec2(91.17,253.71))+seed)*15731.743); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);return mix(mix(rand(i),rand(i+vec2(1,0)),f.x),mix(rand(i+vec2(0,1)),rand(i+vec2(1)),f.x),f.y); }
float layers(vec2 p){ float n=0.0,a=.55;for(int k=0;k<4;k++){n+=a*noise(p);p=mat2(1.62,-.71,.71,1.62)*p+vec2(6.3,9.1);a*=.5;}return n; }
void main(){
  vec2 p=vec2(uv.x,1.0-uv.y)*pane;
  float angle=.42+.16*sin(seed),speed=52.0;
  vec2 dir=vec2(cos(angle),sin(angle));
  vec2 q=vec2(dot(p,dir),dot(p,vec2(-dir.y,dir.x)));
  q.x-=clock*speed;
  vec2 warp=vec2(layers(q/320.0+clock*.018),layers(q/330.0+vec2(15,4)-clock*.013))-.5;
  vec2 drift=q+warp*125.0;
  float cloud=layers(drift/vec2(440,150));
  float swell=.07*sin(q.x/310.0+noise(q/700.0)*3.0);
  float grain=noise(drift/vec2(90,24)+clock*.045);
  float wind=smoothstep(.47,.66,cloud+swell);
  wind*=mix(.34,1.0,smoothstep(.32,.76,grain));
  float warmth=0.0;
  for(int i=0;i<48;i++){
    if(i>=trailCount)break;
    vec4 tr=trails[i];vec4 path=paths[i];
    vec2 away=p-tr.xy;
    float len=max(dot(path.xy,path.xy),.01);
    away-=path.xy*clamp(dot(away,path.xy)/len,-1.0,1.0);
    float radius=50.0+40.0*tr.z;
    float life=(1.0-exp(-tr.z/0.05))*exp(-tr.z/.65);
    warmth+=exp(-dot(away,away)/(radius*radius))*tr.w*life;
  }
  warmth=1.0-exp(-warmth*2.2);
  float ripple=0.0,glow=0.0;
  for(int i=0;i<6;i++){
    if(i>=tapCount)break;
    vec4 tap=taps[i];vec2 delta=p-tap.xy;float distance=length(delta);
    if(tap.w>.5){float a=atan(delta.y,delta.x);distance/=max(.5,1.0-.23*sin(a)+.13*cos(2.0*a));}
    float radius=620.0*(1.0-exp(-tap.z/1.3)),width=65.0+tap.z*48.0;
    float ring=exp(-pow((distance-radius)/width,2.0))*exp(-tap.z/1.5);
    ripple+=ring*(.62+.38*cos((distance-radius)/21.0));glow+=ring*exp(-tap.z*.45);
  }
  float texture=mix(.44,1.0,smoothstep(.24,.73,grain));
  float lit=1.0-(1.0-wind*reveal)*(1.0-warmth*.9*texture);
  lit=clamp(lit+ripple*.85,0.0,1.0);
  vec2 center=(p-vec2(pane.x*.5,pane.y*.45))/vec2(250,80);
  float calm=1.0-.7*exp(-dot(center,center)*.9);
  outColor=vec4(lit*calm,clamp(warmth+ripple,0.0,1.0),min(glow,1.0),1.0);
}
`;
const glyphShader = `#version 300 es
precision highp float;
in vec2 uv; out vec4 outColor;
uniform sampler2D atlas, field;
uniform vec2 pane, cell;
uniform vec3 ink, glowInk;
uniform float clock, seed, opacity;
float rand(vec2 p){return fract(sin(dot(p,vec2(73.31,117.19))+seed)*19381.719);}
void main(){
  vec2 pixel=vec2(uv.x,1.0-uv.y)*pane;
  vec2 grid=floor(pixel/cell),local=fract(pixel/cell);
  vec4 light=texture(field,uv);
  if(light.r<.008&&light.b<.005){outColor=vec4(0);return;}
  float id=mod(floor(rand(grid)*62.0)+floor(clock*(.72+rand(grid+7.0)*.96)),62.0);
  vec2 tile=vec2(mod(id,16.0),floor(id/16.0));
  float coverage=texture(atlas,(tile+local)/vec2(16,4)).a;
  float alpha=coverage*opacity*min(.46,.26*light.r+.22*light.b);
  vec3 color=mix(ink,glowInk,smoothstep(.05,.45,light.b));
  outColor=vec4(color*alpha,alpha);
}
`;

function smooth(value: number) { const n = Math.max(0, Math.min(1, value)); return n * n * (3 - 2 * n); }

export default function LandingTextureLayer({ reducedMotion = false, theme, time }: LandingTextureLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ reducedMotion, time });
  const redraw = useRef<(() => void) | null>(null);
  controls.current = { reducedMotion, time };
  useEffect(() => { redraw.current?.(); }, [reducedMotion, time, theme]);

  useEffect(() => {
    const host = hostRef.current;
    const parent = host?.parentElement;
    if (!host || !parent) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(forced-colors: active), (prefers-contrast: more)');
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    let canvas = document.createElement('canvas');
    canvas.className = 'cw-landing-texture-canvas';
    host.appendChild(canvas);
    let disposed = false, failed = false, ready = false;
    let width = 1, height = 1, dpr = 1;
    let raf = 0, timeout = 0, lastFrame = 0;
    let visible = !document.hidden;
    let started = performance.now(), pausedAt: number | null = null, pauseTotal = 0;
    let ambientClock = 0, lastClock = 0, activeUntil = 180;
    let lastPointer: { x: number; y: number; at: number } | null = null;
    let anchor: { x: number; y: number; at: number } | null = null;
    let pointerSpeed = 0, clicks = 0;
    let trails: Trail[] = [], taps: Ripple[] = [];
    const seed = time !== undefined ? 11.7 : 1 + Math.random() * 90;
    const glyphs = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const resources: { programs: WebGLProgram[]; shaders: WebGLShader[]; textures: WebGLTexture[]; buffers: WebGLFramebuffer[]; vaos: WebGLVertexArrayObject[] } = { programs: [], shaders: [], textures: [], buffers: [], vaos: [] };
    let gl: WebGL2RenderingContext | null = null;
    let fieldProgram: WebGLProgram | null = null, glyphProgram: WebGLProgram | null = null;
    let fieldTexture: WebGLTexture | null = null, atlasTexture: WebGLTexture | null = null, framebuffer: WebGLFramebuffer | null = null;
    let fallback: CanvasRenderingContext2D | null = null;
    const trailData = new Float32Array(48 * 4), pathData = new Float32Array(48 * 4), tapData = new Float32Array(6 * 4);
    const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

    function location(program: WebGLProgram, name: string) {
      let map = locations.get(program); if (!map) { map = new Map(); locations.set(program, map); }
      if (!map.has(name)) map.set(name, gl!.getUniformLocation(program, name));
      return map.get(name)!;
    }
    function compile(source: string, type: number) {
      const shader = gl!.createShader(type); if (!shader) throw new Error('Shader allocation failed');
      resources.shaders.push(shader); gl!.shaderSource(shader, source); gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Texture shader unavailable');
      return shader;
    }
    function program(fragment: string) {
      const result = gl!.createProgram(); if (!result) throw new Error('Program allocation failed');
      resources.programs.push(result); gl!.attachShader(result, compile(vertex, gl!.VERTEX_SHADER)); gl!.attachShader(result, compile(fragment, gl!.FRAGMENT_SHADER)); gl!.linkProgram(result);
      if (!gl!.getProgramParameter(result, gl!.LINK_STATUS)) throw new Error('Texture program unavailable');
      return result;
    }
    function texture() {
      const result = gl!.createTexture(); if (!result) throw new Error('Texture allocation failed');
      resources.textures.push(result); gl!.bindTexture(gl!.TEXTURE_2D, result);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      return result;
    }
    function release() {
      if (!gl) return;
      resources.programs.forEach(p => gl!.deleteProgram(p)); resources.shaders.forEach(s => gl!.deleteShader(s));
      resources.textures.forEach(t => gl!.deleteTexture(t)); resources.buffers.forEach(f => gl!.deleteFramebuffer(f)); resources.vaos.forEach(v => gl!.deleteVertexArray(v));
      resources.programs = []; resources.shaders = []; resources.textures = []; resources.buffers = []; resources.vaos = [];
      locations.clear();
    }
    function useFallback() {
      release(); gl = null; failed = true;
      host!.dataset.renderer = 'canvas2d';
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.remove(); canvas = document.createElement('canvas'); canvas.className = 'cw-landing-texture-canvas'; host!.appendChild(canvas);
      fallback = canvas.getContext('2d'); resize();
    }
    function contextLost(event: Event) { event.preventDefault(); stop(); useFallback(); paint(); }
    function inkColor(): { rgb: number[]; alpha: number; dark: boolean } {
      const style = getComputedStyle(host!);
      const sample = document.createElement('canvas').getContext('2d');
      let rgb = [0.54, 0.53, 0.51], alpha = 1;
      if (sample) { sample.fillStyle = style.color; sample.fillRect(0, 0, 1, 1); const v = sample.getImageData(0, 0, 1, 1).data; rgb = [v[0] / 255, v[1] / 255, v[2] / 255]; alpha = v[3] / 255; }
      const mode = document.documentElement.dataset.theme || document.documentElement.dataset.mode;
      return { rgb, alpha, dark: mode === 'dark' || (mode !== 'light' && (style.colorScheme === 'dark' || dark.matches)) };
    }
    let colors = { rgb: [0.54, 0.53, 0.51], alpha: 1, dark: true };
    function uploadAtlas() {
      if (!gl) return;
      const a = document.createElement('canvas'), cw = Math.max(7, Math.round(6.5 * dpr)), ch = cw * 2;
      a.width = cw * 16; a.height = ch * 4;
      const c = a.getContext('2d'); if (!c) throw new Error('Font atlas unavailable');
      c.font = `${dpr < 1.5 ? 400 : 300} ${9 * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      for (let i = 0; i < glyphs.length; i++) c.fillText(glyphs[i], (i % 16 + .5) * cw, (Math.floor(i / 16) + .5) * ch);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
    }
    function resize() {
      if (disposed) return;
      const box = host!.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(21_000_000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
      colors = inkColor();
      if (gl && fieldTexture) {
        gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(1, Math.ceil(width / 6.5)), Math.max(1, Math.ceil(height / 13)), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        uploadAtlas();
      }
      ready = true; paint(); schedule();
    }
    function clock() { return controls.current.time ?? Math.max(0, ((pausedAt ?? performance.now()) - started - pauseTotal) / 1000 - 3); }
    function reduced() { return controls.current.reducedMotion || motion.matches; }
    function stop() { if (raf) cancelAnimationFrame(raf); if (timeout) clearTimeout(timeout); raf = 0; timeout = 0; }
    function schedule() {
      if (disposed || !ready || contrast.matches || !visible || controls.current.time !== undefined || reduced() || failed || raf || timeout) return;
      const now = clock(); if (now > activeUntil + 8 && !trails.length && !taps.length) return;
      timeout = window.setTimeout(() => { timeout = 0; raf = requestAnimationFrame(() => { raf = 0; paint(); schedule(); }); }, taps.length ? 16 : 40);
    }
    function paint() {
      if (disposed || !ready) return;
      const now = clock(), pinned = controls.current.time !== undefined;
      const entering = pinned || reduced() ? 1 : smooth(((performance.now() - started - pauseTotal) / 1000 - 3) / 3);
      host!.style.opacity = contrast.matches || !visible ? '0' : String(entering);
      if (contrast.matches || !visible || entering === 0) return;
      const delta = Math.max(0, Math.min(.25, now - lastClock)); lastClock = now;
      const calm = 1 - smooth((now - activeUntil) / 8);
      if (pinned) ambientClock = now; else if (!reduced()) ambientClock += delta * calm;
      trails = reduced() ? [] : trails.filter(t => now - t.at < 2.4);
      taps = reduced() ? [] : taps.filter(t => now - t.at < 3.6);
      if (fallback) {
        fallback.clearRect(0, 0, canvas.width, canvas.height); fallback.font = `${9 * dpr}px monospace`; fallback.fillStyle = `rgba(${colors.rgb.map(c => Math.round(c * 255)).join(',')},0.035)`;
        for (let y = 8; y < height; y += 13) for (let x = 3; x < width; x += 6.5) {
          const wave = Math.sin(x / 170 + y / 90 + seed) + Math.cos(y / 77 - x / 270);
          if (wave > 1.35) fallback.fillText(glyphs[Math.abs(Math.floor(x * 17 + y * 31)) % glyphs.length], x * dpr, y * dpr);
        }
        return;
      }
      if (!gl || !fieldProgram || !glyphProgram) return;
      trails.forEach((t, i) => { trailData.set([t.x, t.y, Math.max(.05, now - t.at), t.force], i * 4); pathData.set([t.dx, t.dy, 0, 0], i * 4); });
      taps.forEach((t, i) => tapData.set([t.x, t.y, Math.max(.02, now - t.at), t.heart ? 1 : 0], i * 4));
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.viewport(0, 0, Math.ceil(width / 6.5), Math.ceil(height / 13)); gl.useProgram(fieldProgram);
      gl.uniform2f(location(fieldProgram, 'pane'), width, height); gl.uniform1f(location(fieldProgram, 'clock'), ambientClock); gl.uniform1f(location(fieldProgram, 'seed'), seed);
      gl.uniform1f(location(fieldProgram, 'reveal'), reduced() || pinned ? 1 : smooth(now / 4) * calm);
      gl.uniform1i(location(fieldProgram, 'trailCount'), trails.length); gl.uniform1i(location(fieldProgram, 'tapCount'), taps.length);
      gl.uniform4fv(location(fieldProgram, 'trails[0]'), trailData); gl.uniform4fv(location(fieldProgram, 'paths[0]'), pathData); gl.uniform4fv(location(fieldProgram, 'taps[0]'), tapData); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(glyphProgram);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTexture); gl.uniform1i(location(glyphProgram, 'atlas'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fieldTexture); gl.uniform1i(location(glyphProgram, 'field'), 1);
      gl.uniform2f(location(glyphProgram, 'pane'), width, height); gl.uniform2f(location(glyphProgram, 'cell'), 6.5, 13); gl.uniform1f(location(glyphProgram, 'clock'), ambientClock); gl.uniform1f(location(glyphProgram, 'seed'), seed);
      gl.uniform3f(location(glyphProgram, 'ink'), colors.rgb[0], colors.rgb[1], colors.rgb[2]); gl.uniform3f(location(glyphProgram, 'glowInk'), colors.dark ? .1 : 0, colors.dark ? .68 : .25, 1); gl.uniform1f(location(glyphProgram, 'opacity'), colors.alpha); gl.drawArrays(gl.TRIANGLES, 0, 3);
      lastFrame = performance.now();
    }
    function point(event: PointerEvent) { const box = host!.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top, at: clock() }; }
    function activity() { activeUntil = clock() + 180; schedule(); }
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || reduced() || contrast.matches || !visible || failed) return;
      const p = point(event); activity();
      if (!lastPointer || !anchor || p.at - lastPointer.at > .25) { lastPointer = anchor = p; pointerSpeed = 0; return; }
      const elapsed = Math.max(1 / 240, p.at - lastPointer.at), travelled = Math.hypot(p.x - lastPointer.x, p.y - lastPointer.y);
      pointerSpeed += (travelled / elapsed - pointerSpeed) * Math.min(1, elapsed / .08); lastPointer = p;
      const length = Math.hypot(p.x - anchor.x, p.y - anchor.y);
      if (length < 18 || (controls.current.time === undefined && p.at - anchor.at < .035)) return;
      const force = smooth((pointerSpeed - 60) / 740) * length / (length + 90);
      if (force > .04) trails = [...trails.slice(-47), { x: (p.x + anchor.x) / 2, y: (p.y + anchor.y) / 2, dx: (p.x - anchor.x) / 2, dy: (p.y - anchor.y) / 2, at: p.at - .05, force }];
      anchor = p;
      if (controls.current.time !== undefined || performance.now() - lastFrame > 40) paint();
    }
    function tap(event: PointerEvent) {
      if (event.button !== 0 || reduced() || contrast.matches || failed) return;
      activity(); const target = event.target instanceof Element ? event.target.closest(interactive) : null; if (target && target !== parent) return;
      const p = point(event); clicks++; taps = [...taps.slice(-5), { ...p, at: p.at - .02, heart: clicks % 3 === 0 }]; paint(); schedule();
    }
    function leave() { lastPointer = anchor = null; pointerSpeed = 0; }
    function visibility() {
      visible = !document.hidden;
      if (!visible) { pausedAt ??= performance.now(); stop(); }
      else if (pausedAt !== null) { pauseTotal += performance.now() - pausedAt; pausedAt = null; }
      paint(); schedule();
    }
    function policy() { stop(); colors = inkColor(); paint(); schedule(); }
    redraw.current = policy;
    try {
      gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL unavailable');
      host.dataset.renderer = 'webgl2';
      fieldProgram = program(fieldShader); glyphProgram = program(glyphShader);
      const vao = gl.createVertexArray(); if (!vao) throw new Error('Vertex allocation failed'); resources.vaos.push(vao); gl.bindVertexArray(vao);
      fieldTexture = texture(); atlasTexture = texture(); framebuffer = gl.createFramebuffer(); if (!framebuffer) throw new Error('Framebuffer unavailable'); resources.buffers.push(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTexture, 0);
      canvas.addEventListener('webglcontextlost', contextLost); resize();
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && gl.getError() !== gl.NO_ERROR) throw new Error('Framebuffer incomplete');
    } catch { useFallback(); }
    const observer = new ResizeObserver(() => resize()); observer.observe(host);
    const themeObserver = new MutationObserver(policy); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-mode'] });
    parent.addEventListener('pointermove', move, { passive: true }); parent.addEventListener('pointerdown', tap, { passive: true }); parent.addEventListener('pointerleave', leave, { passive: true }); parent.addEventListener('keydown', activity, { passive: true });
    document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', policy); contrast.addEventListener('change', policy); dark.addEventListener('change', policy); window.addEventListener('resize', resize);
    // The one delayed paint also reveals a static reduced-motion/fallback field.
    const entrance = window.setTimeout(() => { paint(); schedule(); }, 6050);
    document.fonts?.ready.then(() => { if (!disposed && gl) { uploadAtlas(); paint(); } });
    return () => {
      disposed = true; redraw.current = null; stop(); clearTimeout(entrance); observer.disconnect(); themeObserver.disconnect();
      parent.removeEventListener('pointermove', move); parent.removeEventListener('pointerdown', tap); parent.removeEventListener('pointerleave', leave); parent.removeEventListener('keydown', activity);
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', policy); contrast.removeEventListener('change', policy); dark.removeEventListener('change', policy); window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', contextLost); release(); gl?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
    };
  }, []);

  return <div ref={hostRef} className="cw-landing-texture" aria-hidden="true" data-testid="landing-texture" data-texture-theme={theme} />;
}

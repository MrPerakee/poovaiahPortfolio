/* ═══════════════════════════════════════════
   ETHER — a small world of sound
   Handpan · Synth pad · Djembe · Om · Raga/Tanpura · Listen (mic)
   Visuals: Flower of Life · golden-ratio tree · Chladni cymatics
   Everything is synthesised live with the Web Audio API — no samples.
   ═══════════════════════════════════════════ */
(function(){
'use strict';
var PHI=(1+Math.sqrt(5))/2, TAU=Math.PI*2;
var $=function(s){return document.querySelector(s)}, $$=function(s){return [].slice.call(document.querySelectorAll(s))};
function store(k,v){try{if(v===undefined)return localStorage.getItem('ether-'+k);localStorage.setItem('ether-'+k,v)}catch(e){return null}}

/* ─────────── TUNING ───────────
   Carnatic swarasthanas in just intonation (ratio to Sa). */
var RATIO=[1,16/15,9/8,6/5,5/4,4/3,45/32,3/2,8/5,5/3,9/5,15/8];
var SW=['S','R1','R2','G2','G3','M1','M2','P','D1','D2','N2','N3'];
var RAGAS=[
  {n:'Mayamalavagowla',m:'Melakarta 15 · the first lesson',s:[0,1,4,5,7,8,11]},
  {n:'Shankarabharanam',m:'Melakarta 29 · grandeur',s:[0,2,4,5,7,9,11]},
  {n:'Kalyani',m:'Melakarta 65 · auspicious',s:[0,2,4,6,7,9,11]},
  {n:'Kharaharapriya',m:'Melakarta 22 · tender',s:[0,2,3,5,7,9,10]},
  {n:'Hanumatodi',m:'Melakarta 8 · devotion',s:[0,1,3,5,7,8,10]},
  {n:'Keeravani',m:'Melakarta 21 · longing',s:[0,2,3,5,7,8,11]},
  {n:'Charukesi',m:'Melakarta 26 · bittersweet',s:[0,2,4,5,7,8,10]},
  {n:'Mohanam',m:'Pentatonic · joy',s:[0,2,4,7,9]},
  {n:'Hamsadhwani',m:'Pentatonic · beginnings',s:[0,2,4,7,11]},
  {n:'Hindolam',m:'Pentatonic · night',s:[0,3,5,8,10]},
  {n:'Abhogi',m:'Pentatonic · devotion',s:[0,2,3,5,9]},
  {n:'Revati',m:'Pentatonic · meditation',s:[0,1,5,7,10]}
];
var SA_PRESETS=[['Om',136.1],['C',130.81],['C#',138.59],['D',146.83],['D#',155.56],['E',164.81],['F',174.61]];
var FREQS=[ // tuning references from various traditions — offered as sound, not as claims
  ['Om',136.1,'Earth-year tone'],['108',108,'Sacred count'],['432',432,'Verdi A'],
  ['174',174,'Solfeggio'],['285',285,'Solfeggio'],['396',396,'Solfeggio · Ut'],['417',417,'Solfeggio · Re'],
  ['528',528,'Solfeggio · Mi'],['639',639,'Solfeggio · Fa'],['741',741,'Solfeggio · Sol'],['852',852,'Solfeggio · La'],['963',963,'Solfeggio']
];
var S={
  saBase:+(store('sa')||136.1), saCents:+(store('cents')||0),
  raga:Math.min(+(store('raga')||0),RAGAS.length-1)
};
function Sa(){return S.saBase*Math.pow(2,S.saCents/1200)}
function fq(semi,oct){var o=Math.floor(semi/12);return Sa()*RATIO[((semi%12)+12)%12]*Math.pow(2,(oct||0)+o)}
function scale(){return RAGAS[S.raga].s}
function ladder(count,startOct){ // raga notes ascending: [{semi,oct,f,name}]
  var s=scale(),out=[],i=0;
  while(out.length<count){var k=i%s.length,o=Math.floor(i/s.length)+(startOct||0);
    out.push({semi:s[k],oct:o,f:fq(s[k],o),name:SW[s[k]]});i++;}
  return out;
}
function swaraOf(f){
  var st=12*Math.log2(f/Sa()), r=Math.round(st), c=Math.round((st-r)*100);
  var oct=Math.floor(r/12), n=SW[((r%12)+12)%12];
  return {name:n,cents:c,oct:oct};
}
var NOTE=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function westOf(f){var m=Math.round(69+12*Math.log2(f/440));return NOTE[((m%12)+12)%12]+(Math.floor(m/12)-1)}

/* ─────────── AUDIO GRAPH ─────────── */
var ac,bus,master,an,anBuf,verb;
function impulse(sec,decay){
  var r=ac.sampleRate,len=r*sec,b=ac.createBuffer(2,len,r);
  for(var c=0;c<2;c++){var d=b.getChannelData(c);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
  return b;
}
function initAudio(){
  if(ac) return;
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  ac=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  bus=ac.createGain();
  master=ac.createGain(); master.gain.value=.9;
  var comp=ac.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=4; comp.attack.value=.005; comp.release.value=.2;
  verb=ac.createConvolver(); verb.buffer=impulse(3.4,2.4);
  var wet=ac.createGain(); wet.gain.value=.32;
  bus.connect(master); bus.connect(verb); verb.connect(wet); wet.connect(master);
  an=ac.createAnalyser(); an.fftSize=1024; anBuf=new Float32Array(an.fftSize);
  master.connect(comp); comp.connect(an); an.connect(ac.destination);
}
function now(){return ac.currentTime}
var noiseBuf;
function noise(){ if(!noiseBuf){var l=ac.sampleRate;noiseBuf=ac.createBuffer(1,l,l);var d=noiseBuf.getChannelData(0);for(var i=0;i<l;i++)d[i]=Math.random()*2-1;}
  var s=ac.createBufferSource(); s.buffer=noiseBuf; return s; }
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}

/* ─────────── INSTRUMENTS ─────────── */
// Handpan — modal synthesis: fundamental, octave and compound fifth, the way a tuned steel field rings
function handpan(f,vel){
  var t=now(), v=vel||1, out=ac.createGain(); out.gain.value=.55*v; out.connect(bus);
  var dec=Math.max(1.6,4.6-Math.log2(f/110)*0.9);
  [[1,1,dec],[2.002,.42,dec*.6],[2.997,.16,dec*.35],[4.01,.05,dec*.2]].forEach(function(p){
    var o=ac.createOscillator(),g=ac.createGain(); o.type='sine'; o.frequency.value=f*p[0];
    env(g,t,.004,p[1],p[2]); o.connect(g); g.connect(out); o.start(t); o.stop(t+p[2]+.1);
  });
  var n=noise(),bp=ac.createBiquadFilter(),ng=ac.createGain(); bp.type='bandpass'; bp.frequency.value=f*3; bp.Q.value=2;
  env(ng,t,.002,.12*v,.06); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t); n.stop(t+.1);
  pulse(f,1);
}
// Djembe — membrane synthesis
function djembe(kind){
  var t=now(), out=ac.createGain(); out.connect(bus);
  if(kind==='bass'){
    out.gain.value=1.1;
    var o=ac.createOscillator(),g=ac.createGain(); o.type='sine';
    o.frequency.setValueAtTime(95,t); o.frequency.exponentialRampToValueAtTime(52,t+.25);
    env(g,t,.003,1,.55); o.connect(g); g.connect(out); o.start(t); o.stop(t+.7);
    var n=noise(),lp=ac.createBiquadFilter(),ng=ac.createGain(); lp.type='lowpass'; lp.frequency.value=600;
    env(ng,t,.002,.35,.08); n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t); n.stop(t+.15);
    pulse(70,1.2);
  }else if(kind==='tone'){
    out.gain.value=.8;
    var o2=ac.createOscillator(),g2=ac.createGain(); o2.type='sine';
    o2.frequency.setValueAtTime(330,t); o2.frequency.exponentialRampToValueAtTime(250,t+.12);
    env(g2,t,.002,.7,.22); o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t+.3);
    var n2=noise(),bp=ac.createBiquadFilter(),ng2=ac.createGain(); bp.type='bandpass'; bp.frequency.value=900; bp.Q.value=1.4;
    env(ng2,t,.002,.45,.09); n2.connect(bp); bp.connect(ng2); ng2.connect(out); n2.start(t); n2.stop(t+.15);
    pulse(260,.9);
  }else{
    out.gain.value=.75;
    var n3=noise(),hp=ac.createBiquadFilter(),bp3=ac.createBiquadFilter(),ng3=ac.createGain();
    hp.type='highpass'; hp.frequency.value=1800; bp3.type='peaking'; bp3.frequency.value=3200; bp3.gain.value=8;
    env(ng3,t,.001,.9,.09); n3.connect(hp); hp.connect(bp3); bp3.connect(ng3); ng3.connect(out); n3.start(t); n3.stop(t+.14);
    var o3=ac.createOscillator(),g3=ac.createGain(); o3.type='triangle'; o3.frequency.value=520;
    env(g3,t,.001,.3,.05); o3.connect(g3); g3.connect(out); o3.start(t); o3.stop(t+.08);
    pulse(900,.8);
  }
}
// Synth pad — detuned saws through a soft filter
var padVoices={};
function padOn(id,f,bright){
  var t=now(), v={g:ac.createGain(),lp:ac.createBiquadFilter(),o:[]};
  v.lp.type='lowpass'; v.lp.Q.value=4; v.lp.frequency.value=bright;
  v.g.gain.setValueAtTime(0,t); v.g.gain.linearRampToValueAtTime(.16,t+.35);
  [[-7,'sawtooth',.5],[7,'sawtooth',.5],[0,'sine',.8],[-1200,'sine',.35]].forEach(function(p){
    var o=ac.createOscillator(),g=ac.createGain(); o.type=p[1]; o.frequency.value=f; o.detune.value=p[0]; g.gain.value=p[2];
    o.connect(g); g.connect(v.lp); o.start(t); v.o.push(o);
  });
  var lfo=ac.createOscillator(),lg=ac.createGain(); lfo.frequency.value=.25; lg.gain.value=bright*.15; lfo.connect(lg); lg.connect(v.lp.frequency); lfo.start(t); v.o.push(lfo);
  v.lp.connect(v.g); v.g.connect(bus); padVoices[id]=v; pulse(f,.7);
}
function padMove(id,f,bright){var v=padVoices[id];if(!v)return;var t=now();
  v.o.forEach(function(o,i){ if(i<4) o.frequency.setTargetAtTime(f,t,.06); });
  v.lp.frequency.setTargetAtTime(bright,t,.08); cym.f=f; cym.amp=Math.max(cym.amp,.6);}
function padOff(id){var v=padVoices[id];if(!v)return;var t=now();
  v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value,t); v.g.gain.linearRampToValueAtTime(0,t+1.4);
  v.o.forEach(function(o){o.stop(t+1.5)}); delete padVoices[id];}

// Tanpura — four strings (Pa · Sa · Sa · low Sa), jawari buzz via rich harmonics and a sweeping filter
var tan={on:false,timer:null,step:0}, tanWave;
function tanString(f){
  var t=now();
  if(!tanWave){var re=new Float32Array(32),im=new Float32Array(32);for(var k=1;k<32;k++){im[k]=1/Math.pow(k,.9)*(k%7===0?.3:1)}tanWave=ac.createPeriodicWave(re,im);}
  var o=ac.createOscillator(),bp=ac.createBiquadFilter(),g=ac.createGain();
  o.setPeriodicWave(tanWave); o.frequency.value=f; o.detune.setValueAtTime(6,t); o.detune.linearRampToValueAtTime(0,t+.4);
  bp.type='lowpass'; bp.Q.value=6; bp.frequency.setValueAtTime(f*14,t); bp.frequency.exponentialRampToValueAtTime(f*3,t+3.5);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(.14,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+4.6);
  o.connect(bp); bp.connect(g); g.connect(bus); o.start(t); o.stop(t+4.8);
  cym.f=f*2; cym.amp=Math.max(cym.amp,.45);
}
function tanTick(){
  if(!tan.on) return;
  var seq=[fq(7,-1),fq(0,0),fq(0,0),fq(0,-1)];
  tanString(seq[tan.step%4]); tan.step++;
  tan.timer=setTimeout(tanTick,tan.step%4===0?1500:900);
}
function tanToggle(){tan.on=!tan.on;$('#tanBtn').classList.toggle('on',tan.on);liveDots();
  if(tan.on){tan.step=0;tanTick();}else clearTimeout(tan.timer);}

// Om — A·U·M vowel morph over a breath cycle; optional binaural beat
var om={on:false,f:136.1,breath:7,beat:7.83,bin:false,nodes:null,timer:null};
var VOW={A:[[730,1],[1090,.5],[2440,.25]],U:[[300,1],[870,.35],[2240,.12]]};
function omStart(){
  var t=now(), N={};
  N.out=ac.createGain(); N.out.gain.value=0; N.out.connect(bus);
  N.src=ac.createOscillator(); N.src.type='sawtooth'; N.src.frequency.value=om.f;
  N.src2=ac.createOscillator(); N.src2.type='triangle'; N.src2.frequency.value=om.f; N.src2.detune.value=4;
  N.sub=ac.createOscillator(); N.sub.type='sine'; N.sub.frequency.value=om.f/2;
  var mix=ac.createGain(); mix.gain.value=.5; N.src.connect(mix); N.src2.connect(mix);
  N.vow=ac.createGain(); N.hum=ac.createGain(); N.vow.connect(N.out); N.hum.connect(N.out);
  N.f=VOW.A.map(function(p){var b=ac.createBiquadFilter(),g=ac.createGain();b.type='bandpass';b.Q.value=9;b.frequency.value=p[0];g.gain.value=p[1]*2.4;mix.connect(b);b.connect(g);g.connect(N.vow);return {b:b,g:g};});
  var lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=320; lp.Q.value=1; mix.connect(lp); lp.connect(N.hum);
  var sg=ac.createGain(); sg.gain.value=.35; N.sub.connect(sg); sg.connect(N.out);
  [N.src,N.src2,N.sub].forEach(function(o){o.start(t)});
  om.nodes=N; om.on=true; omCycle(); omBinaural();
}
function omCycle(){
  if(!om.on) return; var N=om.nodes,t=now()+.05,T=om.breath;
  // A (open) → U (rounded) → M (closed hum) → breath
  N.out.gain.cancelScheduledValues(t); N.out.gain.setValueAtTime(N.out.gain.value,t);
  N.out.gain.linearRampToValueAtTime(.55,t+T*.12); N.out.gain.setValueAtTime(.55,t+T*.78); N.out.gain.linearRampToValueAtTime(0.02,t+T*.97);
  N.vow.gain.setValueAtTime(1,t); N.vow.gain.setValueAtTime(1,t+T*.48); N.vow.gain.linearRampToValueAtTime(0,t+T*.62);
  N.hum.gain.setValueAtTime(0,t); N.hum.gain.setValueAtTime(0,t+T*.5); N.hum.gain.linearRampToValueAtTime(1.6,t+T*.64);
  N.f.forEach(function(x,i){x.b.frequency.setValueAtTime(VOW.A[i][0],t);x.b.frequency.setValueAtTime(VOW.A[i][0],t+T*.22);
    x.b.frequency.exponentialRampToValueAtTime(VOW.U[i][0],t+T*.42);
    x.g.gain.setValueAtTime(VOW.A[i][1]*2.4,t+T*.22);x.g.gain.linearRampToValueAtTime(VOW.U[i][1]*2.4,t+T*.42);});
  om.timer=setTimeout(omCycle,T*1000);
}
function omBinaural(){
  var N=om.nodes; if(!N) return;
  if(N.bin){N.bin.forEach(function(o){try{o.stop()}catch(e){}});N.bin=null;}
  if(!om.bin) return;
  var t=now(); N.bin=[];
  [[om.f,-1],[om.f+om.beat,1]].forEach(function(p){
    var o=ac.createOscillator(),g=ac.createGain(),pn=ac.createStereoPanner?ac.createStereoPanner():null;
    o.frequency.value=p[0]; g.gain.value=.08;
    if(pn){pn.pan.value=p[1];o.connect(g);g.connect(pn);pn.connect(master);}else{o.connect(g);g.connect(master);}
    o.start(t); N.bin.push(o);
  });
}
function omStop(){
  if(!om.nodes) return; var N=om.nodes,t=now(); om.on=false; clearTimeout(om.timer);
  N.out.gain.cancelScheduledValues(t); N.out.gain.setValueAtTime(N.out.gain.value,t); N.out.gain.linearRampToValueAtTime(0,t+.8);
  [N.src,N.src2,N.sub].concat(N.bin||[]).forEach(function(o){try{o.stop(t+.9)}catch(e){}}); om.nodes=null;
}
function omSetF(f){om.f=f; var N=om.nodes; if(!N) return; var t=now();
  N.src.frequency.setTargetAtTime(f,t,.1); N.src2.frequency.setTargetAtTime(f,t,.1); N.sub.frequency.setTargetAtTime(f/2,t,.1);
  if(N.bin){N.bin[0].frequency.setTargetAtTime(f,t,.1);N.bin[1].frequency.setTargetAtTime(f+om.beat,t,.1);}}

/* ─────────── CYMATICS (Chladni plate) ───────────
   Sand settles where the plate is still: cos(nπx)cos(mπy) − cos(mπx)cos(nπy) = 0.
   Higher frequencies excite higher (n,m) modes. */
var MODES=[];(function(){for(var n=2;n<=13;n++)for(var m=1;m<n;m++)if((n+m)%2===1||n-m>1)MODES.push([n,m]);
  MODES.sort(function(a,b){return (a[0]*a[0]+a[1]*a[1])-(b[0]*b[0]+b[1]*b[1])});})();
var cym={f:136.1,amp:0,n:3,m:1,label:''};
function modeFor(f){var lo=Math.log2(50),hi=Math.log2(1800),t=(Math.log2(Math.max(50,Math.min(1800,f)))-lo)/(hi-lo);
  return MODES[Math.round(t*(MODES.length-1))];}
function pulse(f,a){cym.f=f;cym.amp=Math.max(cym.amp,a);}

/* ─────────── VISUALS ─────────── */
var cv=$('#cv'),cx=cv.getContext('2d'),W,H,DPR,P=[],vis={flower:true,tree:true,cym:true},energy=0,t0=performance.now();
var view={cy:0,h:0,cyT:0,hT:0};
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2); W=innerWidth; H=innerHeight;
  cv.width=W*DPR; cv.height=H*DPR; cx.setTransform(DPR,0,0,DPR,0,0); layoutView(true);
  var want=W<700?2200:3600; while(P.length<want)P.push(rp()); P.length=want;
}
function rp(){var a=Math.random()*TAU,r=Math.sqrt(Math.random());return {x:Math.cos(a)*r,y:Math.sin(a)*r}}
function layoutView(snap){
  var top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top'))||54;
  var sheetOpen=$('#sheet').classList.contains('open') && W<900;
  var bottom=(W<900?66:94)+(sheetOpen?$('#sheet').offsetHeight:0);
  view.hT=H-top-bottom-30; view.cyT=top+30+view.hT/2;
  if(snap){view.h=view.hT;view.cy=view.cyT;}
}
var tree={g:0,seed:Math.random()};
function drawFlower(t,R){
  var c=W/2,cy=view.cy, r=R*.5, k=Math.min(1,(t)/14); // reveal over 14s
  cx.save(); cx.translate(c,cy); cx.rotate(t*.012);
  cx.strokeStyle='rgba(208,138,69,'+(0.10+energy*.25)+')'; cx.lineWidth=.8;
  var pts=[[0,0]]; for(var ring=1;ring<=2;ring++)for(var s=0;s<6;s++)for(var j=0;j<ring;j++){
    var a=s*Math.PI/3, b=(s+2)*Math.PI/3; pts.push([ring*r*Math.cos(a)+j*r*Math.cos(b),ring*r*Math.sin(a)+j*r*Math.sin(b)]);}
  var show=Math.floor(k*pts.length);
  for(var i=0;i<show;i++){cx.beginPath();cx.arc(pts[i][0],pts[i][1],r,0,TAU);cx.stroke();}
  if(show<pts.length&&show>=0){var p=pts[show],fr=(k*pts.length)%1;cx.beginPath();cx.arc(p[0],p[1],r,-Math.PI/2,-Math.PI/2+fr*TAU);cx.stroke();}
  cx.strokeStyle='rgba(237,235,221,'+(0.06+energy*.1)+')'; cx.beginPath(); cx.arc(0,0,r*3,0,TAU); cx.stroke();
  cx.restore();
}
function drawTree(t){
  var g=Math.min(10,t/2.6); tree.g=g; // one generation every ~2.6s
  var baseY=view.cy+view.h/2+30, len=Math.min(view.h*.24,H*.2), sway=.018+energy*.05;
  cx.save(); cx.lineCap='round';
  (function br(x,y,ang,l,d){
    var p=Math.max(0,Math.min(1,g-d)); if(p<=0) return;
    var a=ang+Math.sin(t*.7+d*.9+tree.seed*9)*sway*d;
    var x2=x+Math.cos(a)*l*p, y2=y+Math.sin(a)*l*p;
    cx.strokeStyle='rgba(208,138,69,'+((vis.cym?0.34:0.6)-d*.025)+')'; cx.lineWidth=Math.max(.5,(10-d)*.42);
    cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x2,y2); cx.stroke();
    if(p<1) return;
    if(d>=9){ // blossom — pulses with the music
      var rr=1.2+energy*5; cx.fillStyle='rgba(239,160,89,'+(0.35+energy*.6)+')'; cx.beginPath(); cx.arc(x2,y2,rr,0,TAU); cx.fill(); return; }
    var th=Math.PI/(4.2+ (d%2)*.6); // golden asymmetry
    br(x2,y2,a-th/PHI,l/PHI,d+1);
    br(x2,y2,a+th,l/PHI*0.94,d+1);
  })(W/2,baseY,-Math.PI/2,len,0);
  cx.restore();
}
function drawCym(R){
  var m=modeFor(cym.f); cym.n=m[0]; cym.m=m[1];
  var n=cym.n*Math.PI, mm=cym.m*Math.PI, step=.012+cym.amp*.06, c=W/2, cy=view.cy;
  cx.fillStyle='rgba(237,235,221,.82)';
  for(var i=0;i<P.length;i++){
    var p=P[i], v=Math.cos(n*p.x)*Math.cos(mm*p.y)-Math.cos(mm*p.x)*Math.cos(n*p.y), s=Math.abs(v)*step;
    p.x+=(Math.random()-.5)*s; p.y+=(Math.random()-.5)*s;
    if(p.x*p.x+p.y*p.y>1){var q=rp();p.x=q.x;p.y=q.y;}
    cx.fillRect(c+p.x*R,cy+p.y*R,1.25,1.25);
  }
  cx.strokeStyle='rgba(237,235,221,'+(0.12+cym.amp*.4)+')'; cx.lineWidth=1;
  cx.beginPath(); cx.arc(c,cy,R+6,0,TAU); cx.stroke();
}
var lastRO=0;
function frame(ts){
  var t=(ts-t0)/1000;
  view.h+=(view.hT-view.h)*.12; view.cy+=(view.cyT-view.cy)*.12;
  if(an){an.getFloatTimeDomainData(anBuf);var s=0;for(var i=0;i<anBuf.length;i+=4)s+=anBuf[i]*anBuf[i];
    energy+=(Math.min(1,Math.sqrt(s/(anBuf.length/4))*4)-energy)*.2;}
  if(mic.on) micTick();
  cym.amp*=.985;
  if(om.on){ if(!mic.on&&cym.amp<.4) cym.f=om.f; cym.amp=Math.max(cym.amp,.35); }
  cx.fillStyle='rgba(0,0,0,.34)'; cx.fillRect(0,0,W,H); // soft trails
  var R=Math.max(60,Math.min(W*.4,view.h*.42));
  if(vis.flower) drawFlower(t,R);
  if(vis.tree) drawTree(t);
  if(vis.cym) drawCym(R);
  if(ts-lastRO>120){lastRO=ts;var sw=swaraOf(cym.f);
    $('#roHz').textContent=cym.f.toFixed(1)+' Hz'; $('#roSw').textContent=sw.name+(sw.cents?(sw.cents>0?' +':' ')+sw.cents+'¢':'');
    $('#roMode').textContent='mode '+cym.n+':'+cym.m;}
  requestAnimationFrame(frame);
}

/* ─────────── MIC (listen) ─────────── */
var mic={on:false,stream:null,an:null,buf:null,lvl:0};
function micToggle(){
  if(mic.on){mic.on=false;mic.stream.getTracks().forEach(function(t){t.stop()});mic.stream=null;
    $('#micBtn').classList.remove('on');$('#micBtn span').textContent='Start listening';liveDots();return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('#micNote').textContent='Microphone not available here (needs https).';return;}
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    mic.stream=st; var src=ac.createMediaStreamSource(st); mic.an=ac.createAnalyser(); mic.an.fftSize=2048;
    mic.buf=new Float32Array(mic.an.fftSize); src.connect(mic.an); mic.on=true;
    $('#micBtn').classList.add('on');$('#micBtn span').textContent='Listening';liveDots();
  }).catch(function(){$('#micNote').textContent='Microphone permission was declined.';});
}
function pitch(buf,sr){ // autocorrelation with parabolic interpolation
  var n=buf.length,rms=0,i;for(i=0;i<n;i++)rms+=buf[i]*buf[i];rms=Math.sqrt(rms/n);
  if(rms<.008) return {f:0,rms:rms};
  var minL=Math.floor(sr/1500),maxL=Math.floor(sr/55),best=-1,bv=0,c=new Float32Array(maxL+2);
  for(var l=minL;l<=maxL+1;l++){var s=0;for(i=0;i<n-l;i++)s+=buf[i]*buf[i+l];c[l]=s;}
  for(l=minL+1;l<=maxL;l++){if(c[l]>c[l-1]&&c[l]>=c[l+1]&&c[l]>bv){bv=c[l];best=l;}}
  if(best<0||bv<c[0]*0.3) return {f:0,rms:rms}; // weak periodicity → noise, ignore
  var a=c[best-1],b=c[best],d=c[best+1],sh=(a-d)/(2*(a-2*b+d))||0;
  return {f:sr/(best+sh),rms:rms};
}
var micFrame=0;
function micTick(){
  if(++micFrame%2) return; mic.an.getFloatTimeDomainData(mic.buf);
  var r=pitch(mic.buf,ac.sampleRate); mic.lvl+=(Math.min(1,r.rms*8)-mic.lvl)*.4;
  $('#micLvl').style.width=(mic.lvl*100).toFixed(0)+'%';
  if(r.f>50&&r.f<1600){cym.f=r.f;cym.amp=Math.max(cym.amp,Math.min(1,r.rms*10));
    var sw=swaraOf(r.f); $('#micHz').textContent=r.f.toFixed(1)+' Hz';
    $('#micNote').textContent=westOf(r.f)+' · '+sw.name+(sw.cents?' '+(sw.cents>0?'+':'')+sw.cents+'¢':'')+' from Sa';}
}

/* ─────────── UI BUILDERS ─────────── */
function buildHandpan(){
  var hp=$('#hp'); hp.innerHTML=''; var notes=ladder(9,0);
  // ding in the centre; eight fields climb in a zig-zag from the bottom, the way a real pan is laid out
  var ANG=[112,68,148,32,188,-8,232,-52];
  notes.forEach(function(nt,i){
    var b=document.createElement('button'); b.textContent=nt.name+(nt.oct>0?'\u0307':'');
    if(i===0){b.className='ding';b.style.left='50%';b.style.top='50%';b.style.width=b.style.height='30%';}
    else{var a=ANG[i-1]*Math.PI/180;
      b.style.left=(50+Math.cos(a)*35)+'%';b.style.top=(50+Math.sin(a)*35)+'%';b.style.width=b.style.height='21%';}
    b.addEventListener('pointerdown',function(e){e.preventDefault();ensure();handpan(nt.f,1);hit(b);});
    hp.appendChild(b);
  });
  $('#hpScale').textContent=RAGAS[S.raga].n;
}
function hit(el){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},180);}
var padNotes=[];
function buildPad(){
  padNotes=ladder(scale().length*2+1,0); var cols=$('#xyCols'); cols.innerHTML='';
  padNotes.forEach(function(nt){var d=document.createElement('div');d.textContent=nt.name;if(nt.semi===0)d.className='sa';cols.appendChild(d);});
}
function bindPad(){
  var xy=$('#xy'),dots={};
  function at(e){var r=xy.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    x=Math.max(0,Math.min(.999,x));y=Math.max(0,Math.min(1,y));
    return {nt:padNotes[Math.floor(x*padNotes.length)],bright:200*Math.pow(30,1-y),px:e.clientX-r.left,py:e.clientY-r.top};}
  xy.addEventListener('pointerdown',function(e){e.preventDefault();ensure();xy.setPointerCapture(e.pointerId);
    var a=at(e);padOn(e.pointerId,a.nt.f,a.bright);var d=document.createElement('div');d.className='dot';xy.appendChild(d);dots[e.pointerId]=d;
    d.style.left=a.px+'px';d.style.top=a.py+'px';});
  xy.addEventListener('pointermove',function(e){if(!dots[e.pointerId])return;var a=at(e);padMove(e.pointerId,a.nt.f,a.bright);
    dots[e.pointerId].style.left=a.px+'px';dots[e.pointerId].style.top=a.py+'px';});
  function up(e){padOff(e.pointerId);if(dots[e.pointerId]){dots[e.pointerId].remove();delete dots[e.pointerId];}}
  xy.addEventListener('pointerup',up);xy.addEventListener('pointercancel',up);
}
function bindDjembe(){
  var dj=$('#dj');
  dj.addEventListener('pointerdown',function(e){e.preventDefault();ensure();
    var r=dj.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5,d=Math.sqrt(x*x+y*y)*2;
    if(d>1.02) return; var k=d<.3?'bass':d<.72?'tone':'slap'; djembe(k);
    var rp_=document.createElement('i');rp_.className='rip';rp_.style.left=(e.clientX-r.left)+'px';rp_.style.top=(e.clientY-r.top)+'px';
    rp_.style.transform='translate(-50%,-50%)';dj.appendChild(rp_);setTimeout(function(){rp_.remove()},700);});
}
function buildRaga(){
  var box=$('#ragas'); box.innerHTML='';
  RAGAS.forEach(function(r,i){var b=document.createElement('button');b.innerHTML='<b>'+r.n+'</b><small>'+r.s.map(function(s){return SW[s]}).join(' ')+'</small>';
    if(i===S.raga)b.className='on';b.onclick=function(){S.raga=i;store('raga',i);refreshScale();};box.appendChild(b);});
  var sw=$('#swaras'); sw.innerHTML='';
  ladder(scale().length+1,0).forEach(function(nt,i){var b=document.createElement('button');b.textContent=nt.name+(nt.oct>0?'̇':'');
    b.addEventListener('pointerdown',function(e){e.preventDefault();ensure();handpan(nt.f,.9);hit(b);});sw.appendChild(b);});
  $('#ragaInfo').textContent=RAGAS[S.raga].m;
}
function buildSa(){
  var box=$('#saChips'); box.innerHTML='';
  SA_PRESETS.forEach(function(p){var b=document.createElement('button');b.textContent=p[0]+' · '+p[1];
    if(Math.abs(p[1]-S.saBase)<.01)b.className='on';b.onclick=function(){S.saBase=p[1];store('sa',p[1]);refreshScale();};box.appendChild(b);});
  $('#saFine').value=S.saCents; $('#saHz').textContent=Sa().toFixed(1);
}
function refreshScale(){buildRaga();buildSa();buildHandpan();buildPad();}
function buildFreqs(){
  var box=$('#freqs');
  FREQS.forEach(function(p){var b=document.createElement('button');b.innerHTML='<b>'+p[0]+' Hz</b><small>'+p[2]+'</small>';
    b.onclick=function(){$$('#freqs button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');setOm(p[1]);};box.appendChild(b);});
}
function setOm(f){om.f=f;$('#omF').value=Math.round(Math.log(f/40)/Math.log(1000/40)*1000);$('#omHz').textContent=f.toFixed(1)+' Hz';omSetF(f);cym.f=f;cym.amp=Math.max(cym.amp,.5);}

function sizeInst(){ // circular instruments: largest circle that fits the panel
  ['#hp','#dj'].forEach(function(sel){var el=$(sel),pn=el.parentElement;if(!pn.classList.contains('on'))return;
    var hd=pn.querySelector('.ph').offsetHeight+12, s=Math.min(pn.clientWidth-32,pn.clientHeight-hd-28);
    el.style.width=el.style.height=Math.max(140,s)+'px';});
}
/* ─────────── SHELL ─────────── */
var started=false;
function ensure(){initAudio(); if(ac.state!=='running') ac.resume();}
function openPanel(p){
  var sheet=$('#sheet'),cur=sheet.getAttribute('data-cur');
  if(cur===p&&sheet.classList.contains('open')){sheet.classList.remove('open');$$('.dock button').forEach(function(b){b.classList.remove('on')});}
  else{sheet.classList.add('open');sheet.setAttribute('data-cur',p);
    $$('.panel').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-p')===p)});
    $$('.dock button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-p')===p)});
    requestAnimationFrame(sizeInst);}
  setTimeout(function(){layoutView()},20); setTimeout(function(){layoutView()},520);
}
function liveDots(){
  $('.dock [data-p=om]').classList.toggle('live',om.on);
  $('.dock [data-p=raga]').classList.toggle('live',tan.on);
  $('.dock [data-p=mic]').classList.toggle('live',mic.on);
}
$$('.dock button').forEach(function(b){b.addEventListener('click',function(){ensure();openPanel(b.getAttribute('data-p'))})});
$$('#layers button').forEach(function(b){b.addEventListener('click',function(){var l=b.getAttribute('data-l');vis[l]=!vis[l];b.classList.toggle('on',vis[l]);})});
$('#saChip').addEventListener('click',function(){ensure();openPanel('raga')});
$('#enter').addEventListener('click',function(){
  ensure(); $('#gate').classList.add('gone'); started=true; t0=performance.now();
  handpan(fq(0,0),.8); setTimeout(function(){handpan(fq(7,0),.6)},420); setTimeout(function(){handpan(fq(0,1),.5)},840);
  openPanel('handpan');
});
$('#omBtn').addEventListener('click',function(){ensure();if(om.on){omStop();$('#omBtn').classList.remove('on');}else{omStart();$('#omBtn').classList.add('on');}liveDots();});
$('#omF').addEventListener('input',function(e){var f=40*Math.pow(1000/40,e.target.value/1000);setOm(Math.round(f*10)/10);$$('#freqs button').forEach(function(x){x.classList.remove('on')});});
$('#omB').addEventListener('input',function(e){om.breath=+e.target.value;$('#omBr').textContent=om.breath+' s';$('#omBtn').style.setProperty('--br',om.breath+'s');});
$('#omBin').addEventListener('change',function(e){ensure();om.bin=e.target.checked;omBinaural();});
$('#tanBtn').addEventListener('click',function(){ensure();tanToggle();});
$('#aroBtn').addEventListener('click',function(){ensure();
  var up=ladder(scale().length+1,0), seq=up.concat(up.slice(0,-1).reverse());
  seq.forEach(function(nt,i){setTimeout(function(){handpan(nt.f,.8);var bs=$$('#swaras button'),k=i<up.length?i:seq.length-1-i;if(bs[k])hit(bs[k]);},i*360)});
});
$('#saFine').addEventListener('input',function(e){S.saCents=+e.target.value;store('cents',S.saCents);$('#saHz').textContent=Sa().toFixed(1);buildHandpan();buildPad();buildRaga();});
$('#micBtn').addEventListener('click',function(){ensure();micToggle();});
document.addEventListener('visibilitychange',function(){if(document.hidden&&ac&&!om.on&&!tan.on)ac.suspend();else if(!document.hidden&&ac)ac.resume();});
addEventListener('resize',function(){resize();sizeInst();});

buildFreqs(); refreshScale(); bindPad(); bindDjembe(); setOm(136.1); cym.amp=0;
resize(); requestAnimationFrame(frame);
})();

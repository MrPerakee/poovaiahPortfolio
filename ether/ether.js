/* ═══════════════════════════════════════════
   ETHER — a small world of sound
   Handpan · Synth pad · Djembe · Om · Raga/Tanpura · Frequencies · Listen (microphone) · Loop & record
   Visuals: a 3D Chladni plate with sand (WebGL) · Flower of Life inlay · golden-ratio tree · the ember that listens
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
var ac,bus,master,an,anBuf,verb,instOut,loopBus,tapInst,tapMix;
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
  instOut=ac.createGain(); loopBus=ac.createGain();            // instruments (+their reverb) · loop playback
  bus.connect(instOut); bus.connect(verb); verb.connect(wet); wet.connect(instOut);
  instOut.connect(master); loopBus.connect(master);
  an=ac.createAnalyser(); an.fftSize=1024; anBuf=new Float32Array(an.fftSize);
  master.connect(comp); comp.connect(an); an.connect(ac.destination);
  tapInst=makeTap(instOut); tapMix=makeTap(comp);              // looper hears only what you play; session hears everything
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

/* ─────────── CYMATICS — a Chladni plate ───────────
   A square plate driven at its centre. Mode (n,m) has the shape cos(nπx)cos(mπy) ± cos(mπx)cos(nπy) and its own
   pitch f ≈ C·(n²+m²) — the plate law (pitch rises with the square of the wave count). A driving tone excites the
   modes whose pitch lies close to it (a resonance curve), so the figure morphs as the tone moves and the sand
   dances hardest on resonance. Grains hop where the plate moves and come to rest on the still (nodal) lines. */
var NMAX=16, PLATE_C=12, GAMMA=.022, MODES=[];
(function(){for(var n=1;n<=NMAX;n++)for(var m=0;m<=n;m++)MODES.push({n:n,m:m,f:PLATE_C*(n*n+m*m),s:(n-m)%2?-1:1});})();
var cym={f:136.1,amp:0,n:3,m:1,res:1};
var G=innerWidth<700?128:176, field=new Float32Array(G*G), cosT=new Float32Array((NMAX+1)*G), fieldKey='';
(function(){for(var n=0;n<=NMAX;n++)for(var i=0;i<G;i++)cosT[n*G+i]=Math.cos(n*Math.PI*(-1+2*i/(G-1)));})();
function buildField(comps){ // comps: [[frequency, weight], …] — one for a tone, several for a voice or a room
  var key=comps.map(function(c){return (Math.round(c[0]*2)/2)+':'+Math.round(c[1]*10)}).join('|');
  if(key===fieldKey) return; fieldKey=key;
  var terms=[],i,j,k;
  comps.forEach(function(c,ci){
    var f=Math.max(PLATE_C*1.2,Math.min(c[0],PLATE_C*NMAX*NMAX*1.6)), cand=[];
    for(k=0;k<MODES.length;k++){var md=MODES[k],d=(f-md.f)/(md.f*GAMMA);cand.push([1/(1+d*d),md]);}
    cand.sort(function(x,y){return y[0]-x[0]});
    for(k=0;k<3;k++){ if(k&&cand[k][0]<cand[0][0]*.12) break; terms.push([cand[k][0]/cand[0][0]*c[1],cand[k][1]]); }
    if(ci===0){ cym.n=cand[0][1].n; cym.m=cand[0][1].m; cym.res=Math.sqrt(cand[0][0]); }
  });
  for(i=0;i<field.length;i++)field[i]=0;
  terms.forEach(function(tm){var w=tm[0],n=tm[1].n*G,m=tm[1].m*G,sw=tm[1].s*w;
    for(j=0;j<G;j++){var yn=cosT[n+j]*sw,ym=cosT[m+j]*w,o=j*G;
      for(i=0;i<G;i++)field[o+i]+=cosT[n+i]*ym+cosT[m+i]*yn;}});
  var mx=0;for(i=0;i<field.length;i++){var v=field[i]<0?-field[i]:field[i];field[i]=v;if(v>mx)mx=v;}
  if(mx>0){mx=1/mx;for(i=0;i<field.length;i++)field[i]*=mx;}
}
function pulse(f,a){cym.f=f;cym.amp=Math.max(cym.amp,a);}
function rp(){var a=Math.random()*TAU,r=Math.sqrt(Math.random());return {x:Math.cos(a)*r,y:Math.sin(a)*r}}

/* sand */
var NP=innerWidth<700?13000:((navigator.hardwareConcurrency||4)>=8?38000:26000);
var pos=new Float32Array(NP*3), seed=new Float32Array(NP*2), kicks=[];
(function(){for(var i=0;i<NP;i++){pos[i*3]=Math.random()*2-1;pos[i*3+1]=Math.random()*2-1;seed[i*2]=Math.random();seed[i*2+1]=Math.random();}})();
function stepSand(){
  var a=cym.amp*(.35+.65*cym.res), st=.005+a*.075, hop=a*.085, g1=(G-1)*.5, tn=performance.now(), kk=kicks.length, i,o=0,x,y,z,u,s,q;
  for(i=0;i<NP;i++,o+=3){
    x=pos[o]; y=pos[o+1];
    u=field[(((y+1)*g1+.5)|0)*G+(((x+1)*g1+.5)|0)];
    s=u*st; x+=(Math.random()-.5)*s; y+=(Math.random()-.5)*s; z=u*hop*Math.random();
    if(kk) for(q=0;q<kk;q++){ // a strike: a ring of sand leaps outward from the touch
      var kq=kicks[q],age=(tn-kq.t)/1000,dx=x-kq.x,dy=y-kq.y,d=Math.sqrt(dx*dx+dy*dy),w=1-Math.abs(d-age*1.9)/.13;
      if(w>0){var e=(1-age/.7)*w; if(e>0){z+=e*.1*(.4+Math.random()*.6);x+=dx/(d+.02)*e*.014;y+=dy/(d+.02)*e*.014;}} }
    if(x>1||x<-1||y>1||y<-1){x=Math.random()*2-1;y=Math.random()*2-1;}
    pos[o]=x; pos[o+1]=y; pos[o+2]=z;
  }
  if(kk) kicks=kicks.filter(function(k){return tn-k.t<700});
}

/* ─────────── VISUALS ─────────── */
var cv=$('#cv'),cx=cv.getContext('2d'),glc=$('#gl'),W,H,DPR,energy=0,t0=performance.now();
var vis={flower:true,tree:true,cym:true,pres:store('pres')!=='0'};
var view={cy:0,h:0,cyT:0,hT:0};
var cam={yaw:.62,tilt:.9,yawT:.62,tiltT:.9,d:3.4,R:120,cx:0,cy:0,cs:1,sn:0,ct:1,st:0,hold:0};
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2); W=innerWidth; H=innerHeight;
  cv.width=W*DPR; cv.height=H*DPR; cx.setTransform(DPR,0,0,DPR,0,0);
  glc.width=W*DPR; glc.height=H*DPR; layoutView(true);
}
function layoutView(snap){
  var top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top'))||54;
  var sheetOpen=$('#sheet').classList.contains('open') && W<900;
  var bottom=(W<900?66:94)+(sheetOpen?$('#sheet').offsetHeight:0);
  view.hT=H-top-bottom-30; view.cyT=top+30+view.hT/2;
  if(snap){view.h=view.hT;view.cy=view.cyT;}
}
/* camera: the plate lies in x,y (z is up); we look down at it from a tilt and can orbit */
function camUpdate(){
  if(performance.now()-cam.hold>4000) cam.yawT+=.0007;
  cam.yaw+=(cam.yawT-cam.yaw)*.14; cam.tilt+=(cam.tiltT-cam.tilt)*.14;
  cam.cs=Math.cos(cam.yaw); cam.sn=Math.sin(cam.yaw); cam.ct=Math.cos(cam.tilt); cam.st=Math.sin(cam.tilt);
  // size the plate so it fits the free space at any rotation; on wide screens it steps aside for the open panel
  var side=(W>=900&&$('#sheet').classList.contains('open')&&!document.body.classList.contains('full'))?440:0, availW=W-side-28;
  var ex=0,up=0,dn=0,i,a,x1,y1,k,r=1.4142;
  for(i=0;i<16;i++){a=i/16*TAU;x1=Math.cos(a)*r;y1=Math.sin(a)*r;k=cam.d/(cam.d+y1*cam.st);
    ex=Math.max(ex,Math.abs(x1*k));up=Math.max(up,y1*cam.ct*k);dn=Math.max(dn,-y1*cam.ct*k);}
  var Rt=Math.max(56,Math.min(availW/2/ex,(view.h+20)/(up+dn+.12)));
  var cxT=(W-side)/2, cyT=view.cy-view.h/2-10+Math.max(0,(view.h+20-Rt*(up+dn))/2)+Rt*up;
  if(!cam.R0){cam.R=Rt;cam.cx=cxT;cam.cy=cyT;cam.R0=1;}
  cam.R+=(Rt-cam.R)*.12; cam.cx+=(cxT-cam.cx)*.12; cam.cy+=(cyT-cam.cy)*.12;
}
function proj(x,y,z){var x1=x*cam.cs-y*cam.sn,y1=x*cam.sn+y*cam.cs,k=cam.d/(cam.d+y1*cam.st-z*cam.ct);
  return [cam.cx+cam.R*x1*k, cam.cy-cam.R*(y1*cam.ct+z*cam.st)*k, k];}
function unproj(sx,sy){ // screen → point on the plate surface (z=0)
  var a=(sx-cam.cx)/cam.R,b=-(sy-cam.cy)/cam.R,den=cam.ct*cam.d-b*cam.st; if(den<=0) return null;
  var y1=b*cam.d/den,k=cam.d/(cam.d+y1*cam.st),x1=a/k;
  return [x1*cam.cs+y1*cam.sn,-x1*cam.sn+y1*cam.cs];
}
var tree={g:0,seed:Math.random()};
function drawTree(t){
  var g=Math.min(10,t/2.6); tree.g=g; // one generation every ~2.6s
  var baseY=view.cy+view.h/2+30, len=Math.min(view.h*.24,H*.2), sway=.018+energy*.05;
  cx.save(); cx.lineCap='round';
  (function br(x,y,ang,l,d){
    var p=Math.max(0,Math.min(1,g-d)); if(p<=0) return;
    var a=ang+Math.sin(t*.7+d*.9+tree.seed*9)*sway*d;
    var x2=x+Math.cos(a)*l*p, y2=y+Math.sin(a)*l*p;
    cx.strokeStyle='rgba(208,138,69,'+((vis.cym?0.4:0.6)-d*.025)+')'; cx.lineWidth=Math.max(.5,(10-d)*.42);
    cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x2,y2); cx.stroke();
    if(p<1) return;
    if(d>=9){ // blossom — pulses with the music
      var rr=1.2+energy*5; cx.fillStyle='rgba(239,160,89,'+(0.35+energy*.6)+')'; cx.beginPath(); cx.arc(x2,y2,rr,0,TAU); cx.fill(); return; }
    var th=Math.PI/(4.2+ (d%2)*.6); // golden asymmetry
    br(x2,y2,a-th/PHI,l/PHI,d+1);
    br(x2,y2,a+th,l/PHI*0.94,d+1);
  })(cam.cx||W/2,baseY,-Math.PI/2,len,0);
  cx.restore();
}
function quad(z){return [proj(-1,-1,z),proj(1,-1,z),proj(1,1,z),proj(-1,1,z)];}
function trace(q){cx.beginPath();cx.moveTo(q[0][0],q[0][1]);for(var i=1;i<q.length;i++)cx.lineTo(q[i][0],q[i][1]);cx.closePath();}
function drawPlate(){ // a slab of dark glass, lit from beneath and by the ember above it
  var top=quad(0),bot=quad(-.06),c=proj(0,0,-.2),R=cam.R,i,g;
  g=cx.createRadialGradient(c[0],c[1]+R*.1,R*.2,c[0],c[1]+R*.1,R*1.6);
  g.addColorStop(0,'rgba(208,138,69,'+(.08+energy*.1)+')'); g.addColorStop(1,'rgba(208,138,69,0)');
  cx.fillStyle=g; cx.fillRect(c[0]-R*2,c[1]-R*2,R*4,R*4);
  trace(bot); cx.fillStyle='#050403'; cx.fill();
  for(i=0;i<4;i++){var j=(i+1)%4; trace([top[i],top[j],bot[j],bot[i]]); cx.fillStyle='#0d0b09'; cx.fill();
    cx.strokeStyle='rgba(208,138,69,.22)'; cx.lineWidth=1; cx.stroke();}
  var y0=Math.max(top[0][1],top[1][1],top[2][1],top[3][1]), y1=Math.min(top[0][1],top[1][1],top[2][1],top[3][1]);
  g=cx.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'rgba(34,29,23,.9)'); g.addColorStop(1,'rgba(10,9,8,.84)');
  trace(top); cx.fillStyle=g; cx.fill();
  if(vis.pres){ var l=proj(pres.x,pres.y,0), lr=R*(.5+pres.glow*.25);
    cx.save(); trace(top); cx.clip();
    g=cx.createRadialGradient(l[0],l[1],0,l[0],l[1],lr); g.addColorStop(0,'rgba(239,160,89,'+Math.min(.34,.1+pres.glow*.12)+')'); g.addColorStop(1,'rgba(239,160,89,0)');
    cx.fillStyle=g; cx.fillRect(l[0]-lr,l[1]-lr,lr*2,lr*2); cx.restore(); }
  trace(top); cx.strokeStyle='rgba(237,235,221,'+(.2+cym.amp*.35)+')'; cx.lineWidth=1; cx.stroke();
}
function drawFlower(t){ // Flower of Life, inlaid in the plate
  var r=1/3, k=Math.max(0,Math.min(1,t/14)), SEG=44, a, i, q; // reveal over 14s
  var pts=[[0,0]]; for(var ring=1;ring<=2;ring++)for(var s=0;s<6;s++)for(var j=0;j<ring;j++){
    a=s*Math.PI/3; var b=(s+2)*Math.PI/3; pts.push([ring*r*Math.cos(a)+j*r*Math.cos(b),ring*r*Math.sin(a)+j*r*Math.sin(b)]);}
  function arc(px,py,rad,frac){cx.beginPath();var n=Math.max(2,Math.round(SEG*frac));
    for(i=0;i<=n;i++){a=-Math.PI/2+i/SEG*TAU;q=proj(px+Math.cos(a)*rad,py+Math.sin(a)*rad,0);if(i)cx.lineTo(q[0],q[1]);else cx.moveTo(q[0],q[1]);}cx.stroke();}
  cx.strokeStyle='rgba(208,138,69,'+(0.13+energy*.25)+')'; cx.lineWidth=.8;
  var show=Math.floor(k*pts.length);
  for(var c=0;c<show;c++)arc(pts[c][0],pts[c][1],r,1);
  if(show<pts.length)arc(pts[show][0],pts[show][1],r,(k*pts.length)%1);
  cx.strokeStyle='rgba(237,235,221,'+(0.07+energy*.1)+')'; arc(0,0,1,1);
}

/* WebGL — every grain is a small lit sphere with its own shadow */
var gl=null,prog,U={},posBuf,seedBuf,emberBuf,emberPos=new Float32Array(3);
function initGL(){
  try{gl=glc.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false})||glc.getContext('experimental-webgl');}catch(e){gl=null}
  if(!gl) return;
  var VS='attribute vec3 aPos;attribute vec2 aSeed;uniform vec2 uView;uniform vec3 uCam;uniform vec4 uRot;uniform vec3 uLight;'+
    'uniform float uD,uDpr,uSize,uMode,uGlow,uLit;varying vec3 vCol;varying float vSp;'+
    'void main(){vec3 p=aPos;'+
    'if(uMode>.5&&uMode<1.5){p.xy+=(p.xy-uLight.xy)*(p.z+.012)/max(.2,uLight.z)*.7+vec2(.005,-.005);p.z=0.;}'+
    'float x1=p.x*uRot.x-p.y*uRot.y,y1=p.x*uRot.y+p.y*uRot.x;'+
    'float k=uD/(uD+y1*uRot.w-p.z*uRot.z);'+
    'gl_Position=vec4((uCam.x+uCam.z*x1*k)/uView.x*2.-1.,1.-(uCam.y-uCam.z*(y1*uRot.z+p.z*uRot.w)*k)/uView.y*2.,0.,1.);'+
    'float sz=uSize*k*uDpr;vSp=0.;'+
    'if(uMode>1.5){gl_PointSize=sz*uGlow;vCol=vec3(1.,.64,.32);}else{'+
    'gl_PointSize=max(1.,sz*(.72+.6*aSeed.y)*(uMode>.5?1.4:1.));'+
    'vec3 L=uLight-aPos;float lit=uLit/(1.+dot(L,L)*5.);'+
    'vec3 base=mix(vec3(.96,.93,.85),vec3(.80,.57,.32),aSeed.x*aSeed.x);'+
    'vCol=base*(.6+aPos.z*5.)+vec3(1.,.56,.24)*lit;vSp=step(.93,aSeed.y);}}';
  var FS='precision mediump float;varying vec3 vCol;varying float vSp;uniform float uMode;'+
    'void main(){vec2 q=gl_PointCoord*2.-1.;float r2=dot(q,q);if(r2>1.)discard;'+
    'if(uMode>1.5){float g=exp(-r2*5.);gl_FragColor=vec4(vCol*g*g*1.3+vec3(1.,.95,.85)*exp(-r2*70.),0.);return;}'+
    'if(uMode>.5){gl_FragColor=vec4(0.,0.,0.,.45*(1.-r2));return;}'+
    'float diff=max(0.,dot(vec3(q.x,-q.y,sqrt(1.-r2)),vec3(-.42,.52,.74)));'+
    'vec3 c=vCol*(.36+.82*diff)+vSp*pow(diff,24.)*.9;float a=smoothstep(1.,.5,r2);gl_FragColor=vec4(c*a,a);}';
  function sh(type,src){var o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn('ether shader',gl.getShaderInfoLog(o));return null;}return o;}
  var v=sh(gl.VERTEX_SHADER,VS),f=sh(gl.FRAGMENT_SHADER,FS); if(!v||!f){gl=null;return;}
  prog=gl.createProgram(); gl.attachShader(prog,v); gl.attachShader(prog,f);
  gl.bindAttribLocation(prog,0,'aPos'); gl.bindAttribLocation(prog,1,'aSeed'); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){gl=null;return;}
  ['uView','uCam','uRot','uLight','uD','uDpr','uSize','uMode','uGlow','uLit'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
  posBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,posBuf); gl.bufferData(gl.ARRAY_BUFFER,pos,gl.DYNAMIC_DRAW);
  seedBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,seedBuf); gl.bufferData(gl.ARRAY_BUFFER,seed,gl.STATIC_DRAW);
  emberBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,emberBuf); gl.bufferData(gl.ARRAY_BUFFER,emberPos,gl.DYNAMIC_DRAW);
  gl.enable(gl.BLEND); gl.clearColor(0,0,0,0);
}
function drawGL(){
  gl.viewport(0,0,glc.width,glc.height); gl.clear(gl.COLOR_BUFFER_BIT);
  if(!vis.cym&&!vis.pres) return;
  gl.useProgram(prog);
  gl.uniform2f(U.uView,W,H); gl.uniform3f(U.uCam,cam.cx,cam.cy,cam.R); gl.uniform4f(U.uRot,cam.cs,cam.sn,cam.ct,cam.st);
  gl.uniform3f(U.uLight,pres.x,pres.y,pres.z); gl.uniform1f(U.uD,cam.d); gl.uniform1f(U.uDpr,DPR);
  gl.uniform1f(U.uSize,Math.max(1.25,cam.R/135)); gl.uniform1f(U.uLit,vis.pres?.35+pres.glow*.6:0); gl.uniform1f(U.uGlow,1);
  gl.enableVertexAttribArray(0);
  if(vis.cym){
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER,posBuf); gl.bufferSubData(gl.ARRAY_BUFFER,0,pos); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,seedBuf); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
    gl.uniform1f(U.uMode,1); gl.drawArrays(gl.POINTS,0,NP);   // shadows first
    gl.uniform1f(U.uMode,0); gl.drawArrays(gl.POINTS,0,NP);   // then the grains
  }
  if(vis.pres){
    emberPos[0]=pres.x; emberPos[1]=pres.y; emberPos[2]=pres.z;
    gl.bindBuffer(gl.ARRAY_BUFFER,emberBuf); gl.bufferSubData(gl.ARRAY_BUFFER,0,emberPos); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    gl.disableVertexAttribArray(1); gl.vertexAttrib2f(1,0,1);
    gl.blendFunc(gl.ONE,gl.ONE); gl.uniform1f(U.uMode,2); gl.uniform1f(U.uGlow,16+pres.glow*12); gl.drawArrays(gl.POINTS,0,1);
  }
}
function drawSand2D(){ // fallback when WebGL is unavailable
  cx.fillStyle='rgba(237,225,200,.85)'; var n=Math.min(NP,9000),i,q;
  for(i=0;i<n;i++){q=proj(pos[i*3],pos[i*3+1],pos[i*3+2]);cx.fillRect(q[0],q[1],1.3,1.3);}
  if(vis.pres){q=proj(pres.x,pres.y,pres.z);var g=cx.createRadialGradient(q[0],q[1],0,q[0],q[1],26);
    g.addColorStop(0,'rgba(255,200,140,.9)');g.addColorStop(1,'rgba(239,160,89,0)');cx.fillStyle=g;cx.fillRect(q[0]-26,q[1]-26,52,52);}
}
var lastRO=0,lastField=0;
function frame(ts){
  var t=(ts-t0)/1000;
  view.h+=(view.hT-view.h)*.12; view.cy+=(view.cyT-view.cy)*.12;
  if(an){an.getFloatTimeDomainData(anBuf);var s=0;for(var i=0;i<anBuf.length;i+=4)s+=anBuf[i]*anBuf[i];
    energy+=(Math.min(1,Math.sqrt(s/(anBuf.length/4))*4)-energy)*.2;}
  cym.amp*=.985;
  var comps=null;
  if(mic.on) comps=micTick(ts);
  if(!comps){
    if(tone.on){ toneSweep(); if(cym.amp<.5) cym.f=tone.f; cym.amp=Math.max(cym.amp,.5); }
    else if(om.on){ if(cym.amp<.4) cym.f=om.f; cym.amp=Math.max(cym.amp,.35); }
    comps=[[cym.f,1]];
  }
  if(ts-lastField>45){lastField=ts;buildField(comps);}
  camUpdate(); presTick(t,ts);
  cx.fillStyle='rgba(0,0,0,.34)'; cx.fillRect(0,0,W,H); // soft trails
  if(vis.tree) drawTree(t);
  if(vis.cym){ drawPlate(); stepSand(); }
  if(vis.flower) drawFlower(t);
  if(gl) drawGL(); else if(vis.cym) drawSand2D();
  if(ts-lastRO>120){lastRO=ts;var sw=swaraOf(cym.f);
    $('#roHz').textContent=cym.f.toFixed(1)+' Hz'; $('#roSw').textContent=sw.name+(sw.cents?(sw.cents>0?' +':' ')+sw.cents+'¢':'');
    $('#roMode').textContent='mode '+cym.n+':'+cym.m;
    $('#toneInfo').textContent=(tone.on?'resonance '+Math.round(cym.res*100)+'% · ':'')+'mode '+cym.n+':'+cym.m;}
  requestAnimationFrame(frame);
}

/* ─────────── FREQUENCIES — a pure tone for the plate ───────────
   Associations are the ones tradition gives these numbers; they are offered as sound, not as claims. */
var TONES=[['432',432,'Calm · warm pitch'],['528',528,'Uplift · Solfeggio Mi'],['639',639,'Connection · Fa'],['396',396,'Release · Ut'],
  ['417',417,'Change · Re'],['741',741,'Clarity · Sol'],['852',852,'Intuition · La'],['963',963,'Openness'],
  ['174',174,'Ease · grounding'],['285',285,'Restore'],['136.1',136.1,'Om · Earth year'],['40',40,'Gamma · focus 🎧']];
var BEATS=[['Off',0],['Theta · 6',6],['Earth · 7.83',7.83],['Alpha · 10',10],['Gamma · 40',40]];
var tone={on:false,f:Math.max(20,Math.min(2000,+(store('tone')||432))),beat:0,nodes:null,sweep:0,last:0};
function toneGain(f){return .2*Math.min(1,Math.pow(420/Math.max(420,f),.55));}
function toneStart(){
  var t=now(),N={o:[]}; N.g=ac.createGain(); N.g.gain.setValueAtTime(0,t); N.g.gain.linearRampToValueAtTime(toneGain(tone.f),t+.7);
  function osc(f,type,gain,pan){var o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;g.gain.value=gain;o.connect(g);
    if(pan&&ac.createStereoPanner){var pn=ac.createStereoPanner();pn.pan.value=pan;g.connect(pn);pn.connect(N.g);}else g.connect(N.g);
    o.start(t);N.o.push(o);return o;}
  if(tone.beat){ N.a=osc(tone.f,'sine',1,-1); N.b=osc(tone.f+tone.beat,'sine',1,1); N.g.connect(master); } // each ear its own tone
  else{ N.a=osc(tone.f,'sine',1,0); N.h=osc(tone.f*2,'sine',.1,0); N.g.connect(bus); }
  tone.nodes=N; tone.on=true;
}
function toneStop(){var N=tone.nodes; tone.on=false; tone.sweep=0; if(!N) return; var t=now();
  N.g.gain.cancelScheduledValues(t); N.g.gain.setValueAtTime(N.g.gain.value,t); N.g.gain.linearRampToValueAtTime(0,t+.5);
  N.o.forEach(function(o){try{o.stop(t+.6)}catch(e){}}); tone.nodes=null;}
function setTone(f,quiet){
  f=Math.max(20,Math.min(2000,f)); tone.f=f; store('tone',f);
  $('#toneHz').textContent=f>=100?(Math.round(f*10)/10).toString():f.toFixed(1);
  $('#toneF').value=Math.round(Math.log(f/20)/Math.log(100)*1000);
  $$('#toneFreqs button').forEach(function(b){b.classList.toggle('on',Math.abs(+b.getAttribute('data-f')-f)<.05)});
  var N=tone.nodes; if(N){var t=now(); N.a.frequency.setTargetAtTime(f,t,.04); if(N.h)N.h.frequency.setTargetAtTime(f*2,t,.04);
    if(N.b)N.b.frequency.setTargetAtTime(f+tone.beat,t,.04); N.g.gain.setTargetAtTime(toneGain(f),t,.1);}
  if(!quiet){cym.f=f;cym.amp=Math.max(cym.amp,.7);}
}
function toneToggle(){ensure(); if(tone.on) toneStop(); else{toneStart();pulse(tone.f,.9);} toneUI();}
function toneUI(){$('#toneBtn').classList.toggle('on',tone.on);$('#toneState').textContent=tone.on?'Hz · playing':'Hz · tap to play';
  $('#toneSweep').classList.toggle('on',!!tone.sweep);liveDots();}
function toneSweep(){ // a slow glide through the plate's modes — one octave every eight seconds
  var n=performance.now(),dt=Math.min(.1,(n-tone.last)/1000); tone.last=n; if(!tone.sweep) return;
  var f=tone.f*Math.pow(2,tone.sweep*dt/8); if(f>1600){f=1600;tone.sweep=-1;} if(f<60){f=60;tone.sweep=1;}
  setTone(f,true); cym.f=f;
}

/* ─────────── LISTEN — the microphone drives the plate ───────────
   Nothing is recorded or sent: the sound is analysed in the page and discarded. The strongest partials of what the
   room hears each excite their own plate modes, so a voice, a bowl or a clap all draw different figures. */
var mic={on:false,stream:null,src:null,an:null,tbuf:null,fbuf:null,dec:null,f:0,lvl:0,comps:null,last:0,hold:0};
function micMsg(m){$('#micMsg').textContent=m;}
function micToggle(){
  ensure(); if(mic.on){micStop();return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){micMsg('This browser cannot open the microphone.');return;}
  micMsg('Waiting for permission…');
  try{ if(navigator.audioSession) navigator.audioSession.type='play-and-record'; }catch(e){}
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
    mic.stream=st; mic.src=ac.createMediaStreamSource(st); mic.an=ac.createAnalyser(); mic.an.fftSize=4096; mic.an.smoothingTimeConstant=.55;
    mic.src.connect(mic.an);                       // analysed only — never sent to the speakers
    mic.tbuf=new Float32Array(mic.an.fftSize); mic.fbuf=new Float32Array(mic.an.frequencyBinCount); mic.dec=new Float32Array(1024);
    mic.on=true; mic.comps=null; $('#micBtn').classList.add('on'); $('#micLbl').textContent='Listening';
    micMsg('Hum, sing, clap or play something — the sand follows. Nothing is recorded.'); liveDots();
  }).catch(function(err){
    try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
    micMsg(err&&(err.name==='NotAllowedError'||err.name==='SecurityError')?'The microphone is blocked. Allow it for this site in your browser settings, then tap again.':
      err&&err.name==='NotFoundError'?'No microphone was found on this device.':'The microphone could not be opened. Please try again.');
  });
}
function micStop(){
  if(mic.stream) mic.stream.getTracks().forEach(function(t){t.stop()}); try{mic.src.disconnect()}catch(e){}
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  mic.on=false; mic.stream=mic.src=mic.an=null; $('#micBtn').classList.remove('on'); $('#micLbl').textContent='Listen';
  $('#micHz').textContent='—'; $('#micNote').textContent='Tap to begin'; $('#micLvl').style.width='0'; $('#micNeedle').style.left='50%'; $('#tuner').classList.remove('ok');
  micMsg('Tap the circle and allow the microphone. Sound never leaves your device.'); liveDots();
}
function pitchOf(buf,sr){ // autocorrelation — the first strong repeat is the fundamental
  var n=buf.length,r0=0,i,L,minL=Math.max(2,Math.floor(sr/1100)),maxL=Math.min((n>>1)-2,Math.floor(sr/55));
  for(i=0;i<n;i++)r0+=buf[i]*buf[i]; if(r0<1e-7) return 0;
  var c=new Float32Array(maxL+2),best=-1,bv=0;
  for(L=minL-1;L<=maxL+1;L++){var s=0,m=n-L;for(i=0;i<m;i++)s+=buf[i]*buf[i+L];c[L]=s/r0*n/m;}
  for(L=minL;L<=maxL;L++){ if(c[L]>.8&&c[L]>=c[L-1]&&c[L]>c[L+1]){best=L;break;} }
  if(best<0){ for(L=minL;L<=maxL;L++) if(c[L]>bv&&c[L]>=c[L-1]&&c[L]>c[L+1]){bv=c[L];best=L;} if(bv<.55) return 0; }
  var a=c[best-1],b=c[best],d=c[best+1],den=a-2*b+d;
  return sr/(best+(den?(.5*(a-d)/den):0));
}
function micTick(ts){
  if(ts-mic.last<60) return mic.comps; mic.last=ts;
  var an_=mic.an,tb=mic.tbuf,fb=mic.fbuf,i,s=0,sr=ac.sampleRate;
  an_.getFloatTimeDomainData(tb); for(i=0;i<tb.length;i+=2)s+=tb[i]*tb[i];
  var rms=Math.sqrt(s/(tb.length/2)); mic.lvl+=(Math.min(1,rms*9)-mic.lvl)*.4;
  $('#micLvl').style.width=Math.round(mic.lvl*100)+'%';
  if(rms<.006){ mic.hold++; if(mic.hold>6){$('#micNote').textContent='Listening…';$('#tuner').classList.remove('ok');} return mic.comps; }   // quiet: the figure rests
  mic.hold=0;
  an_.getFloatFrequencyData(fb);
  var bin=sr/an_.fftSize,lo=Math.ceil(45/bin),hi=Math.min(fb.length-2,Math.floor(2400/bin)),mx=-200,peaks=[];
  for(i=lo;i<=hi;i++) if(fb[i]>mx) mx=fb[i];
  for(i=lo;i<=hi;i++) if(fb[i]>mx-22&&fb[i]>fb[i-1]&&fb[i]>=fb[i+1]){
    var a=fb[i-1],b=fb[i],d=fb[i+1],den=a-2*b+d; peaks.push([(i+(den?.5*(a-d)/den:0))*bin,Math.pow(10,(b-mx)/20)]); }
  peaks.sort(function(x,y){return y[1]-x[1]}); peaks=peaks.slice(0,4);
  for(i=0;i<1024;i++)mic.dec[i]=(tb[i*2]+tb[i*2+1])*.5;
  var f=pitchOf(mic.dec,sr/2);
  if(f>0){ mic.f=mic.f&&Math.abs(Math.log2(f/mic.f))<.03?mic.f+(f-mic.f)*.5:f;
    // the sung fundamental leads the figure; its partials colour it
    var out=[[mic.f,1]]; peaks.forEach(function(p){ if(Math.abs(Math.log2(p[0]/mic.f))>.06&&p[1]>.25) out.push([p[0],p[1]*.5]); });
    mic.comps=out.slice(0,4);
    var sw=swaraOf(mic.f),ok=Math.abs(sw.cents)<=12&&scale().indexOf(SW.indexOf(sw.name))>=0;
    $('#micHz').textContent=mic.f.toFixed(1)+' Hz';
    $('#micNote').textContent=sw.name+' '+(sw.cents>0?'+':'')+sw.cents+'¢ · '+westOf(mic.f)+(ok?' · in tune with '+RAGAS[S.raga].n:'');
    $('#micNeedle').style.left=(50+Math.max(-50,Math.min(50,sw.cents)))+'%'; $('#tuner').classList.toggle('ok',ok);
    if(ok) pres.flash=Math.max(pres.flash,.7);
    cym.f=mic.f;
  }else if(peaks.length){ mic.comps=peaks; cym.f=peaks[0][0]; $('#micHz').textContent=Math.round(peaks[0][0])+' Hz'; $('#micNote').textContent='Texture — no single pitch'; $('#tuner').classList.remove('ok'); }
  cym.amp=Math.max(cym.amp,Math.min(1,.25+mic.lvl));
  return mic.comps;
}

/* ─────────── THE EMBER — a presence that listens ───────────
   One small light lives above the plate. It breathes, lights the sand beneath it, follows your hand, brightens when
   you are in tune — and when you play a phrase and pause, it plays it back an octave higher and comes home to Sa. */
var pres={x:.3,y:.2,z:.42,glow:.4,flash:0,tx:0,ty:0,follow:0,phrase:[],timer:0,busy:false,out:null};
function presTick(t,ts){
  var tx,ty;
  if(ts-pres.follow<3500){tx=pres.tx;ty=pres.ty;}else{tx=.58*Math.cos(t*.23);ty=.58*Math.sin(t*.31+1);}
  pres.x+=(tx-pres.x)*.06; pres.y+=(ty-pres.y)*.06;
  var br=.5+.5*Math.sin(t*TAU/om.breath-Math.PI/2);            // one swell per breath
  pres.z=.36+.07*br+pres.flash*.05; pres.flash*=.94;
  pres.glow+=((.3+.3*br+energy*.9+pres.flash)-pres.glow)*.2;
}
function presOut(){ if(pres.out) return pres.out;
  var g=ac.createGain(),d=ac.createDelay(1),fb=ac.createGain(); d.delayTime.value=.31; fb.gain.value=.36;
  g.connect(master); g.connect(d); d.connect(fb); fb.connect(d); d.connect(master); return pres.out=g; } // straight to the speakers, so loops never capture it
function bell(f,at){
  [[1,.13,1.9],[2.01,.045,1.1],[3.02,.015,.6]].forEach(function(p){var o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f*p[0];
    env(g,at,.012,p[1],p[2]);o.connect(g);g.connect(presOut());o.start(at);o.stop(at+p[2]+.1);});
}
function heard(f){ // something the visitor played
  if(!vis.pres||pres.busy||!started) return;
  pres.flash=Math.max(pres.flash,.5); pres.phrase.push([f,performance.now()]); if(pres.phrase.length>8) pres.phrase.shift();
  clearTimeout(pres.timer); pres.timer=setTimeout(answer,1600);
}
function answer(){
  var ph=pres.phrase; pres.phrase=[];
  if(ph.length<2||loop.rec||!vis.pres||!ac) return;
  pres.busy=true; var at=0,t=now()+.08,seq=[];
  ph.forEach(function(n,i){ if(i) at+=Math.max(.16,Math.min(.6,(n[1]-ph[i-1][1])/1000)); seq.push([n[0]*2,at]); });
  var last=seq[seq.length-1][0], home=Sa()*Math.pow(2,Math.round(Math.log2(last/Sa())));
  if(Math.abs(1200*Math.log2(last/home))>30) seq.push([home,at+=.5]);                                  // come home to Sa
  seq.forEach(function(n){ bell(n[0],t+n[1]); setTimeout(function(){pres.flash=1;pulse(n[0],.55);},n[1]*1000+80); });
  setTimeout(function(){pres.busy=false},(at+.9)*1000);
  if(!store('answered')){store('answered','1');toast('✦ The ember answers — play, pause, and listen');}
}
function strike(x,y){ // a tap on the plate
  ensure(); kicks.push({x:x,y:y,t:performance.now()}); if(kicks.length>4) kicks.shift();
  pres.tx=x; pres.ty=y; pres.follow=performance.now(); pres.flash=1;
  var f=cym.f; while(f<180)f*=2; while(f>900)f/=2;
  var t=now(); [[1,.3,1.2],[2.76,.07,.35],[5.4,.03,.15]].forEach(function(p){var o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f*p[0];
    env(g,t,.003,p[1],p[2]);o.connect(g);g.connect(bus);o.start(t);o.stop(t+p[2]+.1);});
  cym.amp=Math.max(cym.amp,.9);
}
(function(){ // drag to turn the plate · tap to strike it · the ember follows a hovering hand
  var ptr=null;
  function onPlate(e){var q=unproj(e.clientX,e.clientY);return q&&Math.abs(q[0])<=1&&Math.abs(q[1])<=1?q:null;}
  cv.addEventListener('pointerdown',function(e){ptr={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:cam.yawT,tilt:cam.tiltT,moved:false};
    try{cv.setPointerCapture(e.pointerId)}catch(err){}});
  cv.addEventListener('pointermove',function(e){
    if(ptr&&ptr.id===e.pointerId){var dx=e.clientX-ptr.x,dy=e.clientY-ptr.y; if(Math.abs(dx)+Math.abs(dy)>7) ptr.moved=true;
      if(ptr.moved){cam.yawT=ptr.yaw+dx*.008;cam.tiltT=Math.max(.15,Math.min(1.28,ptr.tilt-dy*.006));cam.hold=performance.now();}}
    else if(e.pointerType==='mouse'){var q=onPlate(e); if(q){pres.tx=q[0];pres.ty=q[1];pres.follow=performance.now();}}
  });
  function up(e){ if(!ptr||ptr.id!==e.pointerId) return; var q=!ptr.moved&&started&&vis.cym?onPlate(e):null; ptr=null; if(q) strike(q[0],q[1]); }
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',function(){ptr=null});
})();

/* ─────────── LOOP & RECORD ───────────
   Session: records everything you hear, then saves it to the phone as a WAV.
   Looper: the first layer sets the loop length; every next layer is one loop long and lines up with it.
   Files are named "Haren's Ether vibration …". */
var TAPSIZE=2048;
function makeTap(node){
  var t={on:false,L:[],R:[],t0:0,n:0}, sp=ac.createScriptProcessor(TAPSIZE,2,2), sink=ac.createGain(); sink.gain.value=0;
  sp.onaudioprocess=function(e){
    if(!t.on) return;
    var ib=e.inputBuffer, l=ib.getChannelData(0), r=ib.numberOfChannels>1?ib.getChannelData(1):l;
    if(!t.n) t.t0=e.playbackTime-TAPSIZE/ac.sampleRate; // input block was rendered one block before it plays
    t.L.push(new Float32Array(l)); t.R.push(new Float32Array(r)); t.n+=l.length;
    if(t.onblock) t.onblock();
  };
  node.connect(sp); sp.connect(sink); sink.connect(ac.destination); return t;
}
function tapStart(t){t.L=[];t.R=[];t.n=0;t.on=true;}
function tapStop(t){t.on=false;var L=new Float32Array(t.n),R=new Float32Array(t.n),o=0;
  for(var i=0;i<t.L.length;i++){L.set(t.L[i],o);R.set(t.R[i],o);o+=t.L[i].length;} t.L=[];t.R=[];return {L:L,R:R,t0:t.t0};}

function wav(L,R,sr){ // 16-bit stereo PCM — plays everywhere, saves to Files/Downloads
  var n=L.length, buf=new ArrayBuffer(44+n*4), v=new DataView(buf), p=0;
  function s(x){for(var i=0;i<x.length;i++)v.setUint8(p++,x.charCodeAt(i))} function u32(x){v.setUint32(p,x,true);p+=4} function u16(x){v.setUint16(p,x,true);p+=2}
  s('RIFF');u32(36+n*4);s('WAVE');s('fmt ');u32(16);u16(1);u16(2);u32(sr);u32(sr*4);u16(4);u16(16);s('data');u32(n*4);
  var peak=0;for(var i=0;i<n;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
  var g=peak>0?Math.min(4,.89/peak):1; // gentle normalise so quiet takes are audible on a phone
  for(i=0;i<n;i++){v.setInt16(p,Math.max(-1,Math.min(1,L[i]*g))*32767,true);p+=2;v.setInt16(p,Math.max(-1,Math.min(1,R[i]*g))*32767,true);p+=2;}
  return new Blob([buf],{type:'audio/wav'});
}
var saveCount=+(store('saves')||0);
function saveFile(blob,kind){
  saveCount++; store('saves',saveCount);
  var d=new Date(), pad=function(x){return String(x).padStart(2,'0')};
  var name="Haren's Ether vibration "+pad(saveCount)+' — '+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+pad(d.getMinutes())+'.wav';
  var url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},60000);
  var row=document.createElement('div'); row.className='saved';
  row.innerHTML='<span>'+name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span><small>'+kind+' · '+(blob.size/1e6).toFixed(1)+' MB</small>';
  var sv=$('#saves'); sv.insertBefore(row,sv.firstChild); toast('Saved · '+name);
}
var toastT;
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on')},2800);}
function fmt(s){s=Math.max(0,s);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}

/* session recording */
var sess={on:false,timer:null,max:600};
function sessToggle(){
  ensure();
  if(!sess.on){ tapStart(tapMix); sess.on=true; $('#recBtn').classList.add('on'); $('#recLbl').textContent='Stop & save';
    var st=performance.now(); sess.timer=setInterval(function(){var s=(performance.now()-st)/1000;$('#recTime').textContent=fmt(s);if(s>sess.max)sessToggle();},250);
  }else{ clearInterval(sess.timer); sess.on=false; $('#recBtn').classList.remove('on'); $('#recLbl').textContent='Record';
    var r=tapStop(tapMix); $('#recTime').textContent='0:00';
    if(r.L.length<ac.sampleRate*.5){toast('Too short to save — play a little longer');}
    else saveFile(wav(r.L,r.R,ac.sampleRate),'Session');
  }
  liveDots();
}

/* looper */
var loop={len:0,start:0,layers:[],rec:false,stopT:null,raf:0};
function loopRec(){
  ensure();
  if(loop.rec){ loopStopRec(); return; }
  if(loop.layers.length>=6){toast('Six layers is the limit — clear or undo one');return;}
  loop.rec=true; tapStart(tapInst); $('#layBtn').classList.add('on');
  $('#layLbl').textContent=loop.layers.length?'Recording layer '+(loop.layers.length+1)+'…':'Recording — tap to close the loop';
  if(loop.len){ // overdub: exactly one loop long
    loop.stopT=setTimeout(loopStopRec,loop.len*1000+TAPSIZE/ac.sampleRate*1000*2+60);
  }else loop.stopT=setTimeout(loopStopRec,30000);
  liveDots();
}
function loopStopRec(){
  if(!loop.rec) return; clearTimeout(loop.stopT); loop.rec=false; $('#layBtn').classList.remove('on');
  var r=tapStop(tapInst), sr=ac.sampleRate;
  if(!loop.len){
    if(r.L.length<sr*.6){toast('Loop too short — hold it a little longer');$('#layLbl').textContent='Record first layer';liveDots();return;}
    loop.len=r.L.length/sr; loop.start=r.t0;
    addLayer(r.L,r.R);
  }else{
    var N=Math.round(loop.len*sr), L=new Float32Array(N), R=new Float32Array(N);
    var off=Math.round((((r.t0-loop.start)%loop.len)+loop.len)%loop.len*sr), m=Math.min(N,r.L.length);
    for(var k=0;k<m;k++){var j=(off+k)%N;L[j]=r.L[k];R[j]=r.R[k];}
    addLayer(L,R);
  }
  $('#layLbl').textContent='Add a layer'; liveDots();
}
function addLayer(L,R){
  var sr=ac.sampleRate, N=L.length, b=ac.createBuffer(2,N,sr), f=Math.min(256,N>>3);
  for(var i=0;i<f;i++){var g=i/f;L[i]*=g;R[i]*=g;L[N-1-i]*=g;R[N-1-i]*=g;} // soft seams
  b.copyToChannel(L,0); b.copyToChannel(R,1);
  var g=ac.createGain(), s=ac.createBufferSource(); s.buffer=b; s.loop=true; s.connect(g); g.connect(loopBus);
  var t=ac.currentTime+.02; s.start(t, ((t-loop.start)%loop.len+loop.len)%loop.len);
  loop.layers.push({src:s,gain:g,L:L,R:R,muted:false}); drawLayers();
}
function drawLayers(){
  var box=$('#loopLayers'); box.innerHTML='';
  loop.layers.forEach(function(ly,i){var b=document.createElement('button');b.className='lay'+(ly.muted?' muted':'');
    b.innerHTML='<i></i>Layer '+(i+1);b.onclick=function(){ly.muted=!ly.muted;ly.gain.gain.setTargetAtTime(ly.muted?0:1,ac.currentTime,.02);b.classList.toggle('muted',ly.muted);};
    box.appendChild(b);});
  $('#loopLen').textContent=loop.len?loop.len.toFixed(1)+' s loop':'';
  $('#undoBtn').disabled=$('#clearBtn').disabled=$('#saveLoopBtn').disabled=!loop.layers.length;
  if(loop.layers.length&&!loop.raf) loopTick();
}
function loopTick(){ // playhead ring
  if(!loop.layers.length){loop.raf=0;$('#loopRing').style.setProperty('--p',0);return;}
  var p=((ac.currentTime-loop.start)%loop.len+loop.len)%loop.len/loop.len;
  $('#loopRing').style.setProperty('--p',p); if(p<.04){cym.amp=Math.max(cym.amp,.5);}
  loop.raf=requestAnimationFrame(loopTick);
}
function loopUndo(){var ly=loop.layers.pop();if(ly){ly.src.stop();ly.gain.disconnect();}if(!loop.layers.length)loop.len=0;drawLayers();$('#layLbl').textContent=loop.len?'Add a layer':'Record first layer';}
function loopClear(){while(loop.layers.length)loopUndo();}
function loopSave(){
  if(!loop.layers.length) return;
  var sr=ac.sampleRate, N=loop.layers[0].L.length, reps=Math.max(2,Math.min(8,Math.ceil(24/loop.len))), T=N*reps;
  var L=new Float32Array(T),R=new Float32Array(T);
  loop.layers.forEach(function(ly){ if(ly.muted) return;
    for(var r=0;r<reps;r++){var o=r*N;for(var i=0;i<N;i++){L[o+i]+=ly.L[i];R[o+i]+=ly.R[i];}} });
  var fo=Math.min(T,Math.round(sr*1.2)); for(var i=0;i<fo;i++){var g=i/fo;L[T-1-i]*=g;R[T-1-i]*=g;} // fade out
  saveFile(wav(L,R,sr),'Loop × '+reps);
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
    b.addEventListener('pointerdown',function(e){e.preventDefault();ensure();handpan(nt.f,1);heard(nt.f);hit(b);});
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
    var a=at(e);padOn(e.pointerId,a.nt.f,a.bright);heard(a.nt.f);var d=document.createElement('div');d.className='dot';xy.appendChild(d);dots[e.pointerId]=d;
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
    b.addEventListener('pointerdown',function(e){e.preventDefault();ensure();handpan(nt.f,.9);heard(nt.f);hit(b);});sw.appendChild(b);});
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
function buildTones(){
  var box=$('#toneFreqs');
  var sa=document.createElement('button'); sa.innerHTML='<b>Sa</b><small>Your tonic</small>'; sa.onclick=function(){ensure();setTone(Sa()*2);if(!tone.on)toneToggle();}; box.appendChild(sa);
  TONES.forEach(function(p){var b=document.createElement('button');b.setAttribute('data-f',p[1]);b.innerHTML='<b>'+p[0]+' Hz</b><small>'+p[2]+'</small>';
    b.onclick=function(){ensure();tone.sweep=0;setTone(p[1]);if(!tone.on)toneToggle();else toneUI();};box.appendChild(b);});
  var bb=$('#beats');
  BEATS.forEach(function(p,i){var b=document.createElement('button');b.textContent=p[0];if(!i)b.className='on';
    b.onclick=function(){ensure();tone.beat=p[1];$$('#beats button').forEach(function(x){x.classList.toggle('on',x===b)});
      if(tone.on){toneStop();toneStart();toneUI();} if(p[1])toast('Each ear hears its own tone — use headphones');};bb.appendChild(b);});
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
  $('.dock [data-p=loop]').classList.toggle('live',sess.on||loop.rec||loop.layers.length>0);
  $('.dock [data-p=tone]').classList.toggle('live',tone.on);
  $('.dock [data-p=mic]').classList.toggle('live',mic.on);
}
$$('.dock button').forEach(function(b){b.addEventListener('click',function(){ensure();openPanel(b.getAttribute('data-p'))})});
$$('#layers button').forEach(function(b){var l=b.getAttribute('data-l');b.classList.toggle('on',!!vis[l]);
  b.addEventListener('click',function(){vis[l]=!vis[l];b.classList.toggle('on',vis[l]);
    if(l==='pres'){store('pres',vis.pres?'1':'0');toast(vis.pres?'\u2726 The ember is listening':'The ember rests');}})});
$('#saChip').addEventListener('click',function(){ensure();openPanel('raga')});
$('#enter').addEventListener('click',function(){
  ensure(); $('#gate').classList.add('gone'); started=true; t0=performance.now();
  handpan(fq(0,0),.8); setTimeout(function(){handpan(fq(7,0),.6)},420); setTimeout(function(){handpan(fq(0,1),.5)},840);
  openPanel('handpan');
  if(!store('hint')){store('hint','1');setTimeout(function(){toast('Drag to turn the plate \u00B7 tap it to strike');},2600);}
});
$('#toneBtn').addEventListener('click',toneToggle);
$('#toneF').addEventListener('input',function(e){tone.sweep=0;setTone(Math.round(20*Math.pow(100,e.target.value/1000)*10)/10);toneUI();});
$('#toneDn').addEventListener('click',function(){tone.sweep=0;setTone(Math.round(tone.f)-1);toneUI();});
$('#toneUp').addEventListener('click',function(){tone.sweep=0;setTone(Math.round(tone.f)+1);toneUI();});
$('#toneSweep').addEventListener('click',function(){ensure();tone.sweep=tone.sweep?0:1;tone.last=performance.now();if(tone.sweep&&!tone.on)toneToggle();else toneUI();});
$('#micBtn').addEventListener('click',micToggle);
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
$('#recBtn').addEventListener('click',sessToggle);
$('#layBtn').addEventListener('click',loopRec);
$('#undoBtn').addEventListener('click',loopUndo);
$('#clearBtn').addEventListener('click',loopClear);
$('#saveLoopBtn').addEventListener('click',loopSave);

/* full-screen for every instrument */
var FS='<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>', FSX='<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
$$('.panel .ph').forEach(function(ph){var b=document.createElement('button');b.className='fs';b.setAttribute('aria-label','Full screen');b.innerHTML=FS;
  b.addEventListener('click',fsToggle);ph.appendChild(b);});
function fsToggle(){
  var on=!document.body.classList.contains('full'); document.body.classList.toggle('full',on);
  $$('.panel .fs').forEach(function(b){b.innerHTML=on?FSX:FS;b.setAttribute('aria-label',on?'Exit full screen':'Full screen')});
  var de=document.documentElement;
  try{ if(on&&de.requestFullscreen&&!document.fullscreenElement) de.requestFullscreen().catch(function(){});
       if(!on&&document.fullscreenElement) document.exitFullscreen().catch(function(){}); }catch(e){}
  setTimeout(function(){sizeInst();layoutView();},60); setTimeout(function(){sizeInst();layoutView();},560);
}
document.addEventListener('fullscreenchange',function(){ if(!document.fullscreenElement&&document.body.classList.contains('full')) fsToggle(); });

/* opening — sand settling into patterns */
(function gateCym(){
  var c=$('#gateCym'); if(!c) return; var g=c.getContext('2d'), d=Math.min(window.devicePixelRatio||1,2), S=200;
  function fit(){ S=c.clientWidth||200; c.width=c.height=Math.round(S*d); g.setTransform(d,0,0,d,0,0); }
  fit(); addEventListener('resize',fit);
  var P=[],M=[[3,1],[5,2],[4,1],[7,2],[6,1],[8,3],[5,4],[9,4]],k=0,last=0,amp=1;
  var NP=Math.round(Math.min(3200,Math.max(1500,S*7)));
  for(var i=0;i<NP;i++)P.push(rp());
  function tick(ts){
    if($('#gate').classList.contains('gone')) return;
    if(ts-last>2600){last=ts;k=(k+1)%M.length;amp=1;}
    amp*=.97; var n=M[k][0]*Math.PI,m=M[k][1]*Math.PI,st=.01+amp*.07,R=S/2-6;
    g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(0,0,S,S);
    g.fillStyle='rgba(239,180,120,.85)';
    for(var i=0;i<P.length;i++){var p=P[i],v=Math.cos(n*p.x)*Math.cos(m*p.y)-Math.cos(m*p.x)*Math.cos(n*p.y),q=Math.abs(v)*st;
      p.x+=(Math.random()-.5)*q;p.y+=(Math.random()-.5)*q;if(p.x*p.x+p.y*p.y>1){var r=rp();p.x=r.x;p.y=r.y;}
      g.fillRect(S/2+p.x*R,S/2+p.y*R,S>300?1.5:1.2,S>300?1.5:1.2);}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
document.addEventListener('visibilitychange',function(){if(document.hidden&&ac&&!om.on&&!tan.on&&!tone.on&&!mic.on)ac.suspend();else if(!document.hidden&&ac)ac.resume();});
addEventListener('resize',function(){resize();sizeInst();});

buildFreqs(); buildTones(); refreshScale(); bindPad(); bindDjembe(); setOm(136.1); setTone(tone.f,true); cym.f=136.1; cym.amp=0;
resize(); initGL(); buildField([[cym.f,1]]); requestAnimationFrame(frame);
})();

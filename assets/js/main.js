/* Haren Poovaiah — The Architect · main script */
/* ═════ VIDEOS ═════
   Swap these URLs for your own footage. Leave blank ('') to use the animated fallback. */
var HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4';
var DOOR_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4';
function setVid(id,url){
  var v=document.getElementById(id); if(!v) return;
  if(!url){ v.style.display='none'; return; }
  v.src=url; v.addEventListener('error',function(){v.style.display='none'});
  var p=v.play(); if(p&&p.catch) p.catch(function(){});
}
setVid('heroVid',HERO_VIDEO); setVid('doorVid',DOOR_VIDEO);

/* ═════ VISUAL DIRECTION — gallery ═════
   The list of frames lives in assets/js/visual-assets.js (generated from visual/manifest.json).
   Frames without a src show as styled "In curation" placeholders. */
var VISUAL_ASSETS = window.VISUAL_ASSETS || [];
var KIND={photo:'Photography',video:'Videography',direction:'Direction'};
var PAL={photo:'t-photo',video:'t-video',direction:'t-dir'};
function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function isVid(a){return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(a.src||'')}
var gFilter='all', lbIdx=-1;
(function buildGallery(){
  var g=document.getElementById('vgrid'); if(!g) return;
  var html='';
  VISUAL_ASSETS.forEach(function(a,i){
    var has=!!(a.src||a.cls), media, th=a.thumb||a.poster||a.src;
    if(a.cls) media='<div class="vf-m '+a.cls+'"></div>';
    else if(a.src && isVid(a)) media='<div class="vf-m">'+(a.poster?'<img src="'+esc(a.poster)+'" alt="" loading="lazy" decoding="async">':'')+
        '<video data-src="'+esc(a.preview||a.src)+'" muted loop playsinline preload="none"></video></div>';
    else if(a.src) media='<div class="vf-m"><img src="'+esc(th)+'" alt="'+esc(a.title)+'" loading="lazy" decoding="async"'+(a.focus?' style="object-position:'+esc(a.focus)+'"':'')+'></div>';
    else media='<div class="vf-m gen '+PAL[a.type]+'"></div>';
    html+='<figure class="vf st '+(a.size||'')+'" data-t="'+a.type+'" data-i="'+i+'"'+(a.src?' data-has="1"':'')+'>'+media+
      (!has?'<span class="vf-ph">In curation</span>':'')+
      (a.pages?'<span class="vf-pages">'+a.pages.length+' pages</span>':'')+(a.type==='video'||isVid(a)?'<span class="vf-play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></span>':'')+
      '<figcaption class="vf-cap"><span><span class="vf-t">'+esc(a.title)+'</span><span class="vf-mt">'+esc(a.meta)+'</span></span><span class="vf-k">'+KIND[a.type]+'</span></figcaption></figure>';
  });
  g.innerHTML=html;
  g.setAttribute('data-stagger','');
  document.querySelectorAll('#vfilter button').forEach(function(b){
    var f=b.getAttribute('data-f');
    var n=f==='all'?VISUAL_ASSETS.length:VISUAL_ASSETS.filter(function(a){return a.type===f}).length;
    b.innerHTML+='<sup>'+n+'</sup>';
    b.addEventListener('click',function(){
      gFilter=f;
      document.querySelectorAll('#vfilter button').forEach(function(x){x.classList.toggle('on',x===b)});
      g.querySelectorAll('.vf').forEach(function(el){
        el.classList.toggle('hide', f!=='all' && el.getAttribute('data-t')!==f);
      });
    });
  });
  // videos only load when hovered
  g.addEventListener('mouseover',function(e){
    var f=e.target.closest('.vf'); var v=f&&f.querySelector('video'); if(!v) return;
    if(!v.src) v.src=v.getAttribute('data-src');
    var p=v.play(); if(p&&p.catch) p.catch(function(){});
  });
  g.addEventListener('mouseout',function(e){var f=e.target.closest('.vf');if(f&&!f.contains(e.relatedTarget)){var v=f.querySelector('video');if(v)v.pause()}});
  g.addEventListener('click',function(e){
    var f=e.target.closest('.vf'); if(!f||!f.getAttribute('data-has')) return;
    lbOpen(+f.getAttribute('data-i'));
  });
})();
function lbList(){
  return VISUAL_ASSETS.map(function(a,i){return i}).filter(function(i){
    var a=VISUAL_ASSETS[i]; return a.src && (gFilter==='all'||a.type===gFilter);
  });
}
var lbPage=0;
function lbOpen(i,page){
  var a=VISUAL_ASSETS[i]; if(!a||!a.src) return; lbIdx=i;
  var n=a.pages?a.pages.length:0; lbPage=n?Math.max(0,Math.min(n-1,page||0)):0;
  var src=n?a.pages[lbPage]:a.src, m=document.getElementById('lbm');
  m.innerHTML = isVid(a) ? '<video src="'+esc(a.src)+'"'+(a.poster?' poster="'+esc(a.poster)+'"':'')+' controls autoplay playsinline></video>'
                         : '<img src="'+esc(src)+'" alt="'+esc(a.title)+'">';
  document.getElementById('lbc').innerHTML=esc(a.title)+'<span>'+esc(a.meta)+(n?' \u00b7 Page '+(lbPage+1)+' / '+n:'')+'</span>';
  if(n&&lbPage<n-1){var pre=new Image();pre.src=a.pages[lbPage+1];}
  var l=document.getElementById('lb'); l.classList.add('open');
  l.classList.toggle('multi', lbList().length>1||n>1);
}
function lbStep(d){
  var a=VISUAL_ASSETS[lbIdx], n=a&&a.pages?a.pages.length:0;
  if(n&&lbPage+d>=0&&lbPage+d<n){ lbOpen(lbIdx,lbPage+d); return; } // turn the page first
  var L=lbList(); if(L.length<2) return;
  var k=L.indexOf(lbIdx), j=L[(k+d+L.length)%L.length], b=VISUAL_ASSETS[j];
  lbOpen(j, d<0&&b.pages?b.pages.length-1:0);
}
function lbClose(){var l=document.getElementById('lb');l.classList.remove('open');document.getElementById('lbm').innerHTML='';lbIdx=-1;}
addEventListener('keydown',function(e){
  if(lbIdx<0) return;
  if(e.key==='ArrowRight') lbStep(1);
  if(e.key==='ArrowLeft') lbStep(-1);
});
(function(){ // swipe in lightbox
  var x0=null, l=document.getElementById('lb'); if(!l) return;
  l.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  l.addEventListener('touchend',function(e){ if(x0===null) return; var dx=e.changedTouches[0].clientX-x0; if(Math.abs(dx)>50) lbStep(dx<0?1:-1); x0=null; });
})();

/* ═════ CURSOR ═════ */
var cd=document.getElementById('cd'), cr=document.getElementById('cr');
var mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
addEventListener('mousemove',function(e){
  mx=e.clientX;my=e.clientY;
  cd.style.left=mx+'px';cd.style.top=my+'px';
},{passive:true});
(function loop(){rx+=(mx-rx)*.15;ry+=(my-ry)*.15;
  cr.style.left=rx+'px';cr.style.top=ry+'px';requestAnimationFrame(loop);})();
var HOV='a,button,.pcard,.chain b,.pill,.door,.vf';
document.addEventListener('mouseover',function(e){ if(e.target.closest&&e.target.closest(HOV)) cr.classList.add('hov'); });
document.addEventListener('mouseout',function(e){
  var from=e.target.closest&&e.target.closest(HOV), to=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest(HOV);
  if(from&&!to) cr.classList.remove('hov');
});

/* ═════ WORD PULL-UP ═════ */
function splitWords(el){
  var segs = el.querySelectorAll('[data-seg]');
  var html='';
  if(segs.length){
    segs.forEach(function(s){
      var cls = s.className||'';
      s.textContent.trim().split(/\s+/).forEach(function(w){
        html+='<span class="w '+cls+'"><span>'+w+'</span></span> ';
      });
    });
  } else {
    var star = el.querySelector('.hero-star');
    var starHTML = star ? star.outerHTML : '';
    var txt = el.textContent.replace('*','').trim();
    txt.split(/\s+/).forEach(function(w){
      html+='<span class="w"><span>'+w+'</span></span> ';
    });
    html += starHTML;
  }
  el.innerHTML=html;
  el.querySelectorAll('.w>span').forEach(function(s,i){ s.style.transitionDelay=(i*0.08)+'s'; });
}
document.querySelectorAll('[data-pu],[data-pu-multi],[data-vpu]').forEach(splitWords);
var puIO = new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('pulled'); puIO.unobserve(e.target);} });
},{threshold:.15});
document.querySelectorAll('[data-pu],[data-pu-multi]').forEach(function(el){puIO.observe(el)});

/* ═════ HERO FADES ═════ */
setTimeout(function(){
  document.querySelectorAll('[data-fade]').forEach(function(el){el.classList.add('in')});
},120);

/* ═════ SCROLL-LINKED CHARACTERS ═════ */
var charEls=[];
document.querySelectorAll('[data-chars]').forEach(function(el){
  var txt=el.textContent, html='';
  for(var i=0;i<txt.length;i++){
    var c=txt[i];
    html += (c===' ') ? ' ' : '<span>'+ (c==='<'?'&lt;':c==='&'?'&amp;':c) +'</span>';
  }
  el.innerHTML=html;
  charEls.push({el:el,spans:el.querySelectorAll('span')});
});
function updateChars(){
  charEls.forEach(function(o){
    var r=o.el.getBoundingClientRect(), vh=innerHeight;
    var start=vh*0.85, end=vh*0.25;
    var prog=(start-r.top)/(start-end+r.height*0.5);
    prog=Math.max(0,Math.min(1,prog));
    var n=o.spans.length;
    for(var i=0;i<n;i++){
      var cp=i/n, lo=cp-0.12, hi=cp+0.06;
      var v=Math.max(0,Math.min(1,(prog-lo)/(hi-lo)));
      o.spans[i].style.opacity=(0.18+v*0.82).toFixed(3);
    }
  });
}
addEventListener('scroll',updateChars,{passive:true});
addEventListener('resize',updateChars,{passive:true});
updateChars();

/* ═════ REVEALS ═════ */
var rvIO=new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){e.target.classList.add('in'); rvIO.unobserve(e.target);} });
},{threshold:.08,rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.rv').forEach(function(el){rvIO.observe(el)});

/* ═════ CARD STAGGER (Prisma) — scale .95→1, 0.15s apart ═════ */
var stIO=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){
      var kids=[].slice.call(e.target.querySelectorAll(':scope > .st'));
      var step=e.target.id==='vgrid'?0.07:0.15;
      kids.forEach(function(c,i){ c.style.transitionDelay=(i*step)+'s'; c.classList.add('in');
        setTimeout(function(){c.style.transitionDelay=''},(i*step+0.9)*1000); });
      stIO.unobserve(e.target);
    }
  });
},{threshold:.1,rootMargin:'0px 0px -60px 0px'});
document.querySelectorAll('[data-stagger]').forEach(function(el){stIO.observe(el)});

/* ═════ TOGGLES ═════ */
function accT(id,exclusive){
  var el=document.getElementById(id);
  var was=el.classList.contains('open');
  if(exclusive){
    el.parentElement.querySelectorAll('.acc,.prow,.exp').forEach(function(s){s.classList.remove('open')});
  }
  el.classList.toggle('open',!was);
  setTimeout(updateChars,60);
}
function pcT(el){
  var was=el.classList.contains('open');
  document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('open')});
  if(!was) el.classList.add('open');
}
function thmT(){
  var h=document.documentElement;
  var n=h.getAttribute('data-theme')==='light'?'dark':'light';
  h.setAttribute('data-theme',n);
  try{localStorage.setItem('hp-theme',n)}catch(e){}
  var m=document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', n==='light'?'#EFEBE0':'#000000');
}
(function(){try{var s=localStorage.getItem('hp-theme');if(s)document.documentElement.setAttribute('data-theme',s)}catch(e){}})();
function mobT(open){
  var m=document.getElementById('mob');
  m.classList.toggle('open',!!open);
  if(!current) document.body.style.overflow=open?'hidden':'';
}

/* ═════ ROUTER — three doors → sub-pages (#/work · #/hire · #/visual) ═════ */
var current=null;
function viewKey(){ var m=location.hash.match(/^#\/(work|hire|visual)\b/); return m?m[1]:null; }
function openView(k){
  var el=document.getElementById('v-'+k); if(!el) return;
  if(current && current!==k){ var old=document.getElementById('v-'+current); old.classList.remove('open','show'); }
  var fresh = current!==k;
  current=k;
  document.documentElement.classList.add('view-open');
  el.classList.add('show');
  if(fresh){ el.scrollTop=0; }
  var t=el.querySelector('[data-vpu]');
  if(t&&fresh){ t.classList.remove('pulled'); }
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    el.classList.add('open');
    if(t) setTimeout(function(){t.classList.add('pulled')},120);
  }); });
  document.title = {work:'The Work',hire:'Work With Me',visual:'Visual Direction'}[k]+' — Haren Poovaiah';
  el.querySelectorAll('video[data-hero]').forEach(function(v){ // hero films load only when their page opens
    if(!v.getAttribute('src')) v.src=v.getAttribute('data-src'); var p=v.play(); if(p&&p.catch) p.catch(function(){}); });
}
function closeViews(){
  if(!current) return;
  var el=document.getElementById('v-'+current);
  el.classList.remove('open');
  setTimeout(function(){ if(!el.classList.contains('open')) el.classList.remove('show'); },550);
  el.querySelectorAll('video[data-hero]').forEach(function(v){v.pause()});
  current=null;
  document.documentElement.classList.remove('view-open');
  document.title='Haren Poovaiah — The Architect';
}
function route(){ var k=viewKey(); if(k) openView(k); else closeViews(); }
addEventListener('hashchange',route);
route();
addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  if(lbIdx>=0){ lbClose(); return; }
  if(current){ goLanding('#paths'); }
});
function goLanding(sel){
  history.pushState(null,'',location.pathname+location.search);
  closeViews();
  var t=document.querySelector(sel);
  if(t) setTimeout(function(){ t.scrollIntoView({block:'start'}); },20);
}

/* ═════ SMOOTH SCROLL (in-page anchors only; '#/…' routes go to the router) ═════ */
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return;
  var href=a.getAttribute('href');
  if(href.indexOf('#/')===0) return;
  var t; try{ t=document.querySelector(href); }catch(err){ return; }
  if(!t) return;
  e.preventDefault();
  var inView = t.closest('.view');
  if(inView){ t.scrollIntoView({behavior:'smooth'}); return; }
  if(current){ goLanding(href); return; }
  t.scrollIntoView({behavior:'smooth'});
});

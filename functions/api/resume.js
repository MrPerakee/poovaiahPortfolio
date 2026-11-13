/* Résumé gate — Cloudflare Pages Function.
   POST /api/resume  {name,email,company,reason,file}  → saves the lead to Google Sheets, returns a short-lived download link
   GET  /api/resume?f=<file>&e=<expiry>&s=<signature>  → streams the PDF if the link is valid
   Settings (Cloudflare → Pages project → Settings → Variables and Secrets):
     SHEET_WEBHOOK  the Google Apps Script web-app URL (keep it secret)
     RESUME_SECRET  optional; any long random text used to sign links (falls back to SHEET_WEBHOOK) */

const FILES = {
  classic: { path: '/resume/Haren_Poovaiah_Resume.pdf',         name: 'Haren_Poovaiah_Resume.pdf' },
  brand:   { path: '/resume/Haren_Poovaiah_Resume_Brand.pdf',   name: 'Haren_Poovaiah_Resume_Brand.pdf' },
  venture: { path: '/resume/Haren_Poovaiah_Resume_Venture.pdf', name: 'Haren_Poovaiah_Resume_Venture.pdf' },
};
const LINK_MINUTES = 10;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function sign(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  if (d.website) return json({ ok: true, url: '/' });                     // honeypot: bots fill hidden fields
  const name = clean(d.name, 120), email = clean(d.email, 160).toLowerCase();
  const company = clean(d.company, 160), reason = clean(d.reason, 400);
  const fileKey = FILES[d.file] ? d.file : 'classic';
  if (name.length < 2) return json({ ok: false, error: 'Please add your name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'Please add a valid email.' }, 400);

  const secret = env.RESUME_SECRET || env.SHEET_WEBHOOK || '';
  if (env.SHEET_WEBHOOK) {
    const row = {
      time: new Date().toISOString(), name, email, company, reason, resume: fileKey,
      country: (request.cf && request.cf.country) || '', city: (request.cf && request.cf.city) || '',
      page: clean(d.page, 200), referrer: clean(d.referrer, 300),
      device: /Mobi|Android|iPhone/i.test(request.headers.get('user-agent') || '') ? 'Phone' : 'Desktop',
    };
    try {
      const r = await fetch(env.SHEET_WEBHOOK, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(row), redirect: 'follow' });
      if (!r.ok) console.log('sheet webhook status', r.status);
    } catch (e) { console.log('sheet webhook failed', e.message); }
  } else {
    console.log('SHEET_WEBHOOK not set — lead not saved', email);
  }

  const exp = Math.floor(Date.now() / 1000) + LINK_MINUTES * 60;
  const s = await sign(secret || 'unset', `${fileKey}.${exp}`);
  return json({ ok: true, url: `/api/resume?f=${fileKey}&e=${exp}&s=${s}` });
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const f = u.searchParams.get('f'), e = Number(u.searchParams.get('e')), s = u.searchParams.get('s') || '';
  const secret = env.RESUME_SECRET || env.SHEET_WEBHOOK || 'unset';
  const file = FILES[f];
  if (!file || !e || e < Date.now() / 1000 || s !== (await sign(secret, `${f}.${e}`))) {
    return Response.redirect(new URL('/?resume=1', u.origin).toString(), 302);  // expired or forged → back to the form
  }
  const pdf = await env.ASSETS.fetch(new URL(file.path, u.origin));
  return new Response(pdf.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${file.name}"`,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
    },
  });
}

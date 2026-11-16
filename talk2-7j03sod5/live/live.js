/* Live question board: reads the questions of one session from Supabase (Realtime +
   a slow safety poll) and draws them by category. Needs live/config.js and
   live/vendor/supabase-2.118.0.js loaded first.

   LiveQ.start()              connect (call when a live slide first shows)
   LiveQ.mountBoard(el)       draw the category board into el
   LiveQ.mountCounter(el)     draw "N questions · M people" into el
   LiveQ.qr(el, size)         draw the QR code for the phone form into el            */
(function () {
  const C = window.LIVEQ;
  const S = C.session();
  const CATS = C.cats, OTHER = C.other;
  const ALL = [...CATS, OTHER];
  const COLS = 'id,participant,body,created_at,status,category,category_conf,open_q,depth,on_topic,flagged,lang,en,ja,engine';

  const rows = new Map();
  const views = [];
  let client = null, started = false, status = 'idle', pollTimer = null, raf = 0;

  /* ---------- icons (added once, if the page lacks them) ---------- */
  const ICONS = {
    'i-target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'i-users': '<circle cx="9" cy="7" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-5-6.7"/>',
    'i-layers': '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    'i-eye': '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'i-network': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    'i-shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    'i-calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    'i-tool': '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    'i-help': '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>'
  };
  function ensureIcons() {
    const missing = Object.keys(ICONS).filter(id => !document.getElementById(id));
    if (!missing.length) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
    svg.innerHTML = missing.map(id => `<symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</symbol>`).join('');
    document.body.prepend(svg);
  }
  const icon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${id}"/></svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- data ---------- */
  function setStatus(s) { status = s; schedule(); }
  async function fetchAll() {
    if (!client) return;
    const { data, error } = await client.from('questions').select(COLS).eq('session', S).order('created_at', { ascending: true }).limit(2000);
    if (error) { setStatus(status === 'live' ? 'live' : 'error'); return; }
    const seen = new Set();
    for (const r of data) { seen.add(r.id); rows.set(r.id, { ...rows.get(r.id), ...r }); }
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id);
    if (status !== 'live') setStatus('polling');
    schedule();
  }
  function start() {
    if (started) return;
    started = true;
    ensureIcons();
    if (!window.supabase || !window.supabase.createClient) { setStatus('error'); return; }
    client = window.supabase.createClient(C.url, C.anon, { auth: { persistSession: false, autoRefreshToken: false } });
    fetchAll();
    client.channel('liveq-' + S)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: 'session=eq.' + S }, p => {
        if (p.eventType === 'DELETE') { if (p.old && p.old.id) rows.delete(p.old.id); }
        else if (p.new && p.new.id) rows.set(p.new.id, { ...rows.get(p.new.id), ...p.new });
        schedule();
      })
      .subscribe(st => {
        if (st === 'SUBSCRIBED') { setStatus('live'); fetchAll(); }
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') setStatus('polling');
      });
    pollTimer = setInterval(fetchAll, 8000);
  }
  async function retry() {
    try {
      await fetch(C.fn, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + C.anon, 'apikey': C.anon }, body: JSON.stringify({ action: 'retry', session: S }) });
    } catch (e) {}
    setTimeout(fetchAll, 2500);
  }

  function stats() {
    const all = [...rows.values()];
    const shown = all.filter(r => !r.flagged);
    const done = shown.filter(r => r.status === 'done');
    const people = new Set(all.map(r => r.participant)).size;
    const withOpen = shown.filter(r => r.open_q != null), withDepth = shown.filter(r => r.depth != null);
    const open = withOpen.filter(r => r.open_q >= 0.5).length;
    const deep = withDepth.filter(r => r.depth >= 1.8).length;
    const covered = CATS.filter(c => shown.some(r => r.category === c.key)).length;
    const backup = shown.some(r => r.engine && !String(r.engine).startsWith('gemini'));
    return { total: all.length, shown: shown.length, hidden: all.length - shown.length, people, done: done.length, open, deep, nOpen: withOpen.length, nDepth: withDepth.length, covered, backup, pending: shown.filter(r => !r.category).length };
  }

  /* ---------- drawing ---------- */
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; views.forEach(v => v()); }); }

  function qNode(r) {
    const d = document.createElement('div');
    d.className = 'lq-q';
    d.dataset.id = r.id;
    fillQ(d, r);
    return d;
  }
  function fillQ(d, r) {
    const key = [r.body, r.en, r.ja, r.lang, r.open_q, r.depth].join('|');
    if (d._k === key) return;
    d._k = key;
    const showEn = r.en && r.lang && r.lang !== 'en' && r.en.trim() !== r.body.trim();
    const tags = [];
    if ((r.open_q ?? 0) >= 0.5) tags.push('<i class="open">Open</i>');
    if ((r.depth ?? 0) >= 1.8) tags.push('<i class="deep">Deep</i>');
    d.innerHTML = `<p class="t">${esc(r.body)}</p>${showEn ? `<p class="en">${esc(r.en)}</p>` : ''}${r.ja ? `<p class="ja">${esc(r.ja)}</p>` : ''}${tags.length ? `<div class="lq-tags">${tags.join('')}</div>` : ''}`;
  }

  function mountBoard(el) {
    ensureIcons();
    el.classList.add('lq');
    el.innerHTML = `
      <div class="lq-top">
        <span class="lq-status"><i></i><span class="st">Connecting</span> <span class="lq-session"></span></span>
        <span class="lq-incoming"><i></i><span></span></span>
        <span class="lq-spacer"></span>
        <span class="lq-engine"></span>
        <button class="lq-btn retry" type="button" title="Sort again any question that is not sorted yet">↻ Re-sort</button>
        <button class="lq-btn stats" type="button"><span class="car">▸</span><b class="p">0</b> people · <b class="q">0</b> questions</button>
      </div>
      <div class="lq-stats"></div>
      <div class="lq-grid">${CATS.map(c => `
        <div class="lq-card" data-k="${c.key}" style="--c:${c.c}">
          <div class="lq-head"><span class="lq-ic">${icon(c.icon)}</span><span class="lq-name"><b>${esc(c.en)}</b><span>${esc(c.ja)}</span></span><span class="lq-n">0</span></div>
          <div class="lq-bar"><i></i></div>
          <div class="lq-list"></div>
          <div class="lq-empty">Nobody asked yet<small>まだ質問がありません</small></div>
          <span class="lq-more" hidden></span>
        </div>`).join('')}
      </div>
      <div class="lq-other"><span><b>${esc(OTHER.en)}</b> · <span class="n">0</span></span><span class="items"></span></div>
      <div class="lq-focus"><button class="lq-close" type="button" aria-label="Close">×</button><div class="lq-head"></div><div class="lq-list"></div></div>`;
    el.querySelector('.lq-session').textContent = S === C.defaultSession ? '' : '· practice: ' + S;

    const nodes = new Map();
    const lastCount = {};
    let focusKey = null;
    const $ = s => el.querySelector(s);

    $('.lq-btn.stats').addEventListener('click', () => el.classList.toggle('stats-open'));
    $('.lq-btn.retry').addEventListener('click', retry);
    el.querySelectorAll('.lq-card').forEach(card => card.addEventListener('click', () => { focusKey = card.dataset.k; el.classList.add('focus-on'); draw(); }));
    const closeFocus = () => { focusKey = null; el.classList.remove('focus-on'); };
    $('.lq-focus').addEventListener('click', closeFocus);
    addEventListener('keydown', e => { if (e.key === 'Escape' && focusKey) { e.stopPropagation(); closeFocus(); } }, true);

    function draw() {
      const st = stats();
      const stEl = $('.lq-status');
      stEl.classList.toggle('live', status === 'live' || status === 'polling');
      stEl.classList.toggle('err', status === 'error');
      $('.lq-status .st').textContent = status === 'live' ? 'Live' : status === 'polling' ? 'Live (polling)' : status === 'error' ? 'Offline' : 'Connecting';
      $('.lq-btn.stats .p').textContent = st.people;
      $('.lq-btn.stats .q').textContent = st.shown;
      const inc = $('.lq-incoming');
      inc.classList.toggle('on', st.pending > 0);
      inc.querySelector('span').textContent = st.pending + ' arriving…';
      $('.lq-engine').className = 'lq-engine' + (st.backup ? ' backup' : '');
      $('.lq-engine').innerHTML = st.shown ? (st.backup ? 'Sorted by <b>keywords (backup)</b>' : 'Sorted by <b>gemini-decision-1</b>') : '';
      const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
      $('.lq-stats').innerHTML = [
        [st.people, 'People', '提出した人数'],
        [st.shown, 'Questions', '質問数'],
        [st.people ? (st.shown / st.people).toFixed(1) : '–', 'Per person', '1人あたり'],
        [pct(st.open, st.nOpen), 'Open questions', 'オープンな質問'],
        [pct(st.deep, st.nDepth), 'Deep questions', '本質に迫る質問'],
        [st.covered + ' / ' + CATS.length, 'Areas covered', 'カバーした観点']
      ].map(([v, en, ja]) => `<div class="lq-tile"><b>${v}</b><span>${en} <small>${ja}</small></span></div>`).join('');

      const visible = [...rows.values()].filter(r => !r.flagged && r.category).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const by = Object.fromEntries(ALL.map(c => [c.key, []]));
      visible.forEach(r => (by[r.category] || by.other).push(r));
      const max = Math.max(1, ...CATS.map(c => by[c.key].length));

      const live = new Set();
      CATS.forEach(c => {
        const card = el.querySelector(`.lq-card[data-k="${c.key}"]`);
        const list = card.querySelector('.lq-list');
        const items = by[c.key];
        const n = items.length;
        const nEl = card.querySelector('.lq-n');
        if (nEl.textContent !== String(n)) { nEl.textContent = n; if (lastCount[c.key] !== undefined) { nEl.classList.remove('bump'); void nEl.offsetWidth; nEl.classList.add('bump'); } }
        lastCount[c.key] = n;
        card.querySelector('.lq-bar i').style.width = (n / max * 100) + '%';
        card.classList.toggle('empty', n === 0);
        items.slice(0, 6).forEach((r, i) => {
          live.add(r.id);
          let d = nodes.get(r.id);
          if (!d) { d = qNode(r); if (started && rows.size && el._drawn) d.classList.add('new'); nodes.set(r.id, d); }
          else fillQ(d, r);
          if (list.children[i] !== d) list.insertBefore(d, list.children[i] || null);
        });
        [...list.children].forEach(ch => { if (!live.has(ch.dataset.id)) ch.remove(); });
        const more = card.querySelector('.lq-more');
        more.hidden = n <= 6; more.textContent = '+' + (n - 6) + ' more';
      });
      const oth = by.other;
      $('.lq-other .n').textContent = oth.length;
      $('.lq-other .items').innerHTML = oth.slice(0, 6).map(r => `<span class="lq-q"><span class="t">${esc(r.body)}</span></span>`).join(' ');
      for (const id of [...nodes.keys()]) if (!live.has(id)) nodes.delete(id);

      if (focusKey) {
        const c = ALL.find(x => x.key === focusKey);
        const f = $('.lq-focus');
        f.style.setProperty('--c', c.c);
        f.querySelector('.lq-head').innerHTML = `<span class="lq-ic">${icon(c.icon)}</span><span class="lq-name"><b>${esc(c.en)}</b><span>${esc(c.ja)}</span></span><span class="lq-n">${by[c.key].length}</span>`;
        const fl = f.querySelector('.lq-list');
        fl.innerHTML = '';
        if (!by[c.key].length) fl.innerHTML = '<div class="lq-empty" style="display:block;grid-column:1/-1;margin:80px auto;font-size:34px">Nobody asked yet<small style="font-size:22px">まだ質問がありません</small></div>';
        by[c.key].forEach(r => fl.appendChild(qNode(r)));
      }
      el._drawn = true;
    }
    views.push(draw);
    draw();
  }

  function mountCounter(el) {
    el.classList.add('lq-counter');
    el.innerHTML = '<div><b class="q">0</b><span>questions</span></div><div><b class="p">0</b><span>people</span></div>';
    const q = el.querySelector('.q'), p = el.querySelector('.p');
    const set = (node, v) => { if (node.textContent !== String(v)) { node.textContent = v; node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); } };
    views.push(() => { const s = stats(); set(q, s.shown); set(p, s.people); });
  }

  function askLink() { return C.askUrl + (S === C.defaultSession ? '' : '?s=' + encodeURIComponent(S)); }
  const SS = C.surveySession();
  function surveyLink() { return C.surveyUrl + (SS === C.surveyDefault ? '' : '?s=' + encodeURIComponent(SS)); }
  function qr(el, size, link = askLink()) {
    if (typeof window.qrcode !== 'function') { el.textContent = link; return; }
    const q = window.qrcode(0, 'M');
    q.addData(link);
    q.make();
    const n = q.getModuleCount(), cell = size / (n + 8);
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${(c + 4) * cell},${(r + 4) * cell}h${cell}v${cell}h-${cell}z`;
    el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#14213D"/></svg>`;
  }

  // live number of survey answers (only the count is readable with the public key)
  let svTimer = null;
  const svViews = [];
  async function surveyTick() {
    try {
      const r = await fetch(C.url + '/rest/v1/rpc/survey_count', { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': C.anon, 'Authorization': 'Bearer ' + C.anon }, body: JSON.stringify({ p_session: SS }) });
      const n = await r.json();
      if (typeof n === 'number') svViews.forEach(f => f(n));
    } catch (e) {}
  }
  function mountSurveyCount(el) {
    el.innerHTML = '<b>0</b><span>answers so far</span>';
    const b = el.querySelector('b');
    svViews.push(n => { if (b.textContent !== String(n)) { b.textContent = n; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } });
  }
  function startSurvey() { if (svTimer) return; surveyTick(); svTimer = setInterval(surveyTick, 6000); }

  window.LiveQ = { start, mountBoard, mountCounter, qr, retry, askLink, surveyLink, mountSurveyCount, startSurvey, session: S, stats };
})();

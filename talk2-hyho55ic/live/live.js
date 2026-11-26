/* Live question board + Dynamic Answer-Check Engine:
   Reads questions from Supabase (Realtime + poll), applies free client-side Japanese
   translation fallback, classifies/matches expected questions (via gemini-decision-1
   `category_probs._matched_q` or smart client fallback), and renders both the 8-category
   Dashboard and the 4 paginated Answer-Check slides. */
(function () {
  const C = window.LIVEQ;
  const S = C.session();
  const CATS = C.cats, OTHER = C.other;
  const ALL = [...CATS, OTHER];
  const EXP = C.expectedQuestions || [];
  const EXP_MAP = Object.fromEntries(EXP.map(q => [q.id, q]));
  const CAT_MAP = Object.fromEntries(ALL.map(c => [c.key, c]));
  // category_probs already exists on public.questions and carries _matched_q from gemini-decision-1
  const COLS = 'id,participant,body,created_at,status,category,category_conf,category_probs,open_q,depth,on_topic,flagged,lang,en,ja,engine';

  const rows = new Map();
  const demoRows = new Map();
  let useDemo = false;
  const views = [];
  let client = null, started = false, status = 'idle', pollTimer = null, raf = 0;

  const activeMap = () => (useDemo ? demoRows : rows);

  /* ---------- Expected Question Matcher (gemini-decision-1 + smart fallback) ---------- */
  function matchOf(r) {
    if (!r || r.flagged) return 'none';
    const fromApi = r.matched_q || (r.category_probs && r.category_probs._matched_q);
    if (fromApi && (fromApi === 'none' || EXP_MAP[fromApi])) return fromApi;
    const hay = [r.en, r.body, r.ja, r._jaFree].filter(Boolean).join(' ');
    for (const q of EXP) {
      if (q.re && q.re.test(hay)) return q.id;
    }
    return 'none';
  }

  /* ---------- Free Japanese translation fallback (client-side) ---------- */
  const trCache = new Map();
  const trPending = new Set();
  const TR_KEY = 'liveq-ja-cache-v2';
  try {
    const saved = JSON.parse(localStorage.getItem(TR_KEY) || '{}');
    for (const [k, v] of Object.entries(saved)) trCache.set(k, v);
  } catch (e) {}
  function saveTrCache() {
    try {
      const obj = {};
      for (const [k, v] of [...trCache.entries()].slice(-300)) obj[k] = v;
      localStorage.setItem(TR_KEY, JSON.stringify(obj));
    } catch (e) {}
  }
  const hasJa = s => /[\u3040-\u30FF\u4E00-\u9FFF]/.test(s);
  const hasKm = s => /[\u1780-\u17FF]/.test(s);

  async function freeTranslateJa(text) {
    const clean = String(text || '').trim();
    if (!clean || hasJa(clean)) return '';
    if (trCache.has(clean)) return trCache.get(clean);
    try {
      const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=' + encodeURIComponent(clean));
      if (r.ok) {
        const j = await r.json();
        const ja = Array.isArray(j?.[0]) ? j[0].map(p => p?.[0] || '').join('').trim() : '';
        if (ja) { trCache.set(clean, ja); saveTrCache(); return ja; }
      }
    } catch (e) {}
    try {
      const sl = hasKm(clean) ? 'km' : 'en';
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${sl}|ja`);
      if (r.ok) {
        const j = await r.json();
        const ja = String(j?.responseData?.translatedText || '').trim();
        if (ja && !/MYMEMORY WARNING/i.test(ja)) { trCache.set(clean, ja); saveTrCache(); return ja; }
      }
    } catch (e) {}
    return '';
  }

  function ensureJa(r) {
    if (!r || r.flagged || r.ja || !r.body || hasJa(r.body)) return;
    const src = (r.en && r.en.trim()) ? r.en.trim() : r.body.trim();
    if (trCache.has(src)) { r._jaFree = trCache.get(src); return; }
    if (trPending.has(src)) return;
    trPending.add(src);
    freeTranslateJa(src).then(ja => {
      trPending.delete(src);
      if (ja) {
        for (const row of rows.values()) {
          const k = (row.en && row.en.trim()) ? row.en.trim() : (row.body || '').trim();
          if (k === src && !row.ja) row._jaFree = ja;
        }
        schedule();
      }
    });
  }

  /* ---------- Rehearsal / Demo Sample Data (1-click toggle for testing) ---------- */
  const DEMO_ITEMS = [
    { id: 'd1', participant: 'stu-01', body: 'How much budget do you have to build this app?', ja: 'このアプリを作る予算はいくらですか？', category: 'plan', matched_q: 'c1', open_q: 0.85, depth: 2.4 },
    { id: 'd2', participant: 'stu-02', body: 'What is the total budget for development?', ja: '開発の総予算はどのくらいですか？', category: 'plan', matched_q: 'c1', open_q: 0.8, depth: 2.2 },
    { id: 'd3', participant: 'stu-03', body: 'When will AEONA Mall 4 open? How many months do we have?', ja: 'AEONA Mall 4はいつオープンですか？開発期間は何ヶ月？', category: 'plan', matched_q: 'c2', open_q: 0.9, depth: 2.5 },
    { id: 'd4', participant: 'stu-04', body: 'Why not use a Telegram Bot instead of making people download an app?', ja: 'アプリをDLさせる代わりにTelegramボットを使いませんか？', category: 'users', matched_q: 'c4', open_q: 0.95, depth: 2.9 },
    { id: 'd5', participant: 'stu-05', body: 'Which languages do we need? Khmer and English?', ja: 'どの言語が必要ですか？クメール語と英語ですか？', category: 'ux', matched_q: 'o2', open_q: 0.6, depth: 1.5 },
    { id: 'd6', participant: 'stu-06', body: 'Should it support Khmer, English, and Japanese?', ja: 'クメール語・英語・日本語に対応すべきですか？', category: 'ux', matched_q: 'o2', open_q: 0.5, depth: 1.4 },
    { id: 'd7', participant: 'stu-07', body: 'What information do customers enter—number of adults, kids, baby chair?', ja: '大人・子供の人数や子供イスなど何を入力しますか？', category: 'features', matched_q: 'o3', open_q: 0.85, depth: 2.0 },
    { id: 'd8', participant: 'stu-08', body: 'What happens if a customer is called but does not show up after 10 minutes?', ja: '呼び出しても10分以上来なかった場合はどうなりますか？', category: 'features', matched_q: 'o4', open_q: 0.9, depth: 2.3 },
    { id: 'd9', participant: 'stu-09', body: 'Can customers also pre-order food and pay with KHQR while waiting?', ja: '待ち時間に事前注文やKHQR決済もできますか？', category: 'features', matched_q: 'o6', open_q: 0.7, depth: 1.8 },
    { id: 'd10', participant: 'stu-10', body: 'What about elderly grandparents who do not have a smartphone?', ja: 'スマホを持っていないお年寄りはどう並びますか？', category: 'users', matched_q: 'o5', open_q: 0.9, depth: 2.4 },
    { id: 'd11', participant: 'stu-11', body: 'Why do you want to reduce the physical queue? What is your main goal?', ja: '行列を減らしたい一番の目的は何ですか？', category: 'goal', matched_q: 'o1', open_q: 0.95, depth: 2.8 },
    { id: 'd12', participant: 'stu-12', body: 'Will restaurants give discount coupons if waiting time exceeds 45 minutes?', ja: '45分以上待ったら割引クーポンを出しますか？', category: 'operation', matched_q: 'none', open_q: 0.6, depth: 1.6 }
  ];
  function toggleDemo() {
    useDemo = !useDemo;
    if (useDemo && !demoRows.size) {
      DEMO_ITEMS.forEach((it, idx) => {
        demoRows.set(it.id, {
          ...it, status: 'done', flagged: false, lang: 'en', en: it.body,
          engine: 'gemini-decision-1',
          created_at: new Date(Date.now() - (20 - idx) * 1000).toISOString(),
          category_probs: { _matched_q: it.matched_q, _matched_conf: 0.92 }
        });
      });
    }
    schedule();
  }

  /* ---------- icons ---------- */
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

  /* ---------- Supabase connection ---------- */
  function setStatus(s) { status = s; schedule(); }
  function upsertRow(r) {
    const prev = rows.get(r.id) || {};
    const merged = { ...prev, ...r };
    rows.set(r.id, merged);
    ensureJa(merged);
  }
  async function fetchAll() {
    if (!client) return;
    const { data, error } = await client.from('questions').select(COLS).eq('session', S).order('created_at', { ascending: true }).limit(2000);
    if (error) { setStatus(status === 'live' ? 'live' : 'error'); return; }
    const seen = new Set();
    for (const r of data) { seen.add(r.id); upsertRow(r); }
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
        else if (p.new && p.new.id) upsertRow(p.new);
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

  function computeSummary() {
    const all = [...activeMap().values()];
    const shown = all.filter(r => !r.flagged);
    const people = new Set(all.map(r => r.participant)).size;
    const withOpen = shown.filter(r => r.open_q != null), withDepth = shown.filter(r => r.depth != null);
    const open = withOpen.filter(r => r.open_q >= 0.5).length;
    const deep = withDepth.filter(r => r.depth >= 1.8).length;
    const covered = CATS.filter(c => shown.some(r => r.category === c.key)).length;
    const backup = shown.some(r => r.engine && !String(r.engine).startsWith('gemini'));

    const hitsByQ = Object.fromEntries(EXP.map(q => [q.id, []]));
    const unmatched = [];
    for (const r of shown) {
      const mq = matchOf(r);
      if (mq !== 'none' && hitsByQ[mq]) hitsByQ[mq].push(r);
      else unmatched.push(r);
    }
    const critTotal = EXP.filter(q => q.critical).length;
    const critHit = EXP.filter(q => q.critical && hitsByQ[q.id].length > 0).length;

    return {
      total: all.length, shown: shown.length, people, open, deep,
      nOpen: withOpen.length, nDepth: withDepth.length, covered, backup,
      pending: shown.filter(r => !r.category).length,
      hitsByQ, unmatched, critHit, critTotal
    };
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
    const jaText = r.ja || r._jaFree || '';
    const mq = matchOf(r);
    const key = [r.body, r.en, jaText, r.lang, r.open_q, r.depth, mq].join('|');
    if (d._k === key) return;
    d._k = key;
    const showEn = r.en && r.lang && r.lang !== 'en' && r.en.trim() !== r.body.trim();
    const tags = [];
    if (mq !== 'none' && EXP_MAP[mq]) {
      tags.push(EXP_MAP[mq].critical ? '<i class="crit">★ Critical</i>' : '<i class="exp">✓ Expected</i>');
    }
    if ((r.open_q ?? 0) >= 0.5) tags.push('<i class="open">Open</i>');
    if ((r.depth ?? 0) >= 1.8) tags.push('<i class="deep">Deep</i>');
    d.innerHTML = `<p class="t">${esc(r.body)}</p>${showEn ? `<p class="en">${esc(r.en)}</p>` : ''}${jaText ? `<p class="ja">${esc(jaText)}</p>` : ''}${tags.length ? `<div class="lq-tags">${tags.join('')}</div>` : ''}`;
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
        <button class="lq-btn demo" type="button" title="Toggle sample student questions for rehearsal">🧪 Sample</button>
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
    $('.lq-btn.demo').addEventListener('click', toggleDemo);
    el.querySelectorAll('.lq-card').forEach(card => card.addEventListener('click', () => { focusKey = card.dataset.k; el.classList.add('focus-on'); draw(); }));
    const closeFocus = () => { focusKey = null; el.classList.remove('focus-on'); };
    $('.lq-focus').addEventListener('click', closeFocus);
    addEventListener('keydown', e => { if (e.key === 'Escape' && focusKey) { e.stopPropagation(); closeFocus(); } }, true);

    function draw() {
      const st = computeSummary();
      const stEl = $('.lq-status');
      stEl.classList.toggle('live', useDemo || status === 'live' || status === 'polling');
      stEl.classList.toggle('err', !useDemo && status === 'error');
      $('.lq-status .st').textContent = useDemo ? 'Sample Demo' : status === 'live' ? 'Live' : status === 'polling' ? 'Live (polling)' : status === 'error' ? 'Offline' : 'Connecting';
      const demoBtn = $('.lq-btn.demo');
      demoBtn.classList.toggle('on', useDemo);
      demoBtn.style.display = (S !== C.defaultSession || rows.size === 0 || useDemo) ? 'inline-flex' : 'none';
      $('.lq-btn.stats .p').textContent = st.people;
      $('.lq-btn.stats .q').textContent = st.shown;
      const inc = $('.lq-incoming');
      inc.classList.toggle('on', st.pending > 0);
      inc.querySelector('span').textContent = st.pending + ' arriving…';
      $('.lq-engine').className = 'lq-engine' + (st.backup ? ' backup' : '');
      $('.lq-engine').innerHTML = st.shown ? (st.backup ? 'Sorted by <b>keywords (backup)</b>' : 'Sorted by <b>gemini-decision-1</b> (category + answer key)') : '';
      const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
      $('.lq-stats').innerHTML = [
        [st.people, 'People', '提出した人数'],
        [st.shown, 'Questions', '質問数'],
        [st.critHit + ' / ' + st.critTotal, 'Critical found', '重要質問ヒット'],
        [pct(st.open, st.nOpen), 'Open questions', 'オープンな質問'],
        [pct(st.deep, st.nDepth), 'Deep questions', '本質に迫る質問'],
        [st.covered + ' / ' + CATS.length, 'Areas covered', 'カバーした観点']
      ].map(([v, en, ja]) => `<div class="lq-tile"><b>${v}</b><span>${en} <small>${ja}</small></span></div>`).join('');

      const visible = [...activeMap().values()].filter(r => !r.flagged && r.category).sort((a, b) => b.created_at.localeCompare(a.created_at));
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
        items.slice(0, 5).forEach((r, i) => {
          live.add(r.id);
          let d = nodes.get(r.id);
          if (!d) { d = qNode(r); if (started && activeMap().size && el._drawn) d.classList.add('new'); nodes.set(r.id, d); }
          else fillQ(d, r);
          if (list.children[i] !== d) list.insertBefore(d, list.children[i] || null);
        });
        [...list.children].forEach(ch => { if (!live.has(ch.dataset.id)) ch.remove(); });
        const more = card.querySelector('.lq-more');
        more.hidden = n <= 5; more.textContent = '+' + (n - 5) + ' more';
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

  /* ---------- Dynamic Paginated Answer-Check Views (Slides 20–23) ---------- */
  const pagers = new WeakMap();

  function mountAnswerSlide(el, mode) {
    ensureIcons();
    el.classList.add('qav');
    el.innerHTML = `
      <div class="qav-bar">
        <div class="qav-meta"></div>
        <div style="display:flex;align-items:center;gap:12px">
          <button class="lq-btn demo" type="button" style="font-size:16px;padding:8px 14px">🧪 Sample</button>
          <div class="qav-pager" hidden>
            <button type="button" class="prev-p" aria-label="Previous page">◀</button>
            <span class="pg-txt">1 / 1</span>
            <button type="button" class="next-p" aria-label="Next page">▶</button>
          </div>
        </div>
      </div>
      <div class="qav-body"></div>`;

    const state = { page: 0, pages: 1 };
    const slideSec = el.closest('section.slide');
    if (slideSec) pagers.set(slideSec, {
      step(dir) {
        if (dir > 0 && state.page < state.pages - 1) { state.page++; draw(); return true; }
        if (dir < 0 && state.page > 0) { state.page--; draw(); return true; }
        return false;
      },
      reset(toEnd = false) {
        state.page = toEnd ? Math.max(0, state.pages - 1) : 0;
        draw();
      }
    });

    el.querySelector('.prev-p').addEventListener('click', e => { e.stopPropagation(); if (state.page > 0) { state.page--; draw(); } });
    el.querySelector('.next-p').addEventListener('click', e => { e.stopPropagation(); if (state.page < state.pages - 1) { state.page++; draw(); } });
    el.querySelector('.lq-btn.demo').addEventListener('click', e => { e.stopPropagation(); state.page = 0; toggleDemo(); });

    function draw() {
      const sum = computeSummary();
      const demoBtn = el.querySelector('.lq-btn.demo');
      demoBtn.classList.toggle('on', useDemo);
      demoBtn.style.display = (S !== C.defaultSession || rows.size === 0 || useDemo) ? 'inline-flex' : 'none';

      const meta = el.querySelector('.qav-meta');
      const body = el.querySelector('.qav-body');
      const pager = el.querySelector('.qav-pager');

      let list = [], perPage = 2, layout = 'big2';
      if (mode === 'crit-asked') {
        list = EXP.filter(q => q.critical && sum.hitsByQ[q.id].length > 0)
          .sort((a, b) => sum.hitsByQ[b.id].length - sum.hitsByQ[a.id].length);
        perPage = 2; layout = 'big2';
        meta.innerHTML = `<span class="pill-cnt">Found <b>${list.length} / ${sum.critTotal}</b> critical questions</span><span>みんなが聞けた「重要な質問」</span>`;
      } else if (mode === 'other-asked') {
        const totalOther = EXP.filter(q => !q.critical).length;
        list = EXP.filter(q => !q.critical && sum.hitsByQ[q.id].length > 0)
          .sort((a, b) => sum.hitsByQ[b.id].length - sum.hitsByQ[a.id].length);
        perPage = 3; layout = 'med3';
        const extra = sum.unmatched.length ? ` · +${sum.unmatched.length} original questions` : '';
        meta.innerHTML = `<span class="pill-cnt">Matched <b>${list.length} / ${totalOther}</b> expected questions</span><span>みんなが聞けた「想定質問」${esc(extra)}</span>`;
      } else if (mode === 'crit-missed') {
        list = EXP.filter(q => q.critical && sum.hitsByQ[q.id].length === 0);
        perPage = 2; layout = 'big2';
        meta.innerHTML = `<span class="pill-cnt">Missed <b>${list.length} / ${sum.critTotal}</b> critical questions</span><span>聞けなかった「重要な質問」（ここを逃すと大失敗！）</span>`;
      } else if (mode === 'other-missed') {
        list = EXP.filter(q => !q.critical && sum.hitsByQ[q.id].length === 0);
        perPage = 6; layout = 'grid6';
        meta.innerHTML = `<span class="pill-cnt"><b>${list.length}</b> remaining Q&amp;As</span><span>その他の想定質問とクライアント回答一覧</span>`;
      }

      state.pages = Math.max(1, Math.ceil(list.length / perPage));
      if (state.page >= state.pages) state.page = state.pages - 1;
      pager.hidden = state.pages <= 1;
      el.querySelector('.pg-txt').textContent = `Page ${state.page + 1} / ${state.pages}`;
      el.querySelector('.prev-p').disabled = state.page === 0;
      el.querySelector('.next-p').disabled = state.page >= state.pages - 1;

      body.className = 'qav-body ' + layout;
      if (!list.length) {
        if (mode === 'crit-asked') {
          body.innerHTML = `<div class="qac-empty"><b>0 / ${sum.critTotal} Critical Questions Asked Yet</b><p>Nobody hit the hidden project-changing traps yet—let’s see what happens on the Missed slide!<br><small>重要な質問はまだ出ていません（後のスライドで種明かしします！）</small></p></div>`;
        } else if (mode === 'other-asked') {
          body.innerHTML = `<div class="qac-empty"><b>No Expected Questions Matched Yet</b><p>Scan the QR on Slide 18 (or click 🧪 Sample in rehearsal) to see matched Q&amp;As live.<br><small>想定質問に一致する質問がまだ届いていません</small></p></div>`;
        } else if (mode === 'crit-missed') {
          body.innerHTML = `<div class="qac-empty" style="border-color:#8CE0C2;background:#F2FBF7"><b>🏆 Amazing! You Found All ${sum.critTotal} / ${sum.critTotal} Critical Questions!</b><p>Zero critical blind spots—your team uncovered budget, 2-month deadline, weak Wi-Fi, Telegram, and multi-shop ops!<br><small>素晴らしい！重要な質問をすべて質問できました！</small></p></div>`;
        } else {
          body.innerHTML = `<div class="qac-empty" style="border-color:#8CE0C2;background:#F2FBF7"><b>🎉 Every Expected Question Was Covered!</b><p>You asked every single item on our expected list!</p></div>`;
        }
        return;
      }

      const slice = list.slice(state.page * perPage, (state.page + 1) * perPage);
      if (mode === 'crit-asked') {
        body.innerHTML = slice.map(q => {
          const hits = sum.hitsByQ[q.id];
          const cat = CAT_MAP[q.cat] || OTHER;
          const sample = hits[0] ? `“${hits[0].body}”` : '';
          return `<div class="qac-big" style="--c:${cat.c}">
            <div class="qac-top">
              <span class="qac-badge">★ Critical · ${esc(cat.en)}</span>
              <span class="qac-hits">👥 Asked by ${hits.length} ${hits.length === 1 ? 'student' : 'students'}</span>
              <span class="qac-stu">${esc(sample)}</span>
            </div>
            <p class="qac-q">Q. ${esc(q.qEn)}<small>${esc(q.qJa)}</small></p>
            <p class="qac-a">💬 Mr. Sato: “${esc(q.aEn)}”<small>${esc(q.aJa)}</small></p>
          </div>`;
        }).join('');
      } else if (mode === 'other-asked') {
        body.innerHTML = slice.map(q => {
          const hits = sum.hitsByQ[q.id];
          const cat = CAT_MAP[q.cat] || OTHER;
          const sample = hits[0] ? `“${hits[0].body}”` : '';
          return `<div class="qac-med" style="--c:${cat.c}">
            <div>
              <div class="qac-top" style="margin-bottom:8px">
                <span class="qac-badge" style="font-size:14px;padding:4px 12px">${esc(cat.en)}</span>
                <span class="qac-hits" style="font-size:15px;padding:4px 12px">👥 ${hits.length} asked</span>
              </div>
              <p class="qac-q">Q. ${esc(q.qEn)}<small>${esc(q.qJa)}</small></p>
              <div class="qac-stu" style="margin-top:6px;font-size:16px">${esc(sample)}</div>
            </div>
            <p class="qac-a">💬 “${esc(q.aEn)}”<small>${esc(q.aJa)}</small></p>
          </div>`;
        }).join('');
      } else if (mode === 'crit-missed') {
        body.innerHTML = slice.map(q => {
          const cat = CAT_MAP[q.cat] || OTHER;
          return `<div class="qac-big missed" style="--c:#FF4D6D">
            <div class="qac-top">
              <span class="qac-badge" style="background:#FF4D6D">🚨 Nobody Asked · ${esc(cat.en)}</span>
              <span class="qac-imp">⚡ ${esc(q.impactEn || '')}</span>
            </div>
            <p class="qac-q">Q. ${esc(q.qEn)}<small>${esc(q.qJa)}</small></p>
            <p class="qac-a">💬 Mr. Sato’s Hidden Truth: “${esc(q.aEn)}”<small>${esc(q.aJa)}</small></p>
          </div>`;
        }).join('');
      } else {
        body.innerHTML = slice.map(q => {
          const cat = CAT_MAP[q.cat] || OTHER;
          return `<div class="qac-sm" style="--c:${cat.c}">
            <span class="sm-cat">${esc(cat.en)} · ${esc(cat.ja)}</span>
            <p class="sm-q">Q. ${esc(q.qEn)}<small>${esc(q.qJa)}</small></p>
            <p class="sm-a">A. ${esc(q.aEn)}<small>${esc(q.aJa)}</small></p>
          </div>`;
        }).join('');
      }
    }

    views.push(draw);
    draw();
  }

  function stepSlidePager(slideEl, dir) {
    const p = pagers.get(slideEl);
    return p ? p.step(dir) : false;
  }
  function resetSlidePager(slideEl, toEnd = false) {
    const p = pagers.get(slideEl);
    if (p) p.reset(toEnd);
  }

  function mountCounter(el) {
    el.classList.add('lq-counter');
    el.innerHTML = '<div><b class="q">0</b><span>questions</span></div><div><b class="p">0</b><span>people</span></div>';
    const q = el.querySelector('.q'), p = el.querySelector('.p');
    const set = (node, v) => { if (node.textContent !== String(v)) { node.textContent = v; node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); } };
    views.push(() => { const s = computeSummary(); set(q, s.shown); set(p, s.people); });
  }

  function askLink() { return C.askUrl + (S === C.defaultSession ? '' : '?s=' + encodeURIComponent(S)); }
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

  window.LiveQ = {
    start, mountBoard, mountCounter, mountAnswerSlide,
    stepSlidePager, resetSlidePager, toggleDemo,
    qr, retry, askLink, session: S, stats: computeSummary
  };
})();

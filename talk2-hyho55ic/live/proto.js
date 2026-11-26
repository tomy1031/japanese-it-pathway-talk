/* Interactive 3-Phone Telegram Queue Bot Prototype for AEONA Mall 4.
   Demonstrates live on stage:
   1. Per-store Admin Invite QR registration & staff revocation (Telegram ID <-> store_id)
   2. Customer 2-tap QR check-in -> Real-time Admin alert -> Queue list -> "✅ Call (OK)" -> Auto Customer alert
   3. Safeguards: Multi-staff concurrency lock, Cross-store isolation (403 block), and Store Master custom question toggles */
(function () {
  function mountTelegramProto(root) {
    if (!root) return;

    const initialState = () => ({
      stepHighlight: 0,
      // Store Master config (per-restaurant rules + authorized Telegram User IDs)
      stores: {
        shop_a: {
          id: 'shop_a', code: 'A', name: 'Sakura Ramen', jaName: 'A店舗：Sakura Ramen',
          invite: 'INV-SHOPA-882', banner: 'img/shop_ramen_banner.jpg',
          askSeat: true, askBabyChair: true, askStroller: false,
          admins: [
            { id: '123456789', name: 'Manager A (店長A)', active: true },
            { id: '555019283', name: 'Staff B (スタッフB)', active: true }
          ]
        },
        shop_b: {
          id: 'shop_b', code: 'B', name: 'Sushi Masa', jaName: 'B店舗：Sushi Masa',
          invite: 'INV-SHOPB-419', banner: 'img/telegram_banner.jpg',
          askSeat: true, askBabyChair: false, askStroller: false,
          admins: [
            { id: '987654321', name: 'Shop B Manager', active: true }
          ]
        }
      },
      // Customer Phone state
      cust: {
        shop: 'shop_a', adults: 3, kids: 1, seat: 'Table', babyChair: true, stroller: false,
        nextSeqA: 12, nextSeqB: 5,
        msgs: [
          {
            kind: 'bot',
            html: `<b>👋 Welcome to AEONA Mall 4 Dining!</b><br>Scan any restaurant QR—no app download or login needed.<span class="ja-sub">店頭QRを読むだけ！アプリのDLも会員登録も不要です。</span>`
          }
        ]
      },
      // Active Queue DB (shared backend, strictly filtered by store_id!)
      tickets: [
        { no: '#A-010', shop: 'shop_a', guests: 'Adults 2', prefs: 'Counter', pos: 1, status: 'waiting', calledBy: null },
        { no: '#A-011', shop: 'shop_a', guests: 'Adults 4', prefs: 'Table', pos: 2, status: 'waiting', calledBy: null },
        { no: '#B-004', shop: 'shop_b', guests: 'Adults 2', prefs: 'Counter', pos: 1, status: 'waiting', calledBy: null }
      ],
      // Phone 2 (Shop A Staff) state
      shopA: {
        actorId: '123456789',
        showList: false,
        msgs: [
          {
            kind: 'bot',
            html: `<b>🔑 Authenticated: Shop A (Sakura Ramen)</b><br>Telegram ID <code>123456789</code> is bound to <code>store_id: shop_a</code>.<span class="ja-sub">ID 123456789 を【A店舗】管理者として認証中（他店データは非表示）</span>`
          }
        ]
      },
      // Phone 3 (Isolation & Store Master) state
      rightTab: 'shopb', // 'shopb' | 'master'
      masterShop: 'shop_a',
      shopBMsgs: [
        {
          kind: 'bot',
          html: `<b>🔑 Authenticated: Shop B (Sushi Masa)</b><br>Telegram ID <code>987654321</code> sees <b>Shop B ONLY</b>.<span class="ja-sub">B店舗スタッフ画面：A店舗の予約（#A-012等）は一切見えません。</span>`
        }
      ]
    });

    let S = initialState();

    const nowTime = () => {
      const d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    };
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- Actions ---------- */
    function scanInviteQr() {
      S.stepHighlight = 1;
      const actor = S.stores.shop_a.admins.find(a => a.id === S.shopA.actorId);
      if (actor) actor.active = true;
      S.shopA.msgs.push(
        { kind: 'me', html: `/start ${S.stores.shop_a.invite}` },
        {
          kind: 'bot',
          html: `✅ <b>Admin Linked!</b><br>Registered Telegram ID <code>${S.shopA.actorId}</code> (${esc(actor ? actor.name : 'Staff')}) as an administrator of <b>【Shop A: Sakura Ramen】</b>.<span class="ja-sub">このTelegramアカウントID（${S.shopA.actorId}）を【A店舗】の管理者としてDBに登録しました。複数スタッフも同じ招待QRで登録可能です。</span>`
        }
      );
      render();
      scrollBottom('.p2-body');
    }

    function customerJoinQueue() {
      S.stepHighlight = 2;
      const st = S.stores[S.cust.shop];
      const seq = S.cust.shop === 'shop_a' ? S.cust.nextSeqA++ : S.cust.nextSeqB++;
      const no = `#${st.code}-${String(seq).padStart(3, '0')}`;
      const guestsParts = [`Adults ${S.cust.adults}`];
      const guestsJa = [`大人 ${S.cust.adults}名`];
      if (S.cust.kids > 0) { guestsParts.push(`Kids ${S.cust.kids}`); guestsJa.push(`子供 ${S.cust.kids}名`); }

      const prefs = [], prefsJa = [];
      if (st.askSeat) { prefs.push(`${S.cust.seat} seat`); prefsJa.push(S.cust.seat === 'Table' ? 'テーブル席' : 'カウンター席'); }
      if (st.askBabyChair && S.cust.babyChair) { prefs.push('Baby chair'); prefsJa.push('子供用イス'); }
      if (st.askStroller && S.cust.stroller) { prefs.push('Stroller'); prefsJa.push('ベビーカー'); }

      const waitingCount = S.tickets.filter(t => t.shop === st.id && t.status === 'waiting').length + 1;
      const ticket = {
        no, shop: st.id,
        guests: guestsParts.join(' / '),
        guestsJa: guestsJa.join(' / '),
        prefs: prefs.length ? prefs.join(' · ') : 'Standard',
        prefsJa: prefsJa.length ? prefsJa.join('・') : '指定なし',
        pos: waitingCount, status: 'waiting', calledBy: null
      };
      S.tickets.push(ticket);

      // Customer confirmation
      S.cust.msgs.push({
        kind: 'bot',
        html: `🎟️ <b>Joined Queue — ${esc(st.name)}</b><br>・Ticket: <b>${no}</b> (${waitingCount}${waitingCount === 1 ? 'st' : waitingCount === 2 ? 'nd' : waitingCount === 3 ? 'rd' : 'th'} in line)<br>・Party: ${esc(ticket.guests)} (${esc(ticket.prefs)})<br>🛍️ Feel free to shop! We’ll message you here.<span class="ja-sub">受付完了（${waitingCount}組目）。順番まで館内でゆっくりお買い物をお楽しみください！</span>`
      });

      // Step 1: Real-time push to ALL active admins of that specific store!
      if (st.id === 'shop_a') {
        S.shopA.msgs.push({
          kind: 'alert',
          html: `🔔 <b>New Queue Ticket (${esc(st.name)})</b><br>・Ticket: <b>${no}</b><br>・Guests: <b>${esc(ticket.guests)}</b><br>・Request: <b>${esc(ticket.prefs)}</b><br>・Waiting: <b>#${waitingCount} in line</b><span class="ja-sub">🔔 新規の順番待ち登録（A店舗） 整理番号：${no} ／ 人数：${esc(ticket.guestsJa)} ／ 希望：${esc(ticket.prefsJa)} ／ 現在：${waitingCount}組目</span>`
        });
      } else {
        S.shopBMsgs.push({
          kind: 'alert',
          html: `🔔 <b>New Queue Ticket (Shop B)</b><br>・Ticket: <b>${no}</b> · ${esc(ticket.guests)} (${esc(ticket.prefs)})<span class="ja-sub">B店舗のみに通知（A店舗の画面には一切届きません）</span>`
        });
      }
      render();
      scrollBottom('.p1-body');
      scrollBottom('.p2-body');
      scrollBottom('.p3-body');
    }

    function staffCallTicket(ticketNo, actorOverride) {
      const actorId = actorOverride || S.shopA.actorId;
      const admin = S.stores.shop_a.admins.find(a => a.id === actorId);

      // Permission check (is this Telegram ID still an active admin of Shop A?)
      if (!admin || !admin.active) {
        S.shopA.msgs.push({
          kind: 'err',
          html: `⛔ <b>Access Revoked (403)</b><br>Telegram ID <code>${actorId}</code> is no longer an active admin of Shop A.<span class="ja-sub">権限エラー：退職・削除済みのスタッフIDからは操作できません。</span>`
        });
        render();
        scrollBottom('.p2-body');
        return;
      }

      const t = S.tickets.find(x => x.no === ticketNo && x.shop === 'shop_a');
      if (!t) return;

      // Concurrency lock check!
      if (t.status === 'called') {
        S.shopA.msgs.push({
          kind: 'lock',
          html: `🔒 <b>Concurrency Lock Blocked Duplicate!</b><br>Ticket <b>${t.no}</b> was already called by <b>${esc(t.calledBy)}</b>. Customer was NOT notified twice.<span class="ja-sub">排他制御（ロック処理）：${esc(t.calledBy)}が既に呼び出し済みのため、2重通知を自動ブロックしました！</span>`
        });
        render();
        scrollBottom('.p2-body');
        return;
      }

      // Acquire lock & update status
      t.status = 'called';
      t.calledBy = admin.name;
      S.shopA.msgs.push({
        kind: 'bot',
        html: `✅ <b>Called ${t.no}</b> (Verified <code>ID:${actorId}</code> = Shop A · Lock OK)<span class="ja-sub">${t.no} を呼び出しました（A店舗管理者権限チェックOK → お客様へ自動通知送信）</span>`
      });

      // Step 3: Automatic message to Customer's Telegram!
      S.cust.msgs.push({
        kind: 'ready',
        html: `🎉 <b>【Shop A · Sakura Ramen】Table Ready!</b><br>Ticket <b>${t.no}</b> — Your table is ready!<br>Please speak to our staff at the entrance within <b>10 minutes</b>.<span class="ja-sub">🎉【A店舗】お待たせいたしました！整理番号 ${t.no} のお客様、お席の準備が整いました。10分以内に店頭スタッフまでお声がけください。</span>`
      });

      render();
      scrollBottom('.p1-body');
      scrollBottom('.p2-body');
    }

    function staffCancelTicket(ticketNo) {
      const admin = S.stores.shop_a.admins.find(a => a.id === S.shopA.actorId);
      if (!admin || !admin.active) { staffCallTicket(ticketNo); return; }
      const t = S.tickets.find(x => x.no === ticketNo && x.shop === 'shop_a');
      if (!t || t.status === 'cancelled') return;
      t.status = 'cancelled';
      S.shopA.msgs.push({
        kind: 'bot',
        html: `❌ <b>Cancelled ${t.no}</b> by ${esc(admin.name)}.`
      });
      render();
      scrollBottom('.p2-body');
    }

    function testCrossShopHack() {
      S.stepHighlight = 5;
      S.rightTab = 'shopb';
      S.shopBMsgs.push(
        { kind: 'me', html: `Attempt API: call_ticket("#A-012")` },
        {
          kind: 'err',
          html: `⛔ <b>403 Permission Denied!</b><br>Sender Telegram ID <code>987654321</code> is bound ONLY to <code>store_id: shop_b</code>.<br>Cannot view or update <b>Shop A</b> tickets.<span class="ja-sub">他店舗の誤操作防止：送信者のTelegram IDに紐づく store_id 以外のデータは一切取得・更新できません。</span>`
        }
      );
      render();
      scrollBottom('.p3-body');
    }

    /* ---------- Guided 1-Click Stage Scenarios ---------- */
    function runScenario(step) {
      if (step === 1) {
        scanInviteQr();
      } else if (step === 2) {
        S.cust.shop = 'shop_a'; S.cust.adults = 3; S.cust.kids = 1; S.cust.seat = 'Table'; S.cust.babyChair = true;
        customerJoinQueue();
      } else if (step === 3) {
        S.stepHighlight = 3;
        if (!S.tickets.some(t => t.no === '#A-012')) {
          S.cust.shop = 'shop_a'; S.cust.adults = 3; S.cust.kids = 1; S.cust.seat = 'Table'; S.cust.babyChair = true;
          customerJoinQueue();
        }
        S.shopA.actorId = '123456789';
        S.shopA.showList = true;
        const target = S.tickets.find(t => t.no === '#A-012') || S.tickets.find(t => t.shop === 'shop_a' && t.status === 'waiting');
        if (target) staffCallTicket(target.no, '123456789');
      } else if (step === 4) {
        S.stepHighlight = 4;
        let target = S.tickets.find(t => t.no === '#A-012') || S.tickets.find(t => t.shop === 'shop_a');
        if (target && target.status !== 'called') staffCallTicket(target.no, '123456789');
        S.shopA.actorId = '555019283';
        S.shopA.showList = true;
        if (target) staffCallTicket(target.no, '555019283');
      } else if (step === 5) {
        testCrossShopHack();
      } else if (step === 0) {
        S = initialState();
        render();
      }
    }

    function scrollBottom(sel) {
      const apply = () => {
        const b = root.querySelector(sel);
        if (b) b.scrollTop = b.scrollHeight;
      };
      apply();
      requestAnimationFrame(apply);
    }

    /* ---------- Render DOM ---------- */
    root.classList.add('tg-stage');
    function render() {
      const prevScroll = {};
      ['.p1-body', '.p2-body', '.p3-body'].forEach(sel => {
        const el = root.querySelector(sel);
        if (el) prevScroll[sel] = el.scrollTop;
      });
      const stCust = S.stores[S.cust.shop];
      const stMaster = S.stores[S.masterShop];
      const shopATickets = S.tickets.filter(t => t.shop === 'shop_a');
      const shopBTickets = S.tickets.filter(t => t.shop === 'shop_b');
      const tm = nowTime();

      root.innerHTML = `
        <div class="tg-topbar">
          <div class="tg-title">
            <span class="kicker">Live Interactive Demo</span>
            <h2>AEONA Mall 4 · Telegram Queue Bot</h2>
          </div>
          <div class="tg-steps">
            <button type="button" class="tg-sbtn ${S.stepHighlight===1?'active':''}" data-sc="1">① 招待QR登録</button>
            <button type="button" class="tg-sbtn ${S.stepHighlight===2?'active':''}" data-sc="2">② お客様が予約 (#A-012)</button>
            <button type="button" class="tg-sbtn ${S.stepHighlight===3?'active':''}" data-sc="3">③ リスト確認 → ✅呼び出し</button>
            <button type="button" class="tg-sbtn ${S.stepHighlight===4?'active':''}" data-sc="4">④ 同時押しロック実験</button>
            <button type="button" class="tg-sbtn ${S.stepHighlight===5?'active':''}" data-sc="5">⑤ 他店ブロック実験</button>
            <button type="button" class="tg-sbtn reset" data-sc="0">↺ Reset</button>
          </div>
        </div>

        <div class="tg-phones">
          <!-- PHONE 1: CUSTOMER -->
          <div class="tg-col">
            <div class="tg-role cust">🛍️ 1. Customer’s Telegram（お客様画面）</div>
            <div class="tg-phone">
              <div class="tg-screen">
                <div class="tg-appbar">
                  <div class="tg-av">🍽️</div>
                  <div class="tg-hinfo">
                    <b>AEONA Mall 4 Dining <span class="tg-vbadge">✓</span></b>
                    <span>official bot · zero download</span>
                  </div>
                </div>
                <div class="tg-subbar">
                  <button type="button" class="tg-tab ${S.cust.shop==='shop_a'?'on':''}" data-cshop="shop_a">🍜 Scan QR: Shop A</button>
                  <button type="button" class="tg-tab ${S.cust.shop==='shop_b'?'on':''}" data-cshop="shop_b">🍣 Scan QR: Shop B</button>
                </div>
                <div class="tg-body p1-body">
                  <div class="tg-card">
                    <div class="tg-banner" style="background-image:url(${stCust.banner})">
                      <div class="tg-banner-ov">
                        <b>${esc(stCust.jaName)}</b>
                        <span>Floor 2 · Restaurant Zone · Instant Telegram Ticket</span>
                      </div>
                    </div>
                    <div class="tg-form">
                      <div class="tg-frow">
                        <span>👥 Adults / Kids（人数）</span>
                        <div style="display:flex;gap:8px">
                          <span class="tg-step"><button type="button" data-adj="a-1">−</button><b>${S.cust.adults}</b><button type="button" data-adj="a+1">+</button></span>
                          <span class="tg-step"><button type="button" data-adj="k-1">−</button><b>${S.cust.kids}</b><button type="button" data-adj="k+1">+</button></span>
                        </div>
                      </div>
                      ${(stCust.askSeat || stCust.askBabyChair || stCust.askStroller) ? `
                      <div class="tg-chips">
                        ${stCust.askSeat ? `
                          <button type="button" class="tg-chip ${S.cust.seat==='Table'?'on':''}" data-seat="Table">🪑 Table席</button>
                          <button type="button" class="tg-chip ${S.cust.seat==='Counter'?'on':''}" data-seat="Counter">🍶 Counter席</button>
                        ` : ''}
                        ${stCust.askBabyChair ? `<button type="button" class="tg-chip ${S.cust.babyChair?'on':''}" data-tog="baby">👶 子供用イス</button>` : ''}
                        ${stCust.askStroller ? `<button type="button" class="tg-chip ${S.cust.stroller?'on':''}" data-tog="stroller">🛒 ベビーカー</button>` : ''}
                      </div>` : `<div style="font-size:12.5px;color:#68758E;font-weight:600">※ この店舗は「人数のみ」のシンプル受付設定です</div>`}
                      <button type="button" class="tg-cta" data-act="join">🎟️ Join Waiting List · 順番待ち登録</button>
                    </div>
                  </div>
                  ${S.cust.msgs.map(m => `<div class="tg-msg ${m.kind}">${m.html}<span class="tg-time">${tm} ✓✓</span></div>`).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- PHONE 2: SHOP A ADMIN -->
          <div class="tg-col">
            <div class="tg-role shopa">👨‍🍳 2. Shop A Manager’s Telegram（A店舗 管理者）</div>
            <div class="tg-phone">
              <div class="tg-screen">
                <div class="tg-appbar">
                  <div class="tg-av">🍜</div>
                  <div class="tg-hinfo">
                    <b>AEONA Queue Admin <span class="tg-vbadge">✓</span></b>
                    <span>Bound to: Shop A ONLY · ID ${esc(S.shopA.actorId)}</span>
                  </div>
                </div>
                <div class="tg-subbar">
                  <button type="button" class="tg-tab ${S.shopA.actorId==='123456789'?'on':''}" data-actor="123456789">👤 店長A</button>
                  <button type="button" class="tg-tab ${S.shopA.actorId==='555019283'?'on':''}" data-actor="555019283">👤 スタッフB</button>
                  <button type="button" class="tg-tab warn" data-act="invqr">🔑 招待QR登録</button>
                </div>
                <div class="tg-body p2-body">
                  ${S.shopA.msgs.map(m => `<div class="tg-msg ${m.kind}">${m.html}<span class="tg-time">${tm}</span></div>`).join('')}
                  ${S.shopA.showList ? `
                  <div class="tg-qbox">
                    <div class="tg-qhead"><span>📋 A店舗 待ちリスト（Shop A Only）</span><span>${shopATickets.filter(t=>t.status==='waiting').length} 組待ち</span></div>
                    ${shopATickets.slice().reverse().map(t => `
                      <div class="tg-qitem ${t.no==='#A-012'&&t.status==='waiting'?'hl':''} ${t.status}">
                        <div class="tg-qrow">
                          <span class="tg-tno">${esc(t.no)}</span>
                          <span class="tg-qstat">${t.status==='called' ? '✅ 呼出済 ('+esc(t.calledBy)+')' : t.status==='cancelled' ? '❌ キャンセル' : '⏳ 待ち #'+t.pos}</span>
                        </div>
                        <div class="tg-qmeta">${esc(t.guests)} · ${esc(t.prefs)}</div>
                        ${t.status !== 'cancelled' ? `
                        <div class="tg-ibtn-row">
                          <button type="button" class="tg-ibtn ok ${t.status==='called'?'done':''}" data-call="${esc(t.no)}">✅ 呼び出し (OK)</button>
                          <button type="button" class="tg-ibtn ng" data-cancel="${esc(t.no)}">❌ キャンセル</button>
                        </div>` : ''}
                      </div>
                    `).join('')}
                  </div>` : ''}
                </div>
                <div class="tg-botbar">
                  <button type="button" class="tg-menubtn" data-act="togglelist">📋 ${S.shopA.showList ? '待ちリストを更新・表示中' : '待ちリスト確認（Check Queue）'}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- PHONE 3: MULTI-STORE ISOLATION & STORE MASTER -->
          <div class="tg-col">
            <div class="tg-role guard">🛡️ 3. Isolation &amp; Store Master（他店分離・店舗設定）</div>
            <div class="tg-phone">
              <div class="tg-screen">
                <div class="tg-appbar ${S.rightTab==='shopb'?'shopb':'master'}">
                  <div class="tg-av">${S.rightTab==='shopb'?'🍣':'⚙️'}</div>
                  <div class="tg-hinfo">
                    <b>${S.rightTab==='shopb' ? 'Shop B Staff (ID: 987654321)' : 'Mall & Store Master Settings'}</b>
                    <span>${S.rightTab==='shopb' ? 'Bound to: Shop B (Sushi Masa) ONLY' : 'Invite QR · Staff IDs · Per-shop rules'}</span>
                  </div>
                </div>
                <div class="tg-subbar">
                  <button type="button" class="tg-tab ${S.rightTab==='shopb'?'on':''}" data-rtab="shopb">🍣 B店舗スタッフ画面</button>
                  <button type="button" class="tg-tab ${S.rightTab==='master'?'on':''}" data-rtab="master">⚙️ 権限・質問マスター</button>
                </div>

                ${S.rightTab === 'shopb' ? `
                <div class="tg-body p3-body">
                  <div class="tg-qbox">
                    <div class="tg-qhead"><span>📋 B店舗 待ちリスト（Shop B Only）</span><span>${shopBTickets.length} 組</span></div>
                    ${shopBTickets.map(t => `
                      <div class="tg-qitem">
                        <div class="tg-qrow"><span class="tg-tno">${esc(t.no)}</span><span class="tg-qstat">⏳ 待ち #${t.pos}</span></div>
                        <div class="tg-qmeta">${esc(t.guests)} · ${esc(t.prefs)}</div>
                      </div>
                    `).join('')}
                  </div>
                  ${S.shopBMsgs.map(m => `<div class="tg-msg ${m.kind}">${m.html}<span class="tg-time">${tm}</span></div>`).join('')}
                </div>
                <div class="tg-botbar">
                  <button type="button" class="tg-menubtn" style="background:#FFE8EC;color:#C81E45" data-act="hack">🚫 A店舗の #A-012 を操作してみる（権限テスト）</button>
                </div>
                ` : `
                <div class="tg-body p3-body">
                  <div class="tg-mcard">
                    <h4><span>① A店舗 管理者招待コード/QR</span><span style="color:#12B886;font-size:12px">store_id: shop_a</span></h4>
                    <div class="tg-inv">
                      <div class="tg-inv-qr"></div>
                      <div><code>${S.stores.shop_a.invite}</code><small>店長・スタッフが読むだけでA店舗に紐づけ</small></div>
                    </div>
                    ${S.stores.shop_a.admins.map(a => `
                      <div class="tg-srow">
                        <span>👤 ${esc(a.name)} <code style="color:#68758E">${a.id}</code></span>
                        <button type="button" class="${a.active?'rm':'add'}" data-staff="${a.id}">${a.active ? '退職・削除 ✕' : '再登録 ＋'}</button>
                      </div>
                    `).join('')}
                  </div>

                  <div class="tg-mcard">
                    <h4>
                      <span>③ 店舗別の質問項目 ON/OFF</span>
                      <span style="display:inline-flex;gap:4px">
                        <button type="button" class="tg-chip ${S.masterShop==='shop_a'?'on':''}" style="padding:3px 9px;font-size:12px" data-mshop="shop_a">A店舗</button>
                        <button type="button" class="tg-chip ${S.masterShop==='shop_b'?'on':''}" style="padding:3px 9px;font-size:12px" data-mshop="shop_b">B店舗</button>
                      </span>
                    </h4>
                    <div class="tg-trow"><span>テーブル / カウンター希望</span><button type="button" class="tg-sw ${stMaster.askSeat?'on':''}" data-rule="askSeat"></button></div>
                    <div class="tg-trow"><span>子供用イス (Baby chair)</span><button type="button" class="tg-sw ${stMaster.askBabyChair?'on':''}" data-rule="askBabyChair"></button></div>
                    <div class="tg-trow"><span>ベビーカー有無 (Stroller)</span><button type="button" class="tg-sw ${stMaster.askStroller?'on':''}" data-rule="askStroller"></button></div>
                    <div style="font-size:12px;color:#56627A;font-weight:600">↑ ON/OFFを切り替えると左の「お客様スマホ画面」が即座に変わります！</div>
                  </div>
                </div>
                `}
              </div>
            </div>
          </div>
        </div>`;

      Object.keys(prevScroll).forEach(sel => {
        const el = root.querySelector(sel);
        if (el) el.scrollTop = prevScroll[sel];
      });
    }

    /* ---------- Delegated Click Handler (stops slide-advance propagation!) ---------- */
    root.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.stopPropagation();

      if (btn.dataset.sc !== undefined) { runScenario(+btn.dataset.sc); return; }
      if (btn.dataset.cshop) { S.cust.shop = btn.dataset.cshop; render(); return; }
      if (btn.dataset.adj) {
        const [who, d] = [btn.dataset.adj[0], parseInt(btn.dataset.adj.slice(1), 10)];
        if (who === 'a') S.cust.adults = Math.max(1, Math.min(12, S.cust.adults + d));
        else S.cust.kids = Math.max(0, Math.min(8, S.cust.kids + d));
        render(); return;
      }
      if (btn.dataset.seat) { S.cust.seat = btn.dataset.seat; render(); return; }
      if (btn.dataset.tog === 'baby') { S.cust.babyChair = !S.cust.babyChair; render(); return; }
      if (btn.dataset.tog === 'stroller') { S.cust.stroller = !S.cust.stroller; render(); return; }
      if (btn.dataset.act === 'join') { customerJoinQueue(); return; }
      if (btn.dataset.actor) { S.shopA.actorId = btn.dataset.actor; render(); return; }
      if (btn.dataset.act === 'invqr') { scanInviteQr(); return; }
      if (btn.dataset.act === 'togglelist') { S.shopA.showList = !S.shopA.showList; render(); scrollBottom('.p2-body'); return; }
      if (btn.dataset.call) { staffCallTicket(btn.dataset.call); return; }
      if (btn.dataset.cancel) { staffCancelTicket(btn.dataset.cancel); return; }
      if (btn.dataset.rtab) { S.rightTab = btn.dataset.rtab; render(); return; }
      if (btn.dataset.act === 'hack') { testCrossShopHack(); return; }
      if (btn.dataset.staff) {
        const adm = S.stores.shop_a.admins.find(a => a.id === btn.dataset.staff);
        if (adm) adm.active = !adm.active;
        render(); return;
      }
      if (btn.dataset.mshop) { S.masterShop = btn.dataset.mshop; S.cust.shop = btn.dataset.mshop; render(); return; }
      if (btn.dataset.rule) {
        const k = btn.dataset.rule;
        S.stores[S.masterShop][k] = !S.stores[S.masterShop][k];
        S.cust.shop = S.masterShop;
        render(); return;
      }
    });

    render();
  }

  window. mountTelegramProto = mountTelegramProto;
})();

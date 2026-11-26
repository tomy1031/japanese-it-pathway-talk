/* Live questions: shared settings for the deck, the phone form and the dashboard.
   The key below is Supabase's public "anon" key: it can only read the questions table
   and call the questions function (row-level security does the rest). */
window.LIVEQ = {
  url: 'https://odpexredcsyjynbexstj.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcGV4cmVkY3N5anluYmV4c3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDU3NDIsImV4cCI6MjExMDM4MTc0Mn0.mkyk8E9ih7VL8CksmlBZMsSeEkfXYNggHeZ2U56V0cA',
  fn: 'https://odpexredcsyjynbexstj.supabase.co/functions/v1/questions',
  // where the QR code sends phones (the published form)
  askUrl: 'https://tomy1031.github.io/japanese-it-pathway-talk/talk2-hyho55ic/ask/',
  // the talk's session; add ?s=test (to the deck or the form) for rehearsals
  defaultSession: 'live',
  session() {
    const s = new URLSearchParams(location.search).get('s') || '';
    return /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : this.defaultSession;
  },
  // the case study: AEONA Mall 4 (planned right behind CADT!)
  client: {
    company: 'AEONA Mall 4 (behind CADT)',
    person: 'Mr. Sato',
    role: 'Project Manager',
    request: 'We are building AEONA Mall 4 right behind CADT! Weekends at our restaurant floor will have huge lines, so we want a smartphone app where visitors can join a waiting list and get called when their table is ready.'
  },
  // the 8 requirement categories gemini-decision-1 chooses from
  cats: [
    { key: 'goal',      en: 'Purpose & goals',      ja: '目的・ゴール',       c: '#FF4D6D', icon: 'i-target' },
    { key: 'users',     en: 'Users & adoption',     ja: 'ユーザー・利用障壁', c: '#2F7BFF', icon: 'i-users' },
    { key: 'features',  en: 'Features',             ja: '機能',               c: '#7C5CFF', icon: 'i-layers' },
    { key: 'ux',        en: 'Design & usability',   ja: '使いやすさ・言語',   c: '#FF8E3C', icon: 'i-eye' },
    { key: 'data',      en: 'Platform & data',      ja: '基盤・データ連携',   c: '#12B886', icon: 'i-network' },
    { key: 'quality',   en: 'Network & security',   ja: '通信・セキュリティ', c: '#E9A400', icon: 'i-shield' },
    { key: 'plan',      en: 'Budget & schedule',    ja: '予算・開発期間',     c: '#0EA5B7', icon: 'i-calendar' },
    { key: 'operation', en: 'Store operation',      ja: '店舗運用・管理',     c: '#E64980', icon: 'i-tool' }
  ],
  other: { key: 'other', en: 'Other / off-topic', ja: 'その他', c: '#8A93A6', icon: 'i-help' },

  // Expected Q&A set (c1..c5 = Critical questions that flip the entire architecture; o1..o10 = Other expected questions)
  expectedQuestions: [
    {
      id: 'c1', critical: true, cat: 'plan',
      qEn: 'What is the budget for this project?',
      qJa: '開発・運用に使える予算はどのくらいですか？',
      aEn: 'Very tight (~$4,000 left). Almost all budget went into mall construction—only a small restaurant promo fund remains.',
      aJa: 'ほぼない（残り約$4,000）。建設費とテナント誘致に大半を使っており、販促費の残りしか出せない。',
      impactEn: 'Native iOS + Android apps + shop tablets would blow the budget 10× over!',
      re: /\b(budget|cost|how much.*(money|spend|cost|pay)|funding|financial|expensive|price to build)\b|予算|費用|コスト|いくら/i
    },
    {
      id: 'c2', critical: true, cat: 'plan',
      qEn: 'How much development time do we have until launch?',
      qJa: 'オープンまで開発期間はどのくらいありますか？',
      aEn: 'Only 2 months until Grand Opening! Missing the first opening weekend is not an option.',
      aJa: 'グランドオープンまでたった2ヶ月！オープン初日の週末に間に合わないのは絶対NG。',
      impactEn: 'Building native apps + passing App Store / Google Play review in 2 months is way too risky!',
      re: /\b(deadline|when.*(launch|open|ready|need|start)|how (long|much time|many months|many weeks)|2 months|two months|schedule|timeline)\b|納期|期間|いつまで|何ヶ月|スケジュール/i
    },
    {
      id: 'c3', critical: true, cat: 'quality',
      qEn: 'How is the Wi-Fi and mobile signal at the new mall?',
      qJa: '現地のWi-Fiやスマホの電波状況はどうですか？',
      aEn: 'Not fast at opening! Mall Wi-Fi is planned, but opening crowds plus many smartphone-heavy university students nearby will congest the network.',
      aJa: 'オープン時はそこまで速くならない！Wi-Fiは入れる予定だが、オープン混雑に加えてスマホを多く使う大学生が近くにたくさんいるため通信が混み合う。',
      impactEn: 'Visitors cannot easily download a heavy 80–100 MB app in front of a restaurant!',
      re: /\b(wifi|wi-fi|internet|signal|network|offline|connection|4g|5g|bandwidth|slow.*net)\b|電波|通信|ネット|回線|オフライン/i
    },
    {
      id: 'c4', critical: true, cat: 'users',
      qEn: 'Will visitors use this app for other things (points, parking, coupons), or ONLY when waiting for a restaurant?',
      qJa: '順番待ち以外にも（ポイントやクーポン等で）普段使いするアプリですか？お客様の来店頻度は？',
      aEn: 'Waiting in line ONLY! Most guests are weekend families or first-time visitors who come occasionally—they won’t spend time on sign-up or setup.',
      aJa: '順番待ち専用です！週末にたまに来る家族連れや初来店のお客様が多く、面倒な登録や設定には時間をかけられません。',
      impactEn: 'Forcing occasional visitors to install & register a single-purpose app creates huge friction!',
      re: /\b(how often|frequency|regular|first.?time|other (feature|use|purpose)|coupon|point|parking|only.*wait|download|install|sign.?up|login|register|telegram|web.?app)\b|頻度|普段|ポイント|クーポン|専用|ダウンロード|登録/i
    },
    {
      id: 'c5', critical: true, cat: 'operation',
      qEn: 'How many restaurants will use it, and what devices will restaurant staff use?',
      qJa: '何店舗が使い、各店のスタッフは何の端末で管理しますか？',
      aEn: '~15 restaurants, using staff’s own smartphones (no budget for shop tablets). Each shop must only see its own queue, and seat questions differ by shop.',
      aJa: '約15店舗が参加。専用タブレット代はないためスタッフ個人のスマホで運用。他店の予約は見えず、聞く項目も店舗ごとに変えたい。',
      impactEn: 'Must run on staff’s own phones with strict per-shop separation & custom rules!',
      re: /\b(how many (restaurant|shop|store|tenant)|all restaurant|staff.*(device|phone|tablet|manage|use)|each (restaurant|shop|store)|admin)\b|何店舗|スタッフ|店員|端末|タブレット|管理画面/i
    },
    {
      id: 'o1', critical: false, cat: 'goal',
      qEn: 'What is the real business goal of reducing the line?',
      qJa: '行列をなくす本当の目的・ゴールは何ですか？',
      aEn: 'Free families from waiting chairs so they shop around the mall for 30 minutes instead of getting tired and going home.',
      aJa: '店の前のイスからお客様を解放し、待ち時間に館内の他ショップで買い物してもらうこと。',
      re: /\b(why.*want|main goal|business goal|real goal|purpose|measure success|kpi|what problem)\b|目的|ゴール|なぜ/i
    },
    {
      id: 'o2', critical: false, cat: 'ux',
      qEn: 'Which languages should it support?',
      qJa: '対応言語は何語が必要ですか？',
      aEn: 'Khmer first, plus English (with clear visual icons for everyone).',
      aJa: 'クメール語が最優先、加えて英語（誰にでも分かるアイコン付き）。',
      re: /\b(language|languages|khmer|english|japanese|chinese|translate)\b|言語|クメール語|英語|日本語/i
    },
    {
      id: 'o3', critical: false, cat: 'features',
      qEn: 'What guest details do restaurants need when someone joins the queue?',
      qJa: '順番待ち登録のときにお客様に何を聞きますか？',
      aEn: 'Varies by shop: Adults & Kids count, plus optional Table/Counter, Baby chair, or Stroller.',
      aJa: '店舗ごとに変えたい：大人・子供人数に加え、テーブル/カウンター希望、子供用イス、ベビーカー有無など。',
      re: /\b(baby chair|child|children|kid|stroller|table.*counter|seat.*prefer|how many (guest|people|person)|party size|what info)\b|人数|子供|テーブル|カウンター|座席|ベビーカー/i
    },
    {
      id: 'o4', critical: false, cat: 'features',
      qEn: 'How should guests be notified, and what if they don’t show up?',
      qJa: '呼び出し方法と、お客様が来なかった場合のルールは？',
      aEn: 'Send an instant phone notification when ready; hold the table for 10 minutes before cancelling.',
      aJa: '席が空き次第スマホへ通知。呼び出し後10分以内に店頭へ来なければキャンセル扱い。',
      re: /\b(no.?show|don't show|not come|late|how long.*(wait|hold)|10 min|miss.*turn|how.*(notify|call|alert))\b|通知|来ない|遅れ|何分|キャンセル/i
    },
    {
      id: 'o5', critical: false, cat: 'users',
      qEn: 'What about elderly visitors or people without smartphones?',
      qJa: 'スマホを持っていないお客様や高齢者はどうしますか？',
      aEn: 'Restaurant staff can register a walk-in guest manually and hand them a paper number slip.',
      aJa: '店頭スタッフが手動で番号発行し、紙の番号札を渡せる運用にする。',
      re: /\b(no smartphone|without.*phone|don't have.*phone|elderly|old people|senior|walk.?in|paper ticket)\b|高齢者|お年寄り|スマホ.*ない|紙/i
    },
    {
      id: 'o6', critical: false, cat: 'features',
      qEn: 'Do we need menu browsing, food pre-ordering, or KHQR payment?',
      qJa: '事前メニュー注文やKHQR決済機能も必要ですか？',
      aEn: 'No—keep Phase 1 simple! Waiting list & calling only; food ordering and payment stay at each restaurant.',
      aJa: '不要！フェーズ1は順番待ちと呼び出しのみに絞り、注文と会計は各店舗のままにする。',
      re: /\b(pre.?order|order food|menu|payment|pay|khqr|pos|credit card)\b|注文|メニュー|決済|支払い/i
    },
    {
      id: 'o7', critical: false, cat: 'operation',
      qEn: 'How many staff manage the entrance on busy weekends?',
      qJa: '週末の混雑時、店頭の受付スタッフは何人体制ですか？',
      aEn: '2–3 staff share entrance duty at peak hours—we must make sure they never accidentally call the same customer twice.',
      aJa: 'ピーク時は2〜3人で同時に店頭対応する。同じお客様を誤って2回呼び出さないようにしたい。',
      re: /\b(how many staff|multiple staff|same time|simultaneous|two staff|double|duplicate|conflict|entrance)\b|何人体制|複数.*スタッフ|同時|二重|重複/i
    },
    {
      id: 'o8', critical: false, cat: 'features',
      qEn: 'Can one visitor join many restaurant queues at the same time?',
      qJa: '1人のお客様が何店舗も同時に順番待ちできますか？',
      aEn: 'Limit to max 1–2 active queues per person so ghost bookings don’t disrupt the line.',
      aJa: '空予約による混乱を防ぐため、1人あたり同時に1〜2店舗までに制限する。',
      re: /\b(many queue|multiple (restaurant|queue|line)|book.*all|spam|fake booking|at once)\b|複数店舗.*並|掛け持ち|いたずら|空予約/i
    },
    {
      id: 'o9', critical: false, cat: 'quality',
      qEn: 'Do you want to collect customer phone numbers or member profiles?',
      qJa: 'お客様の電話番号や会員情報も集めたいですか？プライバシーは？',
      aEn: 'No personal info needed—just call guests by ticket number, and keep each restaurant’s customer list strictly private.',
      aJa: '電話番号や本名などの個人情報は不要。番号だけで呼び出し、他店舗からは一切見られないようにしたい。',
      re: /\b(privacy|personal data|phone number|real name|member|profile|other (shop|restaurant|store).*see|permission|security|leak)\b|個人情報|電話番号|会員|プライバシー|セキュリティ|他店/i
    },
    {
      id: 'o10', critical: false, cat: 'operation',
      qEn: 'Restaurant staff change often—how easily must new staff start or be removed?',
      qJa: 'アルバイトの入れ替わりが多いですが、引き継ぎや権限管理はどうしますか？',
      aEn: 'Turnover is high! New staff must be able to start in 1 minute without training, and managers must remove ex-staff right away.',
      aJa: '入れ替わりが激しい！新人でも研修なしで1分で使い始められ、退職者はすぐ権限を外せるようにしたい。',
      re: /\b(turnover|part.?time|new staff|training|maintain|maintenance|after launch|staff (leave|quit|change)|add.*staff|remove.*staff)\b|アルバイト|入れ替わり|引き継ぎ|新人|研修|保守|運用|退職|権限/i
    }
  ]
};

/* Live questions: shared settings for the deck, the phone form and the dashboard.
   The key below is Supabase's public "anon" key: it can only read the questions table
   and call the questions function (row-level security does the rest). */
window.LIVEQ = {
  url: 'https://odpexredcsyjynbexstj.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcGV4cmVkY3N5anluYmV4c3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDU3NDIsImV4cCI6MjExMDM4MTc0Mn0.mkyk8E9ih7VL8CksmlBZMsSeEkfXYNggHeZ2U56V0cA',
  fn: 'https://odpexredcsyjynbexstj.supabase.co/functions/v1/questions',
  // where the QR code sends phones (the published form)
  askUrl: 'https://tomy1031.github.io/japanese-it-pathway-talk/talk2-7j03sod5/ask/',
  // the talk's session; add ?s=test (to the deck or the form) for rehearsals
  defaultSession: 'live',
  session() {
    const s = new URLSearchParams(location.search).get('s') || '';
    return /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : this.defaultSession;
  },
  // the case
  client: {
    company: 'HONDO Motor',
    person: 'Mr. Sato',
    role: 'Product Manager',
    request: 'We want a smartphone app for people who ride our motorbikes in Cambodia. Make riding safer and more fun. We’d like to launch it next April.'
  },
  // the categories gemini-decision-1 chooses from (keys match the Edge Function)
  cats: [
    { key: 'goal',      en: 'Purpose & goals',     ja: '目的・ゴール',       c: '#FF4D6D', icon: 'i-target' },
    { key: 'users',     en: 'Users',               ja: 'ユーザー',           c: '#2F7BFF', icon: 'i-users' },
    { key: 'features',  en: 'Features',            ja: '機能',               c: '#7C5CFF', icon: 'i-layers' },
    { key: 'ux',        en: 'Design & usability',  ja: '使いやすさ',         c: '#FF8E3C', icon: 'i-eye' },
    { key: 'data',      en: 'Data & integration',  ja: 'データ・連携',       c: '#12B886', icon: 'i-network' },
    { key: 'quality',   en: 'Quality & security',  ja: '品質・セキュリティ', c: '#E9A400', icon: 'i-shield' },
    { key: 'plan',      en: 'Budget & schedule',   ja: '予算・スケジュール', c: '#0EA5B7', icon: 'i-calendar' },
    { key: 'operation', en: 'Operation & business', ja: '運用・ビジネス',    c: '#E64980', icon: 'i-tool' }
  ],
  other: { key: 'other', en: 'Other / off-topic', ja: 'その他', c: '#8A93A6', icon: 'i-help' }
};

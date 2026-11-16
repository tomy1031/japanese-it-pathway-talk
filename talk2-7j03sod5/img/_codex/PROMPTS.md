# 第2回スライド用イラスト — Codex への指示書

**Codex への渡し方（例）**

> `talk2-7j03sod5/img/_codex/PROMPTS.md` を読んで、そこに書かれた 12 枚の画像を、画像生成ツールで 1 枚ずつ作ってください。
> 参照画像は同じフォルダの `refs/` にあります。できあがった画像は `talk2-7j03sod5/img/` に、指定のファイル名（.png）で保存してください。

- 保存先: `talk2-7j03sod5/img/`（このフォルダの 1 つ上）。ファイル名は各見出しのとおり。PNG で OK（スライドに入れるときにこちらで JPG に変換・縮小します）。
- できあがったら、このブランチ `claude/presentation-2-slides-yw6xy2` に push するか、ファイルをこちらに渡してください。
- スライドには現在、同じ名前の仮画像（グレーの板に番号）が入っています。上書きして構いません。

---

## Instructions for Codex

Generate the 12 images below with your image generation tool, one image per section.
Save each one into the parent folder (`talk2-7j03sod5/img/`) under the file name in its heading
(PNG is fine). Look at the reference images in `refs/` before you start and keep the same look.

### Shared style (apply to every image)

- Bright, clean Japanese anime illustration in the style of a modern anime film key visual:
  soft cel shading, crisp line art, high-detail backgrounds, vivid blue sky, warm sunlight,
  cheerful and optimistic mood. Match `refs/ref_style_office.jpg` and `refs/ref_protagonist_a.jpg`.
- **No text, letters, numbers, logos or brand names anywhere in the image** (the slides add all text).
  Screens show abstract shapes, icons and code-like lines only. Speech bubbles stay empty.
- No real company logos, no real people, no flags.
- Leave some calm space on the side named in each prompt, because slide text sits there.

### Recurring characters

- **The protagonist** — the same young man in every image where he appears: Cambodian, early 20s,
  warm brown skin, wavy black hair, friendly face; blue chambray shirt with rolled sleeves over a
  white T-shirt, black trousers; at work he wears a navy lanyard with an ID card.
  See `refs/ref_protagonist_a.jpg`, `refs/ref_protagonist_b.jpg`, `refs/ref_protagonist_c.jpg`.
- **Mr. Sato, the client** — Japanese man in his 40s, short neat black hair, navy suit, white shirt,
  navy striped tie, kind but serious. He is the man on the right in
  `refs/ref_protagonist_and_client.jpg`.
- **AI agents** — friendly, translucent glowing-blue holographic figures and floating screens, like the
  hologram in `refs/ref_style_ai_hologram.jpg`. Helpful, never scary.

---

### 01 `hero2.png` — Title slide · landscape 16:9
The protagonist sits at a bright desk on a high floor of a modern Japanese office, with a big window
and a city skyline under a blue sky. Around his laptop, three small translucent blue AI agents work on
floating code screens by themselves. He is not looking at the code: he leans toward Mr. Sato across
the desk, listening closely and taking notes in a paper notebook, with an engaged smile.
Keep the left 40% of the image calmer (light sky / soft background) for the title text.

### 02 `ai2025.png` — "2025: AI was a helper" · square 1:1
The protagonist at a laptop late in the afternoon, leaning in and checking code line by line with a
magnifying glass. A small, simple AI helper icon floats beside the screen suggesting one line, like an
autocomplete pop-up. Printed code pages and sticky notes on the desk. He is focused and a bit tired.
Muted warm colours.

### 03 `ai2026.png` — "2026: AI agents do the work" · square 1:1
The same protagonist in the morning, standing relaxed with a coffee cup, directing like a team lead.
In front of him, a wall of floating screens where four or five blue holographic AI agents work in
parallel (writing code, running tests with green check marks, reviewing). He points at a simple plan
sketch on a whiteboard. Bright, energetic, wide-angle feel.

### 04 `grads.png` — "Even top graduates" · landscape 16:9
Graduation day outside a grand university building (no insignia, no recognisable campus). A diverse
group of international graduates in black gowns and caps. Some celebrate, while in the foreground two
or three graduates look thoughtfully at their phones, unsure about the job market. Calm, respectful,
hopeful-but-uncertain mood, golden afternoon light. Keep the right 40% calmer for text.

### 05 `knowhow.png` — "Know-how that can be written down can be copied" · square 1:1
An office worker in his 30s (not the protagonist; generic, no clear nationality) writes his work
know-how into a thick notebook. The pages lift off as glowing sheets and fly into a translucent blue AI
figure, which turns them into neat glowing cubes on a shelf. The worker pauses, looking slightly uneasy.
Thoughtful, neutral tone — not dark, not scary.

### 06 `ask.png` — "Good requirements start with good questions" · landscape 16:9
A bright meeting room in Japan. The protagonist sits across from Mr. Sato, asking a question with an
open, curious hand gesture and a notebook full of sketches. Soft floating question-mark bubbles rise
from the notebook and turn into small glowing light bulbs above the table. Mr. Sato looks pleased to be
asked. Keep the left 40% calmer for text.

### 07 `client.png` — The client's request · landscape 16:9
A modern motorbike showroom in Phnom Penh. Mr. Sato stands proudly with one hand on a shiny new scooter
(generic design, no logo). Through the large glass windows: a lively Phnom Penh street full of scooters
and a tuk-tuk, palm trees, warm tropical sunlight. Keep the right 40% calmer for text.

### 08 `manga.png` — "That's not what we imagined!" · landscape 16:9, three manga panels
A full-colour Japanese manga page with three panels side by side, clean black panel borders, light
screentone and speed lines, comedic expressions.
- Panel 1: the protagonist proudly shows a smartphone. Its screen shows a racing-style speedometer,
  a trophy ranking list and flames (icons only, no text). Sparkles around him.
- Panel 2: close-up of Mr. Sato frozen, one big sweat drop, blank eyes.
- Panel 3: Mr. Sato frowning and waving both hands in front of him; a large **empty** speech bubble
  above him; the protagonist in the corner with white shocked eyes and a sweat drop.

### 09 `rider.png` — Who really rides · landscape 16:9
Dusk in Phnom Penh, light rain, wet road reflecting city lights. A delivery rider in his 40s
(Cambodian, helmet, rain poncho, gloves) on a scooter with a large plain delivery box, a phone in a
handlebar mount. Busy traffic around him, tired but determined face. Cinematic, warm street lights
against blue dusk. Keep the left 40% calmer for text.

### 10 `phones.png` — Question time · square 1:1
University students in a bright lecture hall, typing on their smartphones, thinking, and discussing in
pairs. Some smile, one taps his chin thinking. On the big screen at the back: an abstract square pattern
(do not draw a readable QR code). Energetic, friendly classroom mood.

### 11 `security.png` — Security: someone must explain · landscape 16:9
A Japanese company's operations room. Several screens show red warning alerts and padlock icons
(no text). Worried Japanese managers stand around. In the centre, the protagonist stays calm and explains
with a tablet showing a simple diagram, and the managers lean in and nod. In the background, a blue
holographic AI shield blocks red arrows. Tense but hopeful. Keep the right 40% calmer for text.

### 12 `together.png` — Closing: trust and Japan Quality · landscape 16:9
A bright meeting room in Japan with a view of cherry blossoms. The protagonist presents a carefully
finished app prototype on a tablet to Mr. Sato and two Japanese team members. Small sticky notes and a
neat checklist on the table show care for details. Mr. Sato smiles and nods; everyone looks happy and
trusting. Warm spring light, petals outside. Keep the left 40% calmer for text.

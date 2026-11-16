"""Motion typography for the Japanese IT Pathway video, written as an ASS file for libass.

Look: clean white type with soft shadows on a dark bottom gradient (captions),
chapter openers with a number, a growing coral rule and a word-by-word rise,
statement cards that darken the picture and rise word by word, keyword tags in
rounded pills sliding in from the right, and a lower third for each student.
"""
from fontTools.ttLib import TTFont

W, H = 1920, 1080
EM = 1000 / 1652            # libass sizes this font by winAscent+winDescent (1652 units)

# colours as ASS &HBBGGRR&
WHITE, NAVY, CORAL, SUN, PALE = '&HFFFFFF&', '&H3D2114&', '&H6D4DFF&', '&H3CC2FF&', '&HA3E7FF&'
INK = '&H281A10&'           # very dark navy for plates and shadows

FONT = {'SemiBold': 'Plus Jakarta Sans SemiBold', 'Bold': 'Plus Jakarta Sans', 'ExtraBold': 'Plus Jakarta Sans ExtraBold'}
_TT = {}


def measure(text, size, weight='Bold', spacing=0):
    if weight not in _TT:
        _TT[weight] = TTFont(_TT_PATH[weight])
    f = _TT[weight]; cmap = f.getBestCmap(); hm = f['hmtx']
    units = sum(hm[cmap.get(ord(c), cmap[ord('n')])][0] for c in text)
    return units / 1000 * size * EM + spacing * len(text)


_TT_PATH = {}


def ts(x):
    x = max(0.0, x); h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h}:{m:02d}:{s:05.2f}'


def ms(x):
    return int(round(x * 1000))


def rrect(w, h, r):
    """Rounded rectangle path (ASS drawing), origin top-left."""
    k = r * 0.45
    return (f'm {r} 0 l {w - r} 0 b {w - k} 0 {w} {k} {w} {r} l {w} {h - r} b {w} {h - k} {w - k} {h} {w - r} {h} '
            f'l {r} {h} b {k} {h} 0 {h - k} 0 {h - r} l 0 {r} b 0 {k} {k} 0 {r} 0')


def rect(w, h):
    return f'm 0 0 l {w} 0 l {w} {h} l 0 {h}'


class Doc:
    def __init__(self, fonts_dir):
        for k, n in (('SemiBold', 'SemiBold'), ('Bold', 'Bold'), ('ExtraBold', 'ExtraBold')):
            _TT_PATH[k] = f'{fonts_dir}/PlusJakartaSans-{n}.ttf'
        self.ev = []

    def add(self, layer, a, b, text, style='Base'):
        self.ev.append(f'Dialogue: {layer},{ts(a)},{ts(b)},{style},,0,0,0,,{text}')

    # ---- primitives ----
    def shape(self, layer, a, b, x, y, path, colour, alpha, blur=0, fade=(300, 300), extra=''):
        self.add(layer, a, b, f'{{\\an7\\pos({x:.0f},{y:.0f})\\bord0\\shad0\\1c{colour}\\1a&H{alpha:02X}&\\blur{blur}\\fad({fade[0]},{fade[1]}){extra}\\p1}}{path}{{\\p0}}')

    def text(self, layer, a, b, x, y, txt, size, weight='Bold', colour=WHITE, an=7, spacing=0, alpha=0,
             shadow=True, fade=(350, 300), move=None, extra=''):
        sh = f'\\bord2.5\\3c{INK}\\3a&HA8&\\shad3\\4c{INK}\\4a&H78&\\blur3' if shadow else '\\bord0\\shad0\\blur0'
        pos = f'\\move({move[0]:.0f},{move[1]:.0f},{x:.0f},{y:.0f},0,{move[2]})' if move else f'\\pos({x:.0f},{y:.0f})'
        self.add(layer, a, b, f'{{\\an{an}{pos}\\fn{FONT[weight]}\\fs{size}\\fsp{spacing}\\1c{colour}\\1a&H{alpha:02X}&{sh}\\fad({fade[0]},{fade[1]}){extra}}}{txt}')

    # ---- components ----
    def caption(self, a, b, txt, colour=WHITE, size=76):
        # wraps naturally inside 1440 px; soft shadow over the bottom gradient
        self.add(9, a, b, f'{{\\an2\\fn{FONT["SemiBold"]}\\fs{size}\\1c{colour}\\bord3\\3c{INK}\\3a&H98&\\shad3\\4c{INK}\\4a&H50&\\blur3.5\\fad(140,140)\\q0}}{txt}', 'Cap')

    def chapter(self, a, b, num, kicker, title):
        x0, y0 = 116, 92
        tw_ = measure(title, 150, 'ExtraBold', -3)
        self.shape(2, a, b, 0, 0, rect(W, H), INK, 0x8C, fade=(400, 500))          # dim the whole picture a little
        self.shape(2, a, b, -160, -160, rect(max(1300, tw_ + 420), 600), INK, 0x40, blur=110, fade=(400, 500))
        self.text(4, a + 0.05, b, x0, y0, num, 62, 'ExtraBold', CORAL, an=7, fade=(250, 400), move=(x0, y0 + 22, 380))
        rx = x0 + measure(num, 62, 'ExtraBold') + 26
        ry = y0 + 34
        self.add(4, a + 0.2, b, f'{{\\an7\\pos({rx:.0f},{ry:.0f})\\bord0\\shad0\\1c{CORAL}\\fad(150,400)\\clip({rx:.0f},0,{rx:.0f},{H})'
                                f'\\t(0,450,\\clip({rx:.0f},0,{rx + 84:.0f},{H}))\\p1}}{rect(84, 6)}{{\\p0}}')
        self.text(4, a + 0.35, b, rx + 110, y0 + 12, kicker.upper(), 44, 'Bold', WHITE, spacing=8, alpha=0x10, fade=(300, 400),
                  move=(rx + 86, y0 + 12, 450))
        self.words(5, a + 0.5, b, x0 - 4, y0 + 86, title, 150, 'ExtraBold', spacing=-3, step=0.09)

    def words(self, layer, a, b, x, y, txt, size, weight, colour=WHITE, spacing=0, step=0.08, accent=(), centre=False):
        """Place each word as its own event so it can rise in on its own beat."""
        lines = txt.split('\\N')
        lh = size * EM * 1.18
        for li, line in enumerate(lines):
            ws = line.split(' ')
            space = measure(' ', size, weight, spacing)
            total = sum(measure(w_, size, weight, spacing) for w_ in ws) + space * (len(ws) - 1)
            cx = (W - total) / 2 if centre else x
            cy = y + li * lh
            for wi, w_ in enumerate(ws):
                k = li * 10 + wi
                col = CORAL if (li, wi) in accent or w_.strip('.,') in accent else colour
                self.text(layer, a + k * step if not centre else a + (sum(len(l.split(' ')) for l in lines[:li]) + wi) * step, b,
                          cx, cy, w_, size, weight, col, an=7, spacing=spacing, fade=(320, 350),
                          move=(cx, cy + size * 0.32, 520))
                cx += measure(w_, size, weight, spacing) + space

    def statement(self, a, b, txt, accent, size=150, kicker=None):
        # darken the picture, rise the words, a short coral rule above
        self.shape(2, a - 0.25, b, 0, 0, rect(W, H), INK, 0x3A, fade=(350, 350))
        lines = txt.split('\\N')
        lh = size * EM * 1.18
        top = H / 2 - lh * len(lines) / 2 + 10
        ry = top - 54 - (86 if kicker else 0)
        self.add(4, a, b, f'{{\\an7\\pos(930,{ry:.0f})\\bord0\\shad0\\1c{CORAL}\\fad(150,350)\\clip(960,0,960,{H})'
                          f'\\t(0,450,\\clip(930,0,990,{H}))\\p1}}{rect(60, 6)}{{\\p0}}')
        if kicker:
            kw = measure(kicker.upper(), 56, 'Bold', 11)
            self.text(4, a + 0.1, b, (W - kw) / 2, ry + 34, kicker.upper(), 56, 'Bold', SUN, spacing=11, fade=(300, 350),
                      move=((W - kw) / 2, ry + 50, 450))
        self.words(5, a + 0.15, b, 0, top, txt, size, 'ExtraBold', WHITE, spacing=-3, step=0.07, accent=accent, centre=True)

    def tags(self, a0, a1, b, items):
        """Keyword pills, stacked on the right, sliding in across the sentence."""
        size, padx, h = 60, 40, 104
        n = len(items)
        y = 290 if n <= 3 else 250
        for k, t in enumerate(items):
            tw_ = measure(t, size, 'Bold')
            w = tw_ + padx * 2 + 36
            x = W - 110 - w
            a = a0 + (a1 - a0) * k / max(1, n) * 0.85
            mv = f'\\move({x + 60:.0f},{y:.0f},{x:.0f},{y:.0f},0,420)'
            self.add(6, a, b, f'{{\\an7{mv}\\bord1\\3a&HFF&\\shad4\\4c{INK}\\4a&HA0&\\blur6\\1c{WHITE}\\1a&H08&\\fad(250,300)\\p1}}{rrect(w, h, h / 2)}{{\\p0}}')
            dot = 18
            self.add(7, a, b, f'{{\\an7\\move({x + 60 + padx:.0f},{y + h / 2 - dot / 2 + 6:.0f},{x + padx:.0f},{y + h / 2 - dot / 2 + 6:.0f},0,420)\\bord0\\shad0\\1c{CORAL}\\fad(250,300)\\p1}}{rrect(dot, dot, dot / 2)}{{\\p0}}')
            self.text(7, a, b, x + padx + 36, y + h / 2 + 1, t, size, 'Bold', NAVY, an=4, shadow=False, fade=(250, 300),
                      move=(x + padx + 96, y + h / 2 + 1, 420))
            y += h + 24

    def panel(self, a0, a1, b, header, items, mark='num'):
        """Dark glass panel on the right: a header, then numbered rows that arrive one by one."""
        size, row, pad = 60, 104, 50
        circ = 66
        tws = [measure(t, size, 'Bold') for t in items]
        hw = measure(header.upper(), 38, 'Bold', 7) if header else 0
        pw = max(max(tws) + circ + 30, hw) + pad * 2
        ph = pad + (66 if header else 0) + row * len(items) - (row - circ) + pad
        x = W - 104 - pw
        y = max(232, (H - ph) / 2 - 90)
        mv = lambda dx, yy, t=450: f'\\move({x + dx + 70:.0f},{yy:.0f},{x + dx:.0f},{yy:.0f},0,{t})'
        self.add(5, a0 - 0.1, b, f'{{\\an7{mv(0, y)}\\bord1\\3a&HFF&\\shad6\\4c{INK}\\4a&H90&\\blur12\\1c{INK}\\1a&H38&\\fad(300,350)\\p1}}{rrect(pw, ph, 30)}{{\\p0}}')
        yy = y + pad
        if header:
            self.add(6, a0, b, f'{{\\an7{mv(pad, yy)}\\fn{FONT["Bold"]}\\fs38\\fsp7\\1c{SUN}\\bord0\\shad0\\fad(300,350)}}{header.upper()}')
            yy += 66
        n = len(items)
        for k, t in enumerate(items):
            a = a0 + 0.25 + (a1 - a0 - 0.6) * k / max(1, n) * 0.92
            cy = yy + circ / 2
            self.add(6, a, b, f'{{\\an7{mv(pad, yy, 380)}\\bord0\\shad0\\1c{CORAL}\\fscx40\\fscy40\\t(0,320,\\fscx100\\fscy100)\\fad(200,350)\\p1}}{rrect(circ, circ, circ / 2)}{{\\p0}}')
            lab = f'{k + 1:02d}' if mark == 'num' else '✓'
            lw = measure(lab, 30, 'ExtraBold')
            self.add(7, a + 0.05, b, f'{{\\an4{mv(pad + circ / 2 - lw / 2, cy, 380)}\\fn{FONT["ExtraBold"]}\\fs30\\1c{WHITE}\\bord0\\shad0\\fad(200,350)}}{lab}')
            self.add(7, a + 0.08, b, f'{{\\an4{mv(pad + circ + 26, cy + 2, 420)}\\fn{FONT["Bold"]}\\fs{size}\\1c{WHITE}\\bord1\\3a&HFF&\\shad2\\4c{INK}\\4a&H90&\\blur2\\fad(260,350)}}{t}')
            yy += row

    def pair(self, a0, b, cards):
        """Two cards side by side with a plus between them (e.g. the two essential skills)."""
        cw, gap, size = 700, 130, 80
        inner = cw - 112
        def wrap(t):
            ws, lines, cur = t.split(' '), [], ''
            for w_ in ws:
                nxt = (cur + ' ' + w_).strip()
                if measure(nxt, size, 'ExtraBold', -2) <= inner or not cur: cur = nxt
                else: lines.append(cur); cur = w_
            return lines + [cur]
        wrapped = [wrap(t) for _, t in cards]
        nl = max(len(w) for w in wrapped)
        lh = size * EM * 1.16
        ch = 56 + 46 + 18 + lh * nl + 52
        x0 = (W - (cw * 2 + gap)) / 2
        y = 300
        for k, ((kick, _), lines) in enumerate(zip(cards, wrapped)):
            a = a0 + 0.2 + k * 0.9
            x = x0 + k * (cw + gap)
            self.add(5, a, b, f'{{\\an7\\move({x:.0f},{y + 40},{x:.0f},{y},0,450)\\bord1\\3a&HFF&\\shad8\\4c{INK}\\4a&H90&\\blur14\\1c{WHITE}\\1a&H06&\\fad(300,350)\\p1}}{rrect(cw, round(ch), 36)}{{\\p0}}')
            self.add(6, a + 0.1, b, f'{{\\an7\\move({x + 56:.0f},{y + 40 + 56},{x + 56:.0f},{y + 56},0,450)\\fn{FONT["Bold"]}\\fs40\\fsp8\\1c{CORAL}\\bord0\\shad0\\fad(300,350)}}{kick.upper()}')
            ty = y + 56 + 46 + 18
            self.add(6, a + 0.2, b, f'{{\\an7\\move({x + 54:.0f},{ty + 40:.0f},{x + 54:.0f},{ty:.0f},0,450)\\fn{FONT["ExtraBold"]}\\fs{size}\\fsp-2\\1c{NAVY}\\bord0\\shad0\\fad(300,350)}}' + '\\N'.join(lines))
        px = x0 + cw + gap / 2
        self.add(6, a0 + 0.9, b, f'{{\\an5\\pos({px:.0f},{y + ch / 2:.0f})\\fn{FONT["ExtraBold"]}\\fs160\\1c{SUN}\\bord1\\3a&HFF&\\shad3\\4c{INK}\\4a&H80&\\blur3\\fscx30\\fscy30\\t(0,300,\\fscx100\\fscy100)\\fad(200,350)}}+')

    def spotlight(self, a, b, kicker, lines, badge):
        """A dedicated moment for a name: dim, kicker, rule, the name word by word, then a badge."""
        self.shape(2, a - 0.25, b, 0, 0, rect(W, H), INK, 0x30, fade=(350, 350))
        self.shape(3, a - 0.25, b, W / 2 - 900, 120, rect(1800, 560), INK, 0x60, blur=120, fade=(350, 350))
        size = 118
        lh = size * EM * 1.18
        top = 300
        kw = measure(kicker.upper(), 44, 'Bold', 10)
        self.text(4, a, b, (W - kw) / 2, top - 120, kicker.upper(), 44, 'Bold', SUN, spacing=10, fade=(300, 350),
                  move=((W - kw) / 2, top - 104, 450))
        self.add(4, a + 0.1, b, f'{{\\an7\\pos({W / 2 - 50:.0f},{top - 52})\\bord0\\shad0\\1c{CORAL}\\fad(150,350)\\clip({W / 2:.0f},0,{W / 2:.0f},{H})\\t(0,450,\\clip({W / 2 - 50:.0f},0,{W / 2 + 50:.0f},{H}))\\p1}}{rect(100, 6)}{{\\p0}}')
        self.words(5, a + 0.3, b, 0, top, '\\N'.join(lines), size, 'ExtraBold', WHITE, spacing=-3, step=0.08, centre=True)
        bt = a + 0.3 + 0.08 * sum(len(l.split(' ')) for l in lines) + 0.25
        bw = measure(badge, 84, 'ExtraBold', 4) + 90
        by = top + lh * len(lines) + 34
        bx = (W - bw) / 2
        self.add(5, bt, b, f'{{\\an7\\pos({bx:.0f},{by:.0f})\\bord0\\shad0\\1c{SUN}\\fscx70\\fscy70\\t(0,350,\\fscx100\\fscy100)\\fad(250,350)\\p1}}{rrect(bw, 120, 60)}{{\\p0}}')
        self.add(6, bt + 0.05, b, f'{{\\an5\\pos({W / 2:.0f},{by + 62:.0f})\\fn{FONT["ExtraBold"]}\\fs84\\fsp4\\1c{NAVY}\\bord0\\shad0\\fscx70\\fscy70\\t(0,350,\\fscx100\\fscy100)\\fad(250,350)}}{badge}')

    def spotlight_logo(self, a, b, kicker, box):
        """Dim + kicker + rule; the logo image itself is laid on top later by ffmpeg inside `box` (x, y, w, h)."""
        x, y, w, h = box
        self.shape(2, a - 0.25, b, 0, 0, rect(W, H), INK, 0x2C, fade=(350, 350))
        self.shape(3, a - 0.25, b, W / 2 - 950, y - 220, rect(1900, h + 360), INK, 0x58, blur=130, fade=(350, 350))
        kw = measure(kicker.upper(), 46, 'Bold', 11)
        ky = y - 150
        self.text(4, a, b, (W - kw) / 2, ky, kicker.upper(), 46, 'Bold', SUN, spacing=11, fade=(300, 350), move=((W - kw) / 2, ky + 16, 450))
        self.add(4, a + 0.1, b, f'{{\\an7\\pos({W / 2 - 60:.0f},{ky + 70:.0f})\\bord0\\shad0\\1c{CORAL}\\fad(150,350)\\clip({W / 2:.0f},0,{W / 2:.0f},{H})\\t(0,450,\\clip({W / 2 - 60:.0f},0,{W / 2 + 60:.0f},{H}))\\p1}}{rect(120, 6)}{{\\p0}}')

    def lower_third(self, a, b, kicker, name):
        x0, y0 = 116, 104
        size = 92 if measure(name, 92, 'ExtraBold', -2) < 1400 else 74
        nw = measure(name, size, 'ExtraBold', -2)
        bar = 44 * EM * 1.3 + size * EM * 1.25 + 14
        self.shape(2, a, b, -160, -140, rect(max(1100, nw + 460), 480), INK, 0x50, blur=110, fade=(350, 450))
        self.add(4, a, b, f'{{\\an7\\pos({x0},{y0})\\bord0\\shad0\\1c{CORAL}\\fad(150,400)\\clip(0,{y0},{W},{y0})\\t(0,400,\\clip(0,{y0},{W},{y0 + bar:.0f}))\\p1}}{rect(9, round(bar))}{{\\p0}}')
        self.text(4, a + 0.15, b, x0 + 38, y0 + 2, kicker.upper(), 44, 'Bold', SUN, spacing=8, fade=(300, 400), move=(x0 + 18, y0 + 2, 420))
        self.text(5, a + 0.3, b, x0 + 34, y0 + 2 + 44 * EM * 1.3 + 4, name, size, 'ExtraBold', WHITE, spacing=-2, fade=(300, 400),
                  move=(x0 + 14, y0 + 2 + 44 * EM * 1.3 + 4, 450))

    def write(self, path):
        head = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'ScaledBorderAndShadow: yes',
                'WrapStyle: 0', 'YCbCr Matrix: TV.709', '', '[V4+ Styles]',
                'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
                f'Style: Base,{FONT["Bold"]},48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1',
                f'Style: Cap,{FONT["SemiBold"]},76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,0,2,2,200,200,70,1',
                '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
        open(path, 'w').write('\n'.join(head + self.ev) + '\n')

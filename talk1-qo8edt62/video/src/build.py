#!/usr/bin/env python3
"""Build the Japanese IT Pathway Program intro video (CADT).

  python3 build.py              # everything (shots -> scenes -> final mp4)
  python3 build.py --stills     # only a few test frames of the final look

Inputs live next to this file (src/): narration/seg/*.wav (Gemini 3.8 TTS, Charon),
music/*.mp3 (Pixabay), web/ (nextmake.site photos), cards/final.png, fonts/.
Raw clips and photos come from ~/Downloads/CADT JapaneseIT Pathway動画.
ffmpeg runs one process at a time (light on the Mac).
"""
import json, os, subprocess, sys, wave, array, math

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
VARIANT = os.environ.get('VARIANT', 'long')      # long | short
SHORT = VARIANT == 'short'
NARR = f'{ROOT}/short/narration' if SHORT else f'{SRC}/narration'
BUILD = f'{ROOT}/short/build' if SHORT else f'{SRC}/build'
FINAL = f'{SRC}/cards/final_short.png' if SHORT else f'{SRC}/cards/final.png'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
RAW = os.path.expanduser('~/Downloads/CADT JapaneseIT Pathway動画')
DECK = os.path.expanduser('~/Downloads/japanese-it-pathway-talk/img')
MPTC_TEXT = os.environ.get('MPTC') == 'text'     # spell the ministry out instead of showing its logo
OUT = f'{ROOT}/japanese-it-pathway-program' + ('_short' if SHORT else '') + ('_text-mptc' if MPTC_TEXT else '') + '.mp4'
FPS, W, H = 30, 1920, 1080
XF = 0.5          # crossfade between shots
GAP = 0.6         # pause between sentences
LEAD = 1.7        # scene title shows before the first sentence
TAIL = 0.9
SR = 48000

os.makedirs(f'{BUILD}/shots', exist_ok=True)
os.makedirs(f'{BUILD}/scenes', exist_ok=True)


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(args)[:600]); print(r.stderr[-2000:]); sys.exit(1)
    return r.stdout


def dur_of(path):
    return float(run([FP, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())


R = lambda f: f'{RAW}/{f}'
WB = lambda f: f'{SRC}/web/nm_{f}'
D = lambda f: f'{DECK}/{f}'
img = lambda p, kb='in': ('img', p, kb)
vid = lambda p, ss=0.0: ('vid', p, ss)

# ---------- speech clips (times in the ceremony recording) ----------
SPEECH = R('スピーチの音声のみ.mp3')
SPEECH_MOV = R('修了式スピーチ.mov')
SPK = json.load(open(f'{NARR}/speech_subs.json'))   # {spk1:{t0,t1,crop,gain,subs:[[a,b,en],..]}, spk2:{..}}

# ---------- the storyboard ----------
S = lambda key, shots, **o: dict(key=key, shots=shots, **o)
SCENES = [
    dict(id='s1', kicker='Japanese IT Pathway Program', title='Your Future', items=[
        S('s1_01', [vid(R('IMG_5018.MOV'), 2.0)]),
        S('s1_02', [vid(R('IMG_5004.MOV'), 0.5), img(R('photo_2026-06-18_10-28-10.jpg'), 'right')]),
        S('s1_03', [img(R('photo_2026-06-17_19-29-14.jpg'), 'in')]),
        S('s1_04', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'out')], card=('The opportunity', 'Japanese IT Pathway Program'), extra=0.8),
    ]),
    dict(id='s2', kicker='The program', title='What Is Japanese IT Pathway?', items=[
        S('s2_01', [vid(R('intern_program.mp4'), 0.0)]),
        S('s2_02', [vid(R('video_2026-10-16_12-42-43.mp4'), 5.0)], pair=[('Step 01', 'Learn Japanese'), ('Step 02', 'IT classes in Japanese')]),
        S('s2_03', [vid(R('IMG_5004.MOV'), 3.0), img(R('photo_2026-03-18_20-41-06.jpg'), 'in')],
          panel=('Along the way', ['Communication', 'Teamwork', 'Problem-solving', 'Professional habits'])),
        S('s2_04', [vid(R('video_2026-10-16_12-42-18.mp4'), 3.0)]),
        S('s2_05', [img(R('photo_2026-06-18_10-27-28.jpg'), 'left'), vid(R('video_2026-10-16_12-42-43.mp4'), 44.0)]),
    ]),
    dict(id='s3', kicker='Support', title='Supported by the Cambodian Government', items=[
        S('s3_01', [img(R('photo_2026-01-28_20-09-09.jpg'), 'in')]),
        S('s3_02', [vid(R('video_2026-10-16_12-42-43.mp4'), 18.0)], spotlight=('With financial support from', [], '@mptc')),
        S('s3_03', [img(R('photo_2026-06-18_10-27-35.jpg'), 'in')]),
        S('s3_04', [vid(R('video_2026-10-16_12-42-43.mp4'), 24.0), img(R('photo_2026-01-29_22-40-51.jpg'), 'in')]),
        S('s3_05', [vid(R('video_2026-10-16_12-42-18.mp4'), 12.0)]),
        S('s3_06', [img(R('photo_2026-01-29_22-39-15.jpg'), 'in')],
          emph='Your education is an investment\\Nin {c}the future of Cambodia.{w}', extra=1.0),
    ]),
    dict(id='s4', kicker='Your commitment', title='Your Opportunity, Your Commitment', items=[
        S('s4_01', [vid(R('IMG_5004.MOV'), 8.0)]),
        S('s4_02', [img(R('photo_2026-06-17_19-29-14.jpg'), 'out')], panel=('Working together', ['Your university', 'Your teachers', 'NEXT MAKE', 'The government'])),
        S('s4_03', [vid(R('video_2026-10-16_12-42-43.mp4'), 30.0)]),
        S('s4_04', [vid(R('video_2026-10-16_12-42-43.mp4'), 34.0)], emph='They cannot make\\N{c}the effort{w} for you.', extra=0.8),
        S('s4_05', [vid(R('IMG_5004.MOV'), 12.0)]),
        S('s4_06', [vid(R('video_2026-10-16_12-42-18.mp4'), 15.0)]),
        S('s4_07', [vid(R('IMG_5018.MOV'), 14.0)], panel=('What matters', ['Attend class', 'Ask questions', 'Keep learning']), mark='check'),
        S('s4_08', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'in')]),
        S('s4_09', [img(R('photo_2026-01-28_20-09-09.jpg'), 'out')], emph='What you do with it\\Nis {c}up to you.{w}', extra=1.0),
    ]),
    dict(id='s5', kicker='Student voices', title='CADT Student Voices', items=[
        S('s5_01', [vid(R('video_2026-10-16_12-42-43.mp4'), 64.0), img(R('photo_2026-01-29_22-39-18.jpg'), 'in')], extra=0.4),
        S('spk1', [('speech', 'spk1')], speech='spk1', extra=0.6),
        S('spk2', [('speech', 'spk2')], speech='spk2'),
    ]),
    dict(id='s6', kicker='Your journey', title='Your Journey Starts Here', items=[
        S('s6_01', [vid(R('IMG_5018.MOV'), 6.0), img(R('photo_2026-01-29_22-40-51.jpg'), 'out')]),
        S('s6_02', [vid(R('video_2026-10-16_13-42-40.mp4'), 0.0)]),
        S('s6_03', [vid(R('video_2026-10-16_12-42-18.mp4'), 8.0)]),
        S('s6_04', [img(R('photo_2026-01-29_22-39-15.jpg'), 'out')]),
        S('s6_05', [img(R('photo_2026-06-18_10-28-10.jpg'), 'out')]),
        S('s6_06', [img(R('photo_2026-03-18_20-41-06.jpg'), 'out')]),
        S('s6_07', [vid(R('IMG_5018.MOV'), 16.0), img(R('photo_2026-06-18_10-27-28.jpg'), 'in'), vid(R('video_2026-10-16_13-42-40.mp4'), 0.8)]),
        S('s6_08', [vid(R('video_2026-10-16_12-42-43.mp4'), 50.0)]),
        S('s6_09', [vid(R('video_2026-10-16_12-42-43.mp4'), 58.0)]),
        S('s6_10', [img(R('photo_2026-06-18_10-27-35.jpg'), 'out')]),
        S('s6_11', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'out')], emph='Your future begins with\\N{c}your commitment.{w}', extra=0.8),
        S('s6_12', [img(FINAL, 'slow')], nocap=True, hold=6.5),
    ]),
]

SCENES_SHORT = [
    dict(id='s1', kicker='Japanese IT Pathway Program', title='Your Future', items=[
        S('s1_01', [vid(R('IMG_5018.MOV'), 2.0)]),
        S('s1_02', [vid(R('IMG_5004.MOV'), 0.5), img(R('photo_2026-06-18_10-28-10.jpg'), 'right')]),
        S('s1_03', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'out')], card=('The opportunity', 'Japanese IT Pathway Program'), extra=0.8),
    ]),
    dict(id='s2', kicker='The program', title='What Is Japanese IT Pathway?', items=[
        S('s2_01', [vid(R('intern_program.mp4'), 0.0)]),
        S('s2_02', [vid(R('video_2026-10-16_12-42-43.mp4'), 5.0)], pair=[('Skill 01', 'Japanese communication'), ('Skill 02', 'Practical IT skills')], extra=0.6),
        S('s2_03', [vid(R('IMG_5004.MOV'), 3.0), img(R('photo_2026-03-18_20-41-06.jpg'), 'in')],
          panel=('They also learn', ['Professional communication', 'Teamwork', 'Problem-solving', 'Japanese workplace culture']), extra=0.6),
        S('s2_04', [img(R('photo_2026-06-18_10-27-28.jpg'), 'left'), vid(R('video_2026-10-16_12-42-43.mp4'), 44.0)]),
    ]),
    dict(id='s3', kicker='Support', title='Supported by the Cambodian Government', items=[
        S('s3_01', [img(R('photo_2026-01-28_20-09-09.jpg'), 'in')]),
        S('s3_02', [vid(R('video_2026-10-16_12-42-18.mp4'), 3.0)], emph='This opportunity did not\\Nhappen {c}by accident.{w}', extra=0.6),
        S('s3_03', [vid(R('video_2026-10-16_12-42-43.mp4'), 18.0), img(R('photo_2026-06-18_10-27-35.jpg'), 'in')],
          panel=("The government's hope", ['International experience', 'Stronger abilities', "Cambodia's future"]), extra=0.6),
        S('s3_04', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'in')],
          spotlight=('Supported & funded by', [], '@mptc'), extra=1.2),
        S('s3_05', [vid(R('video_2026-10-16_12-42-18.mp4'), 12.0)]),
        S('s3_06', [img(R('photo_2026-01-29_22-39-15.jpg'), 'in')], emph='The government believes\\Nin {c}your potential.{w}', extra=1.0),
    ]),
    dict(id='s4', kicker='Your commitment', title='Your Opportunity, Your Commitment', items=[
        S('s4_01', [vid(R('IMG_5004.MOV'), 8.0)]),
        S('s4_02', [img(R('photo_2026-06-17_19-29-14.jpg'), 'out')], panel=('Supporting your growth', ['Your teachers', 'Your university', 'NEXT MAKE', 'The government']), extra=0.6),
        S('s4_03', [vid(R('video_2026-10-16_12-42-43.mp4'), 30.0)]),
        S('s4_04', [vid(R('video_2026-10-16_12-42-43.mp4'), 34.0)], emph='Your own\\N{c}commitment.{w}', extra=1.0),
        S('s4_05', [vid(R('IMG_5004.MOV'), 12.0)]),
        S('s4_06', [vid(R('IMG_5018.MOV'), 14.0)], panel=('Every day', ['Attend your classes', 'Ask questions', 'Keep practicing']), mark='check', extra=0.6),
        S('s4_07', [img(R('photo_2026-01-28_20-09-09.jpg'), 'out')], emph='Every small effort brings you\\N{c}closer to your goals.{w}', extra=1.0),
    ]),
    dict(id='s5', kicker='Student voices', title='CADT Student Voices', items=[
        S('s5_00', [vid(R('video_2026-10-16_12-42-43.mp4'), 64.0)], silent=3.4, nocap=True),
        S('spk1', [('speech', 'spk1')], speech='spk1', extra=0.6),
        S('spk2', [('speech', 'spk2')], speech='spk2'),
    ]),
    dict(id='s6', kicker='Your journey', title='Your Journey Starts Here', items=[
        S('s6_01', [vid(R('IMG_5018.MOV'), 6.0), img(R('photo_2026-01-29_22-40-51.jpg'), 'out')]),
        S('s6_02', [img(R('photo_2026-06-18_10-28-10.jpg'), 'out')], panel=('Here to support you', ['The Cambodian government', 'Your university', 'NEXT MAKE']), extra=0.6),
        S('s6_03', [vid(R('video_2026-10-16_13-42-40.mp4'), 0.0)], emph='Now, the next step\\Nis {c}yours.{w}', extra=0.8),
        S('s6_04', [vid(R('video_2026-10-16_12-42-18.mp4'), 8.0)]),
        S('s6_05', [img(WB('2026_cambodia_celemony-scaled.jpg'), 'out')], emph='Your future starts with\\N{c}your commitment.{w}', extra=0.8),
        S('s6_06', [img(FINAL, 'slow')], nocap=True, hold=6.5),
    ]),
]
if SHORT:
    SCENES = SCENES_SHORT

# ---------- narration clips ----------
SEG = json.load(open(f'{NARR}/segments.json'))
TEXT = {s['key']: s['text'].replace('M P T C', 'MPTC').replace('Next Make', 'NEXT MAKE') for p in SEG.values() for s in p}


def audio_len(item):
    if item.get('speech'):
        sp = SPK[item['speech']]
        return sp['t1'] - sp['t0']
    if item.get('silent'):
        return item['silent']
    return dur_of(f'{NARR}/seg/{item["key"]}.wav')


# ---------- timeline ----------
t = 0.0
for sc in SCENES:
    sc['start'] = t
    t += LEAD
    for it in sc['items']:
        it['a0'] = t
        it['len'] = audio_len(it)
        it['a1'] = t + it['len']
        t = it['a1'] + GAP + it.get('extra', 0) + it.get('hold', 0)
    sc['end'] = t - GAP + TAIL
    t = sc['end']
TOTAL = SCENES[-1]['end']
print(f'total {TOTAL:.1f}s')

# shots: each item covers [a0 - GAP/2, a1 + GAP/2 + extra]; first/last of a scene stretch to the scene edges
for sc in SCENES:
    shots = []
    its = sc['items']
    for i, it in enumerate(its):
        s0 = sc['start'] if i == 0 else it['a0'] - GAP / 2
        s1 = sc['end'] if i == len(its) - 1 else its[i + 1]['a0'] - GAP / 2
        it['span'] = (s0, s1)
        n = len(it['shots'])
        for j, sh in enumerate(it['shots']):
            shots.append(dict(spec=sh, t0=s0 + (s1 - s0) * j / n, t1=s0 + (s1 - s0) * (j + 1) / n, item=it))
    sc['shots'] = shots


# ---------- render one shot ----------
def zoom_expr(kb, n):
    if kb == 'in':    return "1+0.10*on/%d" % n, "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if kb == 'out':   return "1.10-0.10*on/%d" % n, "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if kb == 'slow':  return "1+0.035*on/%d" % n, "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if kb == 'left':  return "1.10", "(iw-iw/zoom)*(1-on/%d)" % n, "ih/2-(ih/zoom/2)"
    if kb == 'right': return "1.10", "(iw-iw/zoom)*on/%d" % n, "ih/2-(ih/zoom/2)"


def render_shot(path, spec, d):
    if os.path.exists(path) and abs(dur_of(path) - d) < 0.05:
        return
    n = max(1, round(d * FPS))
    enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-an']
    kind = spec[0]
    if kind == 'img':
        z, x, y = zoom_expr(spec[2], n)
        vf = (f"scale=2880:1620:force_original_aspect_ratio=increase,crop=2880:1620,"
              f"zoompan=z='{z}':x='{x}':y='{y}':d=1:s={W}x{H}:fps={FPS},format=yuv420p")
        run([FF, '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', spec[1],
             '-vf', vf, '-frames:v', str(n)] + enc + [path])
    elif kind == 'vid':
        src, ss = spec[1], spec[2]
        info = run([FP, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).strip().split(',')
        vw, vh = int(info[0]), int(info[1])
        tail = f"fps={FPS},tpad=stop_mode=clone:stop_duration={d:.2f},format=yuv420p"
        if vh > vw:  # vertical clip: sharp clip on a blurred copy of itself
            fc = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:6,eq=brightness=-0.06[bg];"
                  f"[0:v]scale=-2:1000[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{tail}[v]")
            run([FF, '-v', 'error', '-y', '-ss', f'{ss}', '-i', src, '-filter_complex', fc, '-map', '[v]', '-frames:v', str(n)] + enc + [path])
        else:
            vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},{tail}"
            run([FF, '-v', 'error', '-y', '-ss', f'{ss}', '-i', src, '-vf', vf, '-frames:v', str(n)] + enc + [path])
    elif kind == 'speech':
        sp = SPK[spec[1]]
        cx, cy, cw = sp['crop']           # crop centre and width in the 1920x1080 recording
        ch = cw * 9 // 16
        vf = f"crop={cw}:{ch}:{cx - cw // 2}:{cy - ch // 2},scale={W}:{H},fps={FPS},tpad=stop_mode=clone:stop_duration={d:.2f},format=yuv420p"
        run([FF, '-v', 'error', '-y', '-ss', f'{max(0, sp["t0"] - sp.get("pre", 0)):.3f}', '-i', SPEECH_MOV, '-vf', vf, '-frames:v', str(n)] + enc + [path])


def build_scene(sc):
    out = f"{BUILD}/scenes/{sc['id']}.mp4"
    files = []
    for k, sh in enumerate(sc['shots']):
        first, last = k == 0, k == len(sc['shots']) - 1
        a = sh['t0'] - (0 if first else XF / 2)
        b = sh['t1'] + (0 if last else XF / 2)
        sh['d'] = b - a
        spec = sh['spec']
        if spec[0] == 'speech':   # the picture starts this much before the student starts speaking
            SPK[spec[1]]['pre'] = sh['item']['a0'] - a
        p = f"{BUILD}/shots/{sc['id']}_{k:02d}.mp4"
        render_shot(p, spec, sh['d'])
        files.append(p)
        print(f"  shot {sc['id']}_{k:02d} {spec[0]:6} {sh['d']:5.2f}s  {os.path.basename(str(spec[1]))[:40]}")
    # crossfade chain
    if len(files) == 1:
        fc = '[0:v]null[v0]'
        last = 'v0'
    else:
        parts, prev = [], '0:v'
        for k in range(1, len(files)):
            off = sc['shots'][k]['t0'] - sc['start'] - XF / 2
            parts.append(f'[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{k}]')
            prev = f'x{k}'
        fc, last = ';'.join(parts), prev
    L = sc['end'] - sc['start']
    fc += f';[{last}]fade=t=in:st=0:d=0.35,fade=t=out:st={L - 0.35:.3f}:d=0.35,trim=duration={L:.3f},setpts=PTS-STARTPTS[out]'
    args = [FF, '-v', 'error', '-y']
    for f in files:
        args += ['-i', f]
    run(args + ['-filter_complex', fc, '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', str(FPS), out])
    got = dur_of(out)
    print(f"scene {sc['id']}: {L:.2f}s (rendered {got:.2f}s)")
    return out


# ---------- voice track ----------
def read_mono(path):
    with wave.open(path) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        return array.array('h', w.readframes(w.getnframes()))


def build_voice():
    buf = array.array('h', bytes(2 * int((TOTAL + 1) * SR)))
    def place(samples, at):
        o = int(at * SR)
        for i, v in enumerate(samples):
            s = buf[o + i] + v
            buf[o + i] = 32767 if s > 32767 else (-32768 if s < -32768 else s)
    for sc in SCENES:
        for it in sc['items']:
            if it.get('silent'):
                continue
            if it.get('speech'):
                sp = SPK[it['speech']]
                p = f"{BUILD}/{it['speech']}.wav"
                run([FF, '-v', 'error', '-y', '-ss', f"{sp['t0']}", '-t', f"{sp['t1'] - sp['t0']:.3f}", '-i', SPEECH,
                     '-af', f"highpass=f=80,afftdn=nf=-25,volume={sp['gain']}dB,afade=t=in:d=0.25,afade=t=out:st={sp['t1'] - sp['t0'] - 0.4:.3f}:d=0.4",
                     '-ac', '1', '-ar', str(SR), '-sample_fmt', 's16', p])
                place(read_mono(p), it['a0'])
            else:
                p = f"{BUILD}/n_{it['key']}.wav"
                run([FF, '-v', 'error', '-y', '-i', f"{NARR}/seg/{it['key']}.wav", '-af', 'volume=1.4dB', '-ac', '1', '-ar', str(SR), '-sample_fmt', 's16', p])
                place(read_mono(p), it['a0'])
    with wave.open(f'{BUILD}/voice.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(buf.tobytes())


# ---------- subtitles / titles (ASS) ----------
NAVY, CORAL, WHITE, YEL = '&H3D2114&', '&H6D4DFF&', '&HFFFFFF&', '&HA3E6FF&'


def ts(x):
    x = max(0, x); h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h}:{m:02d}:{s:05.2f}'


from fontTools.ttLib import TTFont
_FONTS = {w: TTFont(f'{SRC}/fonts/PlusJakartaSans-{w}.ttf') for w in ('SemiBold', 'Bold', 'ExtraBold')}
EM = 1000 / 1652          # em size per ASS font-size unit for this font


def tw(text, size, weight='Bold'):
    f = _FONTS[weight]; cmap = f.getBestCmap(); hm = f['hmtx']
    units = sum(hm[cmap.get(ord(c), cmap[ord('n')])][0] for c in text)
    return units / 1000 * size * EM


def parse_accent(txt):
    """'Your future\\Nin {c}the future{w}.' -> plain text with \\N, and the (line, word) pairs to colour."""
    plain, acc = [], set()
    for li, line in enumerate(txt.split('\\N')):
        on, words = False, []
        for wi, w_ in enumerate(line.split(' ')):
            if '{c}' in w_: on = True
            clean = w_.replace('{c}', '').replace('{w}', '')
            if on: acc.add((li, wi))
            if '{w}' in w_: on = False
            words.append(clean)
        plain.append(' '.join(words))
    return '\\N'.join(plain), acc


OVERLAYS = []   # timed images laid over the finished picture (x, y, w, h, t0, t1)


def ass():
    from titles import Doc, PALE
    OVERLAYS.clear()
    d = Doc(f'{SRC}/fonts')
    for n, sc in enumerate(SCENES, 1):
        d.chapter(sc['start'] + 0.25, sc['start'] + LEAD + 2.6, f'{n:02d}', sc['kicker'], sc['title'])
        for it in sc['items']:
            s0, s1 = it['span']
            if it.get('speech'):
                sp = SPK[it['speech']]
                for x0, x1, en in sp['subs']:
                    d.caption(it['a0'] + x0 - sp['t0'], it['a0'] + x1 - sp['t0'] + 0.15, en, colour=PALE)
                kb, nm = sp['lower']
                la = max(it['a0'] + 0.6, sc['start'] + LEAD + 2.6 + 0.3)
                d.lower_third(la, la + 5.9, kb, nm)
                continue
            if it.get('silent'):
                continue
            if it.get('emph'):
                txt, acc = parse_accent(it['emph'])
                d.statement(it['a0'] - 0.1, s1, txt, acc)
                continue
            if it.get('card'):
                kk, big = it['card']
                d.statement(it['a0'] - 0.1, s1, big, set(), size=128, kicker=kk)
                continue
            if not it.get('nocap'):
                from titles import measure
                big = measure(TEXT[it['key']], 76, 'SemiBold') > 2 * 1470
                d.caption(it['a0'] - 0.05, it['a1'] + 0.25, TEXT[it['key']], size=66 if big else 76)
            if it.get('chips'):
                d.tags(it['a0'], it['a1'], s1 - 0.1, it['chips'])
            if it.get('panel'):
                hd, rows = it['panel']
                d.panel(it['a0'], it['a1'], s1 - 0.1, hd, rows, mark='check' if it.get('mark') == 'check' else 'num')
            if it.get('pair'):
                d.pair(it['a0'], s1 - 0.1, it['pair'])
            if it.get('spotlight'):
                kk, lines, badge = it['spotlight']
                if badge == '@mptc' and MPTC_TEXT:
                    d.spotlight(it['a0'], s1 - 0.1, kk, ['Ministry of Post and', 'Telecommunications'], 'MPTC')
                elif badge == '@mptc':
                    lw = 1440; lh = round(lw * 388 / 2012); box = ((W - lw) / 2, 380, lw, lh)
                    d.spotlight_logo(it['a0'], s1 - 0.1, kk, box)
                    OVERLAYS.append(dict(png=f'{SRC}/cards/mptc_logo.png', box=box, t0=it['a0'] + 0.45, t1=s1 - 0.1))
                else:
                    d.spotlight(it['a0'], s1 - 0.1, kk, lines, badge)
            if it.get('lower'):
                kb, nm = it['lower']
                d.lower_third(it['a0'] + 0.3, s1 - 0.2, kb, nm)
    p = f'{BUILD}/titles.ass'
    d.write(p)
    return p


MUSIC = f'{SRC}/music/nastelbom-corporate-corporate-music-602439.mp3'
PIANO = f'{SRC}/music/alex-morgan-calm-piano-541028.mp3'   # --piano: the last part uses this instead


def music_bed():
    """The track is 2:00, so play it twice (2 s crossfade) to cover the whole video."""
    p = f'{BUILD}/music_bed.wav'
    run([FF, '-v', 'error', '-y', '-i', MUSIC, '-i', MUSIC, '-filter_complex', '[0:a][1:a]acrossfade=d=2:c1=tri:c2=tri[a]',
         '-map', '[a]', '-ar', str(SR), '-ac', '2', p])
    return p


def final_mix(video, subs, out=OUT, ending=None):
    """Three light steps (audio and video never share one filter graph, so nothing can stall):
    1. music track  2. music ducked under the voices + loudness  3. video + subtitles + finished audio."""
    s5 = next(s for s in SCENES if s['id'] == 's5')
    s6 = next(s for s in SCENES if s['id'] == 's6')
    spk1 = next(i for i in s5['items'] if i.get('speech') == 'spk1')
    m1 = spk1['a0'] - 0.3                    # music 1: from the start until the first student speaks
    m2s = s6['start'] - 0.5                   # music 2: the last part of the track, ending with the video
    m2 = TOTAL - m2s
    bed = music_bed()
    end_src = ending or bed
    mdur = dur_of(end_src)
    tag = 'piano' if ending else 'main'
    mus = f'{BUILD}/music_{tag}.wav'
    run([FF, '-v', 'error', '-y', '-i', bed, '-i', end_src, '-filter_complex',
         f"[0:a]atrim=0:{m1:.2f},asetpts=PTS-STARTPTS,afade=t=in:d=1.0,afade=t=out:st={m1 - 4:.2f}:d=4,volume=0.40[m1];"
         f"[1:a]aresample={SR},aformat=channel_layouts=stereo,atrim=start={max(0, mdur - m2):.2f},asetpts=PTS-STARTPTS,"
         f"afade=t=in:d=2.5,afade=t=out:st={m2 - 3:.2f}:d=3,volume=0.40,adelay={int(m2s * 1000)}|{int(m2s * 1000)}[m2];"
         f"[m1][m2]amix=inputs=2:normalize=0:duration=longest,apad=whole_dur={TOTAL:.3f},atrim=0:{TOTAL:.3f}[a]",
         '-map', '[a]', '-ar', str(SR), '-ac', '2', mus])
    mix = f'{BUILD}/mix_{tag}.wav'
    run([FF, '-v', 'error', '-y', '-i', mus, '-i', f'{BUILD}/voice.wav', '-filter_complex',
         f"[1:a]aformat=channel_layouts=stereo,atrim=0:{TOTAL:.3f},asplit=2[v1][v2];"
         f"[0:a][v1]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=450:makeup=1[duck];"
         f"[duck][v2]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]",
         '-map', '[a]', '-ar', str(SR), '-ac', '2', mix])
    endcard = s6['items'][-1]['span'][0] + 0.2
    on = f"enable='lt(t,{endcard:.2f})'"
    vf = (f"[0:v]eq=contrast=1.05:saturation=1.10:gamma=0.99:{on},vignette=angle=PI/5:{on}[g];"
          f"[g][1:v]overlay=0:0:{on}[g2];[g2][2:v]overlay=W-w-96:66:{on}[g3];"
          f"[g3]subtitles='{subs}':fontsdir='{SRC}/fonts'[t0]")
    extra_in = []
    last = 't0'
    for k, o in enumerate(OVERLAYS):
        x, y, w, h = o['box']; t0, t1 = o['t0'], o['t1']; n = 4 + k
        extra_in += ['-loop', '1', '-t', f'{TOTAL:.3f}', '-i', o['png']]
        vf += (f";[{n}:v]scale={w}:-1:flags=lanczos,format=rgba,fade=t=in:st={t0:.2f}:d=0.5:alpha=1,fade=t=out:st={t1 - 0.4:.2f}:d=0.4:alpha=1[o{k}]"
               f";[{last}][o{k}]overlay=x={x:.0f}:y='{y:.0f}+36*max(0\\,1-(t-{t0:.2f})/0.6)':eval=frame:enable='between(t,{t0:.2f},{t1:.2f})'[t{k + 1}]")
        last = f't{k + 1}'
    vf += f';[{last}]null[v]'
    run([FF, '-v', 'error', '-y', '-i', video,
         '-loop', '1', '-t', f'{TOTAL:.3f}', '-i', f'{SRC}/cards/bottom_grad.png',
         '-loop', '1', '-t', f'{TOTAL:.3f}', '-i', f'{SRC}/cards/logo_white.png',
         '-i', mix] + extra_in + ['-filter_complex', vf, '-map', '[v]', '-map', '3:a', '-t', f'{TOTAL:.3f}',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-tune', 'film', '-pix_fmt', 'yuv420p', '-r', str(FPS),
         '-c:a', 'aac', '-b:a', '192k', '-ar', str(SR), '-movflags', '+faststart', out])


if __name__ == '__main__':
    subs = ass()
    json.dump([dict(id=s['id'], start=s['start'], end=s['end'], items=[dict(key=i['key'], a0=round(i['a0'], 2), a1=round(i['a1'], 2)) for i in s['items']]) for s in SCENES],
              open(f'{BUILD}/timeline.json', 'w'), indent=1)
    if '--plan' in sys.argv:
        for s in SCENES:
            print(f"{s['id']} {s['start']:6.1f}-{s['end']:6.1f}  shots={len(s['shots'])}")
        sys.exit(0)
    if '--remix' in sys.argv:   # reuse build/video.mp4; rebuild the voice track, titles, music and mix
        build_voice()
        out = OUT.replace('.mp4', '_piano-ending.mp4') if '--piano' in sys.argv else OUT
        final_mix(f'{BUILD}/video.mp4', subs, out, PIANO if '--piano' in sys.argv else None)
        print('done', out, f'{dur_of(out):.2f}s'); sys.exit(0)
    scenes = [build_scene(sc) for sc in SCENES]
    open(f'{BUILD}/scenes.txt', 'w').write(''.join(f"file '{p}'\n" for p in scenes))
    run([FF, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{BUILD}/scenes.txt', '-c', 'copy', f'{BUILD}/video.mp4'])
    build_voice()
    final_mix(f'{BUILD}/video.mp4', subs)
    print('done', OUT, f'{dur_of(OUT):.2f}s')

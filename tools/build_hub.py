#!/usr/bin/env python3
"""Encrypt private/hub.html into the root index.html.

The root page shows a plain "not found" message. Only a link that carries the
key in its # part (…/#k=<key>) can decrypt and show the hub. Browsers never
send the # part to the server, so GitHub Pages only ever sees ciphertext.

  python3 tools/build_hub.py            # uses private/hub.key (creates it once)
  HUB_KEY=<key> python3 tools/build_hub.py

Prints the hub link at the end.
"""
import base64, os, pathlib, secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRIV = ROOT / 'private'
SITE = 'https://tomy1031.github.io/japanese-it-pathway-talk/'

b64u = lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')
def unb64u(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))

key_file = PRIV / 'hub.key'
key_s = os.environ.get('HUB_KEY') or (key_file.read_text().strip() if key_file.exists() else '')
if not key_s:
    key_s = b64u(secrets.token_bytes(32))
    PRIV.mkdir(exist_ok=True)
    key_file.write_text(key_s + '\n')
key = unb64u(key_s)

plain = (PRIV / 'hub.html').read_bytes()
iv = secrets.token_bytes(12)
ct = AESGCM(key).encrypt(iv, plain, None)

tpl = (ROOT / 'tools' / 'gate.html').read_text()
page = tpl.replace('__IV__', base64.b64encode(iv).decode()).replace('__CT__', base64.b64encode(ct).decode())
(ROOT / 'index.html').write_text(page)
(ROOT / '404.html').write_text((ROOT / 'tools' / 'notfound.html').read_text())
print('wrote index.html and 404.html')
print('hub link:', SITE + '#k=' + key_s)

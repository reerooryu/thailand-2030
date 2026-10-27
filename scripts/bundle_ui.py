#!/usr/bin/env python3
"""Inline engine + app + css into one self-contained HTML file."""
import os, re
U = 'ui'
html = open(os.path.join(U,'index.html')).read()
css  = open(os.path.join(U,'style.css')).read()
eng  = open(os.path.join(U,'engine.js')).read()
app  = open(os.path.join(U,'app.js')).read()

# resolve the app's import of ./engine.js by concatenating: strip the import,
# and expose the engine's exports as locals.
# engine.js is an IIFE exposing globalThis.ENGINE; app.js (bundled from ui/src/)
# destructures it in ui/src/core.js

html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')
html = html.replace('<script src="engine.js"></script>\n<script type="module" src="app.js"></script>',
                    f'<script>\n{eng}\n</script>\n<script type="module">\n{app}\n</script>')
# Inline the campaign song as a data URI so the single file really is single.
# The mp3 is a third-party recording and is deliberately NOT in the repository
# (see .gitignore), so a clean checkout has to build without it: drop the audio
# element, and the player falls through to streaming the rights holder's own
# upload instead. If that will not load either, the transport hides itself.
import base64
song = os.path.join(U, 'assets', 'anthem.mp3')
if os.path.exists(song):
    mp3 = base64.b64encode(open(song, 'rb').read()).decode()
    html = html.replace('src="assets/anthem.mp3"', 'src="data:audio/mpeg;base64,%s"' % mp3)
else:
    html = re.sub(r'<audio id="anthem".*?</audio>', '', html, flags=re.S)
    print('note: ui/assets/anthem.mp3 absent — the build will stream the song instead')

# The title-screen photograph, optional for the same reason as the song: a news
# photo is not ours to redistribute (see .gitignore). Inlined when present;
# without it the title screen draws the flag in CSS instead.
for name, mime in (('home.webp', 'image/webp'), ('home.jpg', 'image/jpeg')):
    pic = os.path.join(U, 'assets', name)
    if os.path.exists(pic):
        b64 = base64.b64encode(open(pic, 'rb').read()).decode()
        html = html.replace('<div id="home" hidden></div>',
                            '<script>window.HOME_BG = "data:%s;base64,%s";</script>\n<div id="home" hidden></div>' % (mime, b64))
        break
else:
    html = html.replace('<div id="home" hidden></div>',
                        '<script>window.HOME_BG = "";</script>\n<div id="home" hidden></div>')

# --- guard: the engine bundle's global name must match what the app destructures.
# esbuild's --global-name is passed on the command line, so nothing connects it
# to app.js except convention, and a mismatch fails SILENTLY at bundle time and
# then throws "X is not defined" on load — a completely black page. That is
# exactly how this shipped once. Check it here, where it is cheap.
want = re.search(r'^\s*(?:const|let|var)\s*\{[^}]*\}\s*=\s*([A-Za-z_$][\w$]*)\s*;', app, re.M)
if not want:
    raise SystemExit('BUILD ABORTED: no `{ ... } = ENGINE` destructure found in ui/app.js')
if want:
    name = want.group(1)
    if not re.search(r'\bvar\s+%s\s*=' % re.escape(name), eng):
        got = re.search(r'\bvar\s+([A-Za-z_$][\w$]*)\s*=\s*\(\(\)\s*=>', eng)
        raise SystemExit(
            'BUILD ABORTED: app.js expects the engine bundle to expose `%s`, but '
            'engine.js exposes `%s`.\nFix the --global-name flag in build.sh.'
            % (name, got.group(1) if got else 'nothing recognisable'))

out = os.path.join(U, 'thailand-2030.html')
open(out,'w').write(html)
print('%s  %.0f KB' % (out, os.path.getsize(out)/1024))

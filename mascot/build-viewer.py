"""Bundle character.js + index.html into one self-contained file (gopi-viewer.html) and the artifact variant.
Usage: python3 build-viewer.py [artifact_out_path]"""
import re, sys
ch = re.sub(r"^import .*?;\n", "", open('character.js').read(), flags=re.M).replace("export ", "")
h = open('index.html').read()
style = re.search(r"<style>(.*?)</style>", h, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)<script type="importmap">', h, re.S).group(1)
body = re.sub(r'\s*<h2>Export</h2>.*?</div>\s*</div>\s*(?=<div id="hint">)', '\n</div>\n', body, flags=re.S)
mod = re.search(r'<script type="module">(.*?)</script>', h, re.S).group(1)
mod = re.sub(r"^import .*?;\n", "", mod, flags=re.M)
a, b = mod.index("// export"), mod.index("// loop")
mod = mod[:a] + mod[b:]
head = """import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
"""
style = style.replace("html,body { margin:0; height:100%; background:var(--bg);", "html,body { margin:0; height:100%; background:#0b0d26;")
imap = '''<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
<script type="module">
''' + head + ch + "\n" + mod + "\n</script>\n"
art = f"<title>Gopi 3D Mascot</title>\n<style>:root{{color-scheme:dark}}{style}</style>\n{body}\n{imap}"
open('gopi-viewer.html', 'w').write(f'<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n{art}</html>\n')
if len(sys.argv) > 1:
    open(sys.argv[1], 'w').write(art)

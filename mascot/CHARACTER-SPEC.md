# Gopi – 3D Character Spec (v1)

Single source of truth für die Figur in allen Videos: `character.js` (Geometrie, Rig, Animationen) + `gopi.glb` (Export).

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Viewer: Ansichten, Animationen, Hintergründe, PNG-/GLB-Export. Per statischem Server öffnen (`python3 -m http.server`), nicht per `file://` (ES-Module). |
| `character.js` | Prozedurales Modell. Ändern = Figur ändern, danach GLB neu exportieren. |
| `gopi.glb` | Import in Blender, Unreal, Unity, After Effects (Element 3D), Cinema 4D, CapCut/DaVinci-3D-Pipelines. Enthält Hierarchie, Materialien, Clips `Idle`, `Walk`, `Hop`. |
| `preview-3q.png` | Referenz-Render. |

## Farben (verbindlich)
| Rolle | Hex |
|---|---|
| Fell Basis / Mitte / Spitze | `#0c0e2c` / `#15173f` / `#2a2d6b` |
| Gelb (Glyphen, Füße, Ohr innen) | `#ffc61a` / Ohr innen `#ffcf33` |
| Augen | Creme `#fff0c8`, Pupille `#07070d` |
| Nase / Lächeln | `#ffe2ae` |
| Rim-Licht (Midnight-Szene) | `#ffae1a` |

## Proportionen (Einheiten = Szene-Meter, Höhe ca. 1,6)
- Körper: Ellipsoid 1,12 × 0,92 × 1,0, Zentrum (-0.05, 0.56, 0)
- Kopf: Ellipsoid 1,1 × 1,0 × 1,0, Zentrum (0.34, 1.02, 0), Schnauze leicht verjüngt
- Augen: je eines pro Seite, flach, groß (0,47 × 0,56), Pupille unten hinten, weißer Glanzpunkt
- Ohren: 2, Teardrop, innen gelb, ca. 0,66 hoch
- Mähne: 4 flache Fellfladen im Nacken
- Schwanz: Pom-Pom, Radius 0,2
- Beine: 4 Stummel mit flachen, gelben Ovalfüßen
- Glyphen: 4 pro Seite, gelbe gerundete „E/U"-Kamm-Form (2 Zinken Stirn, 3 Zinken Körper), leicht schräg

## Rig (Knotennamen, eindeutig)
`Gopi_Root` > `Body` (+ Glyphs), `Head` (EarL/R, EyeL/R > PupilL/R, Nose, SmileL/R, Mane1-4, Glyph_Forehead), `Tail`, `LegFL/FR/BL/BR` (Pivot an der Hüfte).
Keine Skin-Weights: Teile sind starr, Bewegung über Gelenk-Gruppen. Für Gesichtsausdrücke Augen-Scale (Blinzeln) und Pupillen-Position nutzen.

## Fell
Im Viewer: Shell-Fur-Shader (20 Schichten, Rim-Licht). Im GLB: **nur Basis-Mesh** mit Sheen-Material (glTF kennt keine Shells). Für Fell im Render:
- Blender: Hair-Particles bzw. Geometry-Nodes-Fell auf `*_Fur_Mesh`, Farbverlauf Basis → Spitze aus der Tabelle oben.
- Echtzeit-Engines: Shell- oder Fin-Fur-Shader auf `*_Fur_Mesh`.
- Einfachster Weg für Videos: Viewer als Szene aufnehmen (Bildschirmaufnahme/PNG-Sequenz).

## Beleuchtungs-Setups (wie im Viewer)
- **Midnight:** Hintergrund Radial-Navy, Key warm von vorn-oben, zwei orange Rim-Lichter von hinten, Navy-Hemisphere-Fill.
- **Sun:** Hintergrund `#ffc61a`, Rim aus, weiche Schatten.
- **Transparent:** PNG mit Alpha zum Compositing.

## Bekannte Grenzen v1
- Prozedural, nicht handmodelliert: Silhouette und Fellqualität erreichen nicht das Niveau der Referenz-Renders.
- Rig ohne Gesichts-Blendshapes und ohne Skinning.
- Glyphen-Positionen sind aus den Referenzbildern geschätzt (beidseitig gespiegelt); Referenz zeigt nur die linke Seite.

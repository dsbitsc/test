# DSB IT-Services & -Consulting — Brand CI

Version 1.0 · September 2026 · Konzept: „Terminal Mark"

Vollständig neu konstruiertes Markensystem auf Basis der ursprünglichen Sketch-Idee (`<`, `>`, `/`, `_`). Geometrie, Proportionen und Farbsystem wurden für professionelle Anwendung neu aufgebaut — nicht die Handzeichnung 1:1 übernommen.

---

## 1. Markenkonzept

**Symbol:** `</>_` — ein self-closing Code-Tag mit blinkendem Terminal-Cursor.

**Warum das funktioniert:**
- `</>` ist das universell erkannte Symbol für Code/Software — sofort verständlich im IT-Kontext, ohne Erklärung.
- Der Cursor `_` ist das einzige farbige Element der Marke. Struktur (Klammern) bleibt neutral/zeitlos, ein Akzent trägt die Markenfarbe. Das hält das System flexibel (Akzentfarbe austauschbar) und trotzdem konsistent (Klammernform bleibt konstant).
- Optische Sprache: MacBook/Terminal.app — Space-Black-Flächen, abgerundete „Squircle"-Icon-Kachel (identisches Radiusverhältnis wie iOS/macOS-App-Icons), Ampel-Dots als kontextuelles Chrome-Element, durchgehend Monospace-Typografie.

**Designentscheidung Groß-/Kleinschreibung:** `dsb` klein = Produkt-/Social-Handle-Schreibweise (modern, wie stripe/vercel/linear). `DSB` groß = ausschließlich in der formellen Vollmarke mit ausgeschriebenem Namen. Das ist kein Widerspruch, sondern bewusst getrennt nach Kontext — bitte in der Anwendung so beibehalten.

---

## 2. Farbsystem

| Name | HEX | RGB | CMYK* | Verwendung |
|---|---|---|---|---|
| **Terminal Black** | `#1D1D1F` | 29, 29, 31 | 6, 6, 0, 88 | Primäre Fläche (dunkel), Text auf Hell |
| **Cloud White** | `#F5F5F7` | 245, 245, 247 | 1, 1, 0, 3 | Primäre Fläche (hell) |
| **Reinweiß** | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 | Marke auf dunklem Grund |
| **Terminal Green** | `#2ED573` | 46, 213, 115 | 78, 0, 46, 16 | **Signature-Akzent** — Cursor, Links, CTAs, Erfolgsstatus |
| **Slate Gray** | `#86868B` | 134, 134, 139 | 4, 4, 0, 45 | Sekundärtext, Taglines |
| **Border Gray** | `#3A3A3C` | 58, 58, 60 | 3, 3, 0, 76 | Trennlinien, Chrome-Rahmen (Dark) |
| Traffic Red *(nur Fenster-Chrome)* | `#FF5F56` | 255, 95, 86 | 0, 63, 66, 0 | Nur im Terminal-Chrome-Element, kein Markenfarbe |
| Traffic Yellow *(nur Fenster-Chrome)* | `#FFBD2E` | 255, 189, 46 | 0, 26, 82, 0 | Nur im Terminal-Chrome-Element |
| Traffic Green *(nur Fenster-Chrome)* | `#27C93F` | 39, 201, 63 | 81, 0, 69, 21 | Nur im Terminal-Chrome-Element |

\* CMYK-Werte sind rechnerische Näherungen (Standard-Konversion) für die erste Druck-Orientierung — vor Produktion mit dem ICC-Profil der Druckerei bzw. einem Pantone-Bridge-Fächer abgleichen. Nicht 1:1 als Sonderfarbe freigeben.

**Kontrast:** Terminal Green auf Terminal Black erfüllt WCAG-Grafikkontrast (>3:1) komfortabel. Für Fließtext niemals Grau-auf-Grau oder Green-auf-White unter 14px einsetzen.

**Regel:** Genau **eine** Akzentfarbe. Die Ampel-Farben sind ausschließlich dekoratives Chrome-Element (Fenstersimulation), niemals als Markenfarbe in Diagrammen, Buttons o. Ä. verwenden — sonst verwässert der Wiedererkennungswert.

---

## 3. Typografie

| Rolle | Font | Schnitt | Lizenz |
|---|---|---|---|
| **Primär (Cross-Plattform, Web, Office)** | JetBrains Mono | Bold/SemiBold (Wortmarke), Medium/Regular (Fließtext) | SIL Open Font License 1.1 — frei kommerziell nutz-, einbett- und modifizierbar |
| **Enhancement (nur native Apple-Umgebung)** | SF Mono | via System-Fontstack | Apple-proprietär — **nicht** für Web-Embedding oder Drittsysteme lizenziert, nur auf Apple-Geräten via Systemfont zulässig |

**CSS-Fontstack:**
```css
font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

**Wichtiger Hinweis:** SF Mono niemals als Webfont hochladen/einbetten (Lizenzverletzung). JetBrains Mono ist der tatsächliche Cross-Plattform-Markenfont; SF Mono greift automatisch nur auf Apple-Geräten über den System-Fontstack.

Alle Wortmarken-Dateien in `/svg` sind bereits **in Pfade konvertiert (outlined)** — sie rendern korrekt, auch ohne installierte Schrift auf dem Zielsystem.

---

## 4. Das Symbol — Konstruktion

- Einheitliche Strichstärke durchgehend, runde Kappen/Ecken (`stroke-linecap/linejoin: round`).
- `<` und `>` als offene, symmetrische Chevrons — bewusst weiter geöffnet als ein typografisches `<>`, wirkt dadurch freundlicher/premium statt spitz/aggressiv.
- Cursor `_` als eigenständiger, gefüllter Pill-Block (kein Strich) — einzige farbige, einzige „gefüllte" Form im System. Das ist beabsichtigt: Struktur = Strich, Akzent = Fläche.
- App-Icon-Kachel: „Squircle"-Radius bei 22,3 % der Kantenlänge (entspricht dem visuellen Verhältnis von iOS/macOS-App-Icons).

**Schutzraum:** Mindestabstand rundum = Höhe des Symbols selbst (1×). Kein anderes Element (Text, Rahmen, Bildkante) darf in diesen Raum hineinragen.

**Mindestgrößen:**

| Variante | Digital | Druck |
|---|---|---|
| Icon/Symbol allein | 24 px | 8 mm |
| Horizontal-Lockup („dsb") | 120 px Breite | 30 mm Breite |
| Voll-Lockup (mit Tagline) | 220 px Breite | 55 mm Breite |
| Favicon (reduzierte Form `>_`) | 16 px | — |

**Favicon-Reduktionsregel:** Unter 32 px wird das volle `</>_ ` visuell zu Brei. Das Favicon nutzt daher bewusst eine reduzierte Form (`>_` — der Kernbestandteil „Terminal-Prompt") mit verstärkter Strichstärke. Das ist keine Notlösung, sondern gängige Praxis großer Marken (Symbol wird für Kleinstgrößen bewusst vereinfacht).

---

## 5. Logo-Varianten — Übersicht

| Datei | Einsatz |
|---|---|
| `svg/icon-tile-dark.svg` / `-light.svg` | App-Icon-Kachel, Profilbild-Basis, generisches Icon |
| `svg/mark-dark.svg` / `mark-white.svg` | Symbol freistehend (ohne Kachel) für beliebigen Hintergrund |
| `svg/mark-mono-black.svg` / `mark-mono-white.svg` | Einfarbig — Gravur, Stempel, Fax, 1-Farb-Druck, Wasserzeichen |
| `svg/logo-horizontal-dark.svg` / `-light.svg` | Kurz-Lockup „dsb" — Website-Header, Visitenkarte, Signatur |
| `svg/logo-full-dark.svg` / `-light.svg` | **Lang-Logo** „DSB // IT-Services & -Consulting" — Briefpapier, Angebote, Footer, Präsentationen |
| `svg/favicon.svg` / `favicon-light.svg` | Browser-Favicon (Vektor, moderne Browser) |
| `svg/social-avatar.svg` | Profilbild für Social Media (kreisschnitt-sicher) |
| `svg/social-cover.svg` | Cover/Header-Banner & OG-/Share-Bild, 1200×630 |
| `svg/apple-touch-icon-source.svg` | Quelle für iOS Home-Screen-Icon (ohne Eckenradius — iOS maskiert selbst) |

**Raster-Exporte** (`/png`): `favicon.ico` (16/32/48 Multi-Resolution), `favicon-16/32/48/64.png`, `apple-touch-icon.png` (180×180), `social-avatar-512.png` / `-400.png`, `social-cover-1200x630.png`, `icon-tile-dark/light-1024.png`.

### Favicon einbinden (HTML `<head>`)
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

---

## 6. Anwendung — Do's & Don'ts

**Do:**
- Symbol immer proportional skalieren (nie Höhe/Breite getrennt verzerren).
- Auf dunklem Grund → Weiß/Green-Variante. Auf hellem Grund → Black/Green-Variante. Auf Fotos/komplexem Hintergrund → Mono-Variante mit dezentem Schlagschatten oder auf Terminal-Kachel setzen.
- Cursor-Akzent bleibt immer Terminal Green — auch wenn die Struktur (Klammern) in Sonderfällen einfarbig läuft.

**Don't:**
- Keine zweite Akzentfarbe einführen (kein Blau/Orange/Rot als „Highlight" — verwässert Wiedererkennung).
- Ampel-Farben nie als eigenständige Markenfarben verwenden (nur im Terminal-Chrome-Kontext).
- Symbol nicht mit Schlagschatten, 3D-Bevel oder Farbverlauf „aufhübschen" — die Flachheit ist Teil des Terminal-Stils.
- `</>`  ohne Cursor `_` nicht als alleinstehendes Symbol einführen — der Cursor ist das unterscheidende Merkmal (ohne ihn ist es ein generisches Code-Icon wie tausend andere).
- Schutzraum nicht unterschreiten, Symbol nicht auf unruhigem Foto ohne Kachel/Flächenschutz platzieren.

---

## 7. Rechtlicher Hinweis — vor Launch prüfen

„DSB" ist als Kürzel bereits durch etablierte Dritte belegt (u. a. Danske Statsbaner/DSB — dänische Staatsbahn, im deutschsprachigen Raum bekannt; „Deutscher Schützenbund" nutzt ebenfalls DSB). Das ist kein Grund, das Konzept zu verwerfen, aber: **vor Investition in Druck, Domains oder Ad-Spend** eine Markenrecherche (DPMA-Register für DE, ggf. EUIPO für EU) in der einschlägigen Nizza-Klasse (IT-Dienstleistungen) durchführen. Eine reine Google-Prüfung reicht nicht — das ist ein Registerabgleich, keine Design-Frage. Ich bin kein Anwalt; das hier ist ein Hinweis, keine Rechtsberatung.

---

## 8. Dateiverzeichnis (vollständig)

```
brand/
├── BRAND-CI.md
├── svg/
│   ├── icon-tile-dark.svg          icon-tile-light.svg
│   ├── mark-dark.svg               mark-white.svg
│   ├── mark-mono-black.svg         mark-mono-white.svg
│   ├── favicon.svg                 favicon-light.svg
│   ├── social-avatar.svg           social-cover.svg
│   ├── logo-horizontal-dark.svg    logo-horizontal-light.svg
│   ├── logo-full-dark.svg          logo-full-light.svg
│   └── apple-touch-icon-source.svg
└── png/
    ├── favicon.ico
    ├── favicon-16.png  favicon-32.png  favicon-48.png  favicon-64.png
    ├── apple-touch-icon.png
    ├── social-avatar-512.png  social-avatar-400.png
    ├── social-cover-1200x630.png
    └── icon-tile-dark-1024.png  icon-tile-light-1024.png
```

Alle SVGs sind reiner Vektor, Text vollständig in Pfade konvertiert (font-unabhängig, editierbar in Illustrator/Figma/Inkscape ohne Font-Installation).

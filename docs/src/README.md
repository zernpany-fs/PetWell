# Documentation sources

The PDFs in `docs/` are generated from the markdown in this folder. Edit the markdown, never the PDF.

```bash
python3 docs/src/build_pdf.py            # build every source
python3 docs/src/build_pdf.py API        # build one, matched on filename
```

Requires `reportlab` (`pip install reportlab`) and the DejaVu fonts, which are present on most Linux distributions at `/usr/share/fonts/truetype/dejavu`. On macOS, install them with `brew install --cask font-dejavu` or edit the `DEJAVU` path in `build_pdf.py`.

| Source | Output |
|---|---|
| `PetWell_API_Documentation.md` | `../PetWell_API_Documentation.pdf` |
| `PetWell_Frontend_Addendum.md` | `../PetWell_Frontend_Addendum.pdf` |
| `PetWell_QA_TH.md` | `../PetWell_QA_TH.pdf` (Thai) |

`PetWell_Frontend_Documentation.pdf` (Revision 1) has no source here — it predates this setup and was produced with WeasyPrint. The addendum covers what changed after it, rather than replacing it.

## Header metadata

Each source starts with these lines:

| Key | Meaning |
|---|---|
| `%TITLE` | Cover title |
| `%SUBTITLE` | Cover subtitle |
| `%TAGLINE` | One-paragraph description on the cover |
| `%BADGES` | Stack line on the cover |
| `%FOOTER` | Running footer text |
| `%EDITION` | Edition/date line at the foot of the cover |
| `%CHAPTERBREAKS` | `off` to flow chapters continuously; defaults to a page per chapter |
| `%FONT` | `thai` to set the body face to Sarabun; defaults to `latin` (DejaVu) |

## Supported markdown

| Syntax | Renders as |
|---|---|
| `# Heading` | Numbered chapter (`Appendix …` keeps its own label) |
| `## ` / `### ` | Section and sub-section |
| blank-line separated text | Paragraph |
| `- item` | Bullet |
| `` `code` `` and `**bold**` | Inline mono and bold |
| ` ``` ` fenced block | Boxed code listing |
| `> **Title**` then `> body` | Accented callout box |
| `\| a \| b \|` | Table; second row is the `---` separator |
| `%PAGEBREAK` | Explicit page break |

Anything else — images, nested lists, blockquotes without a bold first line, HTML — is not handled. Keep to the subset above.

The table renderer widens `Path`/`Endpoint` columns and sets them in mono, so API reference tables lay out without hyphenating mid-path.

## Constraints worth knowing

- **Thai needs `%FONT thai`.** DejaVu has no Thai glyphs — Thai text renders as blank boxes with no error at all. Sources with Thai prose must declare `%FONT thai`, which switches the body face to Sarabun (Thai + Latin + punctuation). Install it with:

  ```bash
  npm i @expo-google-fonts/sarabun
  cp node_modules/@expo-google-fonts/sarabun/400Regular/Sarabun_400Regular.ttf /tmp/fonts/Sarabun-Regular.ttf
  cp node_modules/@expo-google-fonts/sarabun/700Bold/Sarabun_700Bold.ttf     /tmp/fonts/Sarabun-Bold.ttf
  ```

  Or point `THAI` in `build_pdf.py` at any Thai TTF you already have.
- **Code blocks stay English even in Thai documents.** Monospace is always DejaVu Sans Mono, which has no Thai glyphs. A Thai comment inside a code listing would silently vanish into boxes.
- **Verify Thai output — and verify it after a full build, not a single-file build.** Rendering succeeds even when every glyph is missing. ReportLab's font registry is process-wide, so a bug here only appears when a Latin document is built *before* a Thai one in the same run. `register_fonts` gives each set its own face names to prevent that, but check the result anyway:

  ```bash
  pdffonts ../PetWell_QA_TH.pdf          # must list Sarabun, not DejaVuSans
  pdftotext ../PetWell_QA_TH.pdf - | python3 -c \
    "import sys,re; print(len(set(re.findall(r'[฀-๿]', sys.stdin.read()))), 'Thai chars')"
  ```
- **The table of contents needs two passes.** `build_pdf.py` calls `multiBuild`, which resolves the real page numbers. Don't switch it to `build`.
- **Verify counts against source.** When the endpoint total changes, check it rather than editing the number by hand:

  ```bash
  grep -rhoE "@(Get|Post|Patch|Delete)\(" backend/src --include=*.controller.ts | wc -l
  ```

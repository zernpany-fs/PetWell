#!/usr/bin/env python3
"""
Build the PetWell documentation PDFs from their markdown sources.

    python3 docs/src/build_pdf.py                 # build all
    python3 docs/src/build_pdf.py API             # build one (matches filename)

Each source is a .md file in this directory whose header carries %TITLE,
%SUBTITLE, %TAGLINE, %BADGES, %FOOTER and %EDITION metadata lines. Output goes
to ../ (the docs folder) as <source-stem>.pdf.

Supported markdown subset:
    #/##/###      headings (# is a numbered chapter and starts a new page)
    paragraphs    blank-line separated
    - item        bullets
    | a | b |     tables, second row is the --- separator
    ```lang       fenced code blocks
    > **Title**   callout box; following > lines are its body
    %PAGEBREAK    explicit page break

Fonts: DejaVu is embedded so arrows, bullets and dashes render rather than
appearing as black boxes. Sources must stay English-only — DejaVu has no Thai
glyphs, and Thai text would silently become boxes.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

# ── palette (mirrors the app's warm design system) ────────────────────────────
INK = colors.HexColor("#2D2A26")
MUTED = colors.HexColor("#6E675C")
HAIRLINE = colors.HexColor("#E6DFD3")
ACCENT = colors.HexColor("#5E86AD")
ACCENT_DARK = colors.HexColor("#40638A")
CANVAS = colors.HexColor("#FAF8F4")
CODE_BG = colors.HexColor("#F4F2ED")
CALLOUT_BG = colors.HexColor("#E4EBF2")
TABLE_HEAD = colors.HexColor("#F1ECE3")

DEJAVU = Path("/usr/share/fonts/truetype/dejavu")
THAI = Path("/tmp/fonts")

# DejaVu has no Thai glyphs — Thai text would silently render as empty boxes.
# A source declares "%FONT thai" to switch the body face to Sarabun, which
# covers Thai, Latin and punctuation. Code stays monospaced either way, so
# code listings in a Thai document must remain English.
FONT_SETS = {
    "latin": {
        "Doc": DEJAVU / "DejaVuSans.ttf",
        "Doc-Bold": DEJAVU / "DejaVuSans-Bold.ttf",
        "Doc-Oblique": DEJAVU / "DejaVuSans-Oblique.ttf",
        "Mono": DEJAVU / "DejaVuSansMono.ttf",
        "Mono-Bold": DEJAVU / "DejaVuSansMono-Bold.ttf",
    },
    "thai": {
        "Doc": THAI / "Sarabun-Regular.ttf",
        "Doc-Bold": THAI / "Sarabun-Bold.ttf",
        "Doc-Oblique": THAI / "Sarabun-Regular.ttf",
        "Mono": DEJAVU / "DejaVuSansMono.ttf",
        "Mono-Bold": DEJAVU / "DejaVuSansMono-Bold.ttf",
    },
}


# Resolved face names for the document currently being built. Populated by
# register_fonts and read everywhere a face is named.
FONT: dict[str, str] = {}


def register_fonts(font_set: str = "latin") -> None:
    """
    Register a font set under names unique to that set.

    Names must not be shared between sets. ReportLab keeps a process-wide font
    registry, so building a Latin document and then a Thai one in the same run
    would leave the second document using the first document's faces — Thai
    text then renders as empty boxes with no error at all.
    """
    fonts = FONT_SETS[font_set]
    missing = [str(p) for p in fonts.values() if not p.exists()]
    if missing:
        raise SystemExit(f"Missing font files: {missing}")

    FONT.clear()
    for role, path in fonts.items():
        name = f"{role}-{font_set}"
        FONT[role] = name
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, str(path)))

    pdfmetrics.registerFontFamily(
        FONT["Doc"],
        normal=FONT["Doc"],
        bold=FONT["Doc-Bold"],
        italic=FONT["Doc-Oblique"],
        boldItalic=FONT["Doc-Bold"],
    )


def styles():
    s = getSampleStyleSheet()
    base = dict(fontName=FONT["Doc"], textColor=INK, leading=14.5)

    s.add(ParagraphStyle("Body", parent=s["Normal"], fontSize=9.6, spaceAfter=7, **base))
    s.add(ParagraphStyle("ListItem", parent=s["Normal"], fontSize=9.6, leftIndent=12,
                         bulletIndent=2, spaceAfter=3.5, **base))
    s.add(ParagraphStyle("H1", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=19,
                         textColor=INK, leading=23, spaceBefore=0, spaceAfter=11))
    s.add(ParagraphStyle("H2", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=12.5,
                         textColor=ACCENT_DARK, leading=16, spaceBefore=13, spaceAfter=5))
    s.add(ParagraphStyle("H3", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=10.4,
                         textColor=INK, leading=14, spaceBefore=9, spaceAfter=4))
    s.add(ParagraphStyle("CodeBlock", parent=s["Normal"], fontName=FONT["Mono"], fontSize=7.9,
                         textColor=INK, leading=11.2))
    s.add(ParagraphStyle("CalloutTitle", parent=s["Normal"], fontName=FONT["Doc-Bold"],
                         fontSize=9.4, textColor=ACCENT_DARK, leading=13, spaceAfter=3))
    s.add(ParagraphStyle("CalloutBody", parent=s["Normal"], fontName=FONT["Doc"], fontSize=9.2,
                         textColor=INK, leading=13.5))
    s.add(ParagraphStyle("TableCell", parent=s["Normal"], fontName=FONT["Doc"], fontSize=8.5,
                         textColor=INK, leading=11.6))
    s.add(ParagraphStyle("TableHead", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=8.5,
                         textColor=INK, leading=11.6))
    s.add(ParagraphStyle("TableMono", parent=s["Normal"], fontName=FONT["Mono"], fontSize=7.3,
                         textColor=INK, leading=10.6))

    s.add(ParagraphStyle("CoverTitle", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=40,
                         textColor=INK, leading=46, alignment=TA_LEFT))
    s.add(ParagraphStyle("CoverSub", parent=s["Normal"], fontName=FONT["Doc"], fontSize=15,
                         textColor=MUTED, leading=21, alignment=TA_LEFT))
    s.add(ParagraphStyle("CoverTag", parent=s["Normal"], fontName=FONT["Doc"], fontSize=10.4,
                         textColor=INK, leading=16, alignment=TA_LEFT))
    s.add(ParagraphStyle("CoverMeta", parent=s["Normal"], fontName=FONT["Doc"], fontSize=9,
                         textColor=MUTED, leading=14, alignment=TA_LEFT))
    s.add(ParagraphStyle("Eyebrow", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=9,
                         textColor=ACCENT, leading=12, alignment=TA_LEFT))
    s.add(ParagraphStyle("TOCTitle", parent=s["Normal"], fontName=FONT["Doc-Bold"], fontSize=17,
                         textColor=INK, leading=21, spaceAfter=14))
    s.add(ParagraphStyle("Caption", parent=s["Normal"], fontName=FONT["Doc"], fontSize=8.4,
                         textColor=MUTED, leading=11.5, alignment=TA_CENTER))
    return s


INLINE_CODE = re.compile(r"`([^`]+)`")
BOLD = re.compile(r"\*\*([^*]+)\*\*")


def inline(text: str) -> str:
    """Escape for ReportLab's mini-HTML, then re-apply `code` and **bold**."""
    out = escape(text)
    out = INLINE_CODE.sub(
        rf'<font name="{FONT["Mono"]}" size="8.6" color="#40638A">\1</font>', out
    )
    out = BOLD.sub(r"<b>\1</b>", out)
    return out


class Block:
    def __init__(self, kind: str, **kw):
        self.kind = kind
        self.__dict__.update(kw)


def parse(md: str):
    """Split the source into metadata plus a flat list of Blocks."""
    meta: dict[str, str] = {}
    blocks: list[Block] = []
    lines = md.splitlines()
    i = 0

    # strip a leading HTML comment
    if lines and lines[0].lstrip().startswith("<!--"):
        while i < len(lines) and "-->" not in lines[i]:
            i += 1
        i += 1

    para: list[str] = []
    bullets: list[str] = []

    def flush():
        nonlocal para, bullets
        if para:
            blocks.append(Block("para", text=" ".join(para)))
            para = []
        if bullets:
            blocks.append(Block("bullets", items=bullets))
            bullets = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("%"):
            flush()
            key, _, value = stripped[1:].partition(" ")
            if key == "PAGEBREAK":
                blocks.append(Block("pagebreak"))
            else:
                meta[key] = value.strip()
            i += 1
            continue

        if not stripped:
            flush()
            i += 1
            continue

        if stripped.startswith("```"):
            flush()
            i += 1
            code: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            blocks.append(Block("code", lines=code))
            continue

        if stripped.startswith(">"):
            flush()
            quoted: list[str] = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quoted.append(lines[i].strip()[1:].strip())
                i += 1
            title = quoted[0] if quoted else ""
            title = BOLD.sub(r"\1", title).strip()
            blocks.append(Block("callout", title=title, body=" ".join(quoted[1:])))
            continue

        if stripped.startswith("|"):
            flush()
            rows: list[list[str]] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(cells)
                i += 1
            if len(rows) >= 2 and set(rows[1][0]) <= set("-: "):
                header, body = rows[0], rows[2:]
            else:
                header, body = rows[0], rows[1:]
            blocks.append(Block("table", header=header, rows=body))
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", stripped)
        if m:
            flush()
            blocks.append(Block("heading", level=len(m.group(1)), text=m.group(2)))
            i += 1
            continue

        if stripped.startswith("- "):
            if para:
                blocks.append(Block("para", text=" ".join(para)))
                para = []
            bullets.append(stripped[2:])
            i += 1
            continue

        if bullets:
            blocks.append(Block("bullets", items=bullets))
            bullets = []
        para.append(stripped)
        i += 1

    flush()
    return meta, blocks


class DocTemplate(BaseDocTemplate):
    """Two page templates: a bare cover, then the body with a footer."""

    def __init__(self, path, footer, **kw):
        super().__init__(path, pagesize=A4, **kw)
        self.footer_text = footer
        self._chapter = 0

        margin = 20 * mm
        w = A4[0] - 2 * margin
        h = A4[1] - 2 * margin

        self.addPageTemplates([
            PageTemplate(
                id="Cover",
                frames=[Frame(margin, margin, w, h, id="cover")],
                onPage=self._cover_bg,
            ),
            PageTemplate(
                id="Body",
                frames=[Frame(margin, margin + 8 * mm, w, h - 8 * mm, id="body")],
                onPage=self._footer,
            ),
        ])

    def _cover_bg(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(CANVAS)
        canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
        canvas.setFillColor(ACCENT)
        canvas.rect(0, A4[1] - 9 * mm, A4[0], 9 * mm, stroke=0, fill=1)
        canvas.restoreState()

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(HAIRLINE)
        canvas.setLineWidth(0.5)
        y = 15 * mm
        canvas.line(20 * mm, y, A4[0] - 20 * mm, y)
        canvas.setFont(FONT["Doc"], 7.6)
        canvas.setFillColor(MUTED)
        canvas.drawString(20 * mm, y - 4.4 * mm, self.footer_text)
        canvas.drawRightString(A4[0] - 20 * mm, y - 4.4 * mm, f"Page {doc.page}")
        canvas.restoreState()

    def afterFlowable(self, flowable):
        """Feed headings to the TOC so its page numbers are real."""
        if not isinstance(flowable, Paragraph):
            return
        name = flowable.style.name
        if name not in ("H1", "H2"):
            return
        level = 0 if name == "H1" else 1
        # getPlainText() has already stripped the markup, so anything still
        # shaped like a tag is real content — a heading mentioning <img>, say.
        # It must be escaped rather than stripped: stripping deletes it from the
        # contents page, and passing it through raw makes ReportLab parse it as
        # markup and fail with "<img> needs src attribute".
        text = escape(flowable.getPlainText())
        key = f"toc-{id(flowable)}"
        self.canv.bookmarkPage(key)
        self.notify("TOCEntry", (level, text, self.page, key))


def cover(meta, s):
    out = [Spacer(1, 46 * mm)]
    out.append(Paragraph("PETWELL", s["Eyebrow"]))
    out.append(Spacer(1, 5 * mm))
    out.append(Paragraph(escape(meta.get("TITLE", "")), s["CoverTitle"]))
    out.append(Spacer(1, 2 * mm))
    out.append(Paragraph(escape(meta.get("SUBTITLE", "")), s["CoverSub"]))
    out.append(Spacer(1, 12 * mm))

    rule = Table([[""]], colWidths=[58 * mm], rowHeights=[1.4])
    rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
    out.append(rule)
    out.append(Spacer(1, 10 * mm))

    out.append(Paragraph(escape(meta.get("TAGLINE", "")), s["CoverTag"]))
    out.append(Spacer(1, 14 * mm))
    if meta.get("BADGES"):
        out.append(Paragraph(escape(meta["BADGES"]), s["CoverMeta"]))
    out.append(Spacer(1, 42 * mm))
    if meta.get("EDITION"):
        out.append(Paragraph(escape(meta["EDITION"]), s["CoverMeta"]))
    out.append(Paragraph("Pet Health Passport &amp; Appointment Management System",
                         s["CoverMeta"]))
    return out


def toc_page(s):
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle("TOC0", fontName=FONT["Doc-Bold"], fontSize=10, leading=17,
                       textColor=INK, spaceBefore=5),
        ParagraphStyle("TOC1", fontName=FONT["Doc"], fontSize=9, leading=13.5,
                       textColor=MUTED, leftIndent=13, firstLineIndent=-1),
    ]
    return [Paragraph("Contents", s["TOCTitle"]), toc, PageBreak()]


def render(blocks, s, avail_width, chapter_breaks=True):
    story = []
    chapter = 0

    for b in blocks:
        if b.kind == "pagebreak":
            story.append(PageBreak())

        elif b.kind == "heading":
            if b.level == 1:
                chapter += 1
                if chapter > 1 and chapter_breaks:
                    story.append(PageBreak())
                elif chapter > 1:
                    story.append(Spacer(1, 13))
                label = b.text if b.text.startswith("Appendix") else f"{chapter}  {b.text}"
                story.append(Paragraph(inline(label), s["H1"]))
                rule = Table([[""]], colWidths=[avail_width], rowHeights=[1])
                rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), HAIRLINE)]))
                story.append(rule)
                story.append(Spacer(1, 7))
            else:
                story.append(Paragraph(inline(b.text), s[f"H{b.level}"]))

        elif b.kind == "para":
            story.append(Paragraph(inline(b.text), s["Body"]))

        elif b.kind == "bullets":
            for item in b.items:
                story.append(Paragraph(inline(item), s["ListItem"], bulletText="•"))
            story.append(Spacer(1, 5))

        elif b.kind == "code":
            text = "\n".join(b.lines) or " "
            para = Paragraph(
                escape(text).replace(" ", "&nbsp;").replace("\n", "<br/>"), s["CodeBlock"]
            )
            tbl = Table([[para]], colWidths=[avail_width])
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 8))

        elif b.kind == "callout":
            inner = [Paragraph(inline(b.title), s["CalloutTitle"])]
            if b.body:
                inner.append(Paragraph(inline(b.body), s["CalloutBody"]))
            tbl = Table([[inner]], colWidths=[avail_width])
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), CALLOUT_BG),
                ("LINEBEFORE", (0, 0), (0, -1), 2.4, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(KeepTogether([tbl, Spacer(1, 9)]))

        elif b.kind == "table":
            ncols = len(b.header)
            # Mono-ish columns (paths, methods) are narrower than prose columns.
            head_l = [h.lower() for h in b.header]
            weights = []
            for h in head_l:
                if h in ("method", "auth"):
                    weights.append(0.5)
                elif h in ("status", "role"):
                    weights.append(0.7)
                elif h in ("path", "endpoint"):
                    # Paths are set in mono and must not hyphenate mid-segment.
                    weights.append(1.8)
                elif h in ("from", "term", "file", "decorator", "layer", "model", "dto"):
                    weights.append(1.1)
                else:
                    weights.append(1.9)
            total = sum(weights)
            widths = [avail_width * w / total for w in weights]

            data = [[Paragraph(inline(c), s["TableHead"]) for c in b.header]]
            for row in b.rows:
                cells = list(row) + [""] * (ncols - len(row))
                out_row = []
                for h, c in zip(head_l, cells[:ncols]):
                    style = s["TableMono"] if h in ("method", "path", "endpoint") else s["TableCell"]
                    out_row.append(Paragraph(inline(c), style))
                data.append(out_row)

            tbl = Table(data, colWidths=widths, repeatRows=1)
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEAD),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, HAIRLINE),
                ("GRID", (0, 0), (-1, -1), 0.35, HAIRLINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 9))

    return story


THAI_RANGE = re.compile(r"[฀-๿]")
PRE_ESCAPED = re.compile(r"&(lt|gt|amp|quot|apos|nbsp|rsquo|ldquo|rdquo);")


def check_double_escaping(src_text: str, src: Path) -> None:
    """
    Fail if the source hand-writes HTML entities.

    inline() escapes text before handing it to ReportLab, so a source that
    writes "&lt;img&gt;" gets escaped a second time and the reader sees the
    literal characters "&lt;img&gt;" on the page. Write "<img>" instead and let
    the escaping happen once.
    """
    hits = [
        f"  line {i}: {ln.strip()[:70]}"
        for i, ln in enumerate(src_text.splitlines(), 1)
        if PRE_ESCAPED.search(ln) and not ln.lstrip().startswith("<!--")
    ]
    if hits:
        raise SystemExit(
            f"{src.name}: HTML entities written by hand — these get escaped "
            "twice and render literally.\n"
            + "\n".join(hits[:10])
            + "\nWrite the raw character (e.g. <img>) and let the builder escape it."
        )


def check_mono_glyphs(blocks, font_set: str, src: Path) -> None:
    """
    Fail if Thai text sits inside a code block or a mono table column.

    Monospace is always DejaVu Sans Mono, which has no Thai glyphs even when
    the body face is Sarabun. ReportLab renders the missing glyphs as empty
    boxes and reports no error, so this has to be caught at build time rather
    than by eyeballing the output.
    """
    if font_set != "thai":
        return

    problems: list[str] = []
    for b in blocks:
        if b.kind == "code":
            problems += [
                f"  code block: {ln.strip()[:60]}"
                for ln in b.lines
                if THAI_RANGE.search(ln)
            ]
        elif b.kind == "table":
            mono = [
                i
                for i, h in enumerate(b.header)
                if h.lower() in ("method", "path", "endpoint")
            ]
            for row in b.rows:
                problems += [
                    f"  mono column: {row[i][:60]}"
                    for i in mono
                    if i < len(row) and THAI_RANGE.search(row[i])
                ]

    if problems:
        raise SystemExit(
            f"{src.name}: Thai text inside monospace, which has no Thai glyphs "
            "and renders as empty boxes.\n"
            + "\n".join(problems[:10])
            + "\nMove the Thai prose out into a table or bullet list."
        )


def build(src: Path, out_dir: Path) -> Path:
    src_text = src.read_text(encoding="utf-8")
    check_double_escaping(src_text, src)
    meta, blocks = parse(src_text)
    font_set = meta.get("FONT", "latin")
    check_mono_glyphs(blocks, font_set, src)
    register_fonts(font_set)
    s = styles()
    out_path = out_dir / f"{src.stem}.pdf"

    doc = DocTemplate(
        str(out_path),
        footer=meta.get("FOOTER", "PetWell Documentation"),
        title=f"{meta.get('TITLE', '')} — {meta.get('SUBTITLE', '')}",
        author="PetWell",
        subject=meta.get("TAGLINE", ""),
    )
    avail = doc.width

    story = cover(meta, s)
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())
    story += toc_page(s)
    # Short documents read better flowing continuously than with a page per chapter.
    chapter_breaks = meta.get("CHAPTERBREAKS", "on").lower() not in ("off", "false", "no")
    story += render(blocks, s, avail, chapter_breaks=chapter_breaks)

    # multiBuild resolves TOC page numbers on the second pass.
    doc.multiBuild(story)
    return out_path


def main() -> None:
    here = Path(__file__).resolve().parent
    out_dir = here.parent
    # README.md documents this script; it is not a document source.
    sources = [p for p in sorted(here.glob("*.md")) if p.name != "README.md"]
    if len(sys.argv) > 1:
        needle = sys.argv[1].lower()
        sources = [p for p in sources if needle in p.stem.lower()]
    if not sources:
        raise SystemExit("No matching markdown sources found.")
    for src in sources:
        path = build(src, out_dir)
        print(f"built {path.name}")


if __name__ == "__main__":
    main()

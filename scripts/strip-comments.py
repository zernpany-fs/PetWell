#!/usr/bin/env python3
"""
Remove comments from the project's own TypeScript / Prisma source.

    python3 scripts/strip-comments.py --dry-run     # report only
    python3 scripts/strip-comments.py               # rewrite files

This is a character scanner, not a regex. A regex approach corrupts source:
'https://maps.google.com' contains '//', and a regex literal like /^\\d{5}$/
starts with a slash. The scanner tracks string, template, regex and JSX-comment
state so only real comments are removed.

Kept deliberately:
  - eslint-disable / ts-expect-error / ts-ignore / prettier-ignore  (directives)
  - /// <reference ...>                                             (type refs)
Skipped entirely: generated code, node_modules, build output, next-env.d.ts.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

KEEP_MARKERS = (
    "eslint-disable",
    "eslint-enable",
    "ts-expect-error",
    "ts-ignore",
    "ts-nocheck",
    "prettier-ignore",
    "<reference",
    "@jsxImportSource",
)

SKIP_PARTS = ("generated", "node_modules", ".next", "dist", "build")
SKIP_NAMES = ("next-env.d.ts",)

# Characters after which a '/' begins a regex literal rather than a division.
#
# '<' and '>' are deliberately absent. Including '<' makes the scanner read a
# JSX closing tag '</h1>' as the start of a regex, swallowing the rest of the
# line. Real code never puts a regex directly after a comparison operator.
REGEX_PRECEDERS = set("(,=:[!&|?{};+-*%~^\n")
REGEX_KEYWORDS = ("return", "typeof", "instanceof", "in", "of", "new", "delete", "case")


def last_significant(out: list[str]) -> str:
    for ch in reversed(out):
        if not ch.isspace():
            return ch
    return "\n"


def preceded_by_keyword(out: list[str]) -> bool:
    tail = "".join(out[-12:])
    stripped = tail.rstrip()
    return any(stripped.endswith(kw) for kw in REGEX_KEYWORDS)


def keep(comment: str) -> bool:
    return any(m in comment for m in KEEP_MARKERS)


def scan_regex(src: str, start: int) -> int:
    """
    Index just past a regex literal beginning at src[start] ('/'), or -1 if the
    text is not a complete single-line regex. Used as a confirmation step so an
    operator that merely looks like a regex opener is never consumed.
    """
    i = start + 1
    n = len(src)
    in_class = False
    while i < n:
        c = src[i]
        if c == "\\":
            i += 2
            continue
        if c == "\n":
            return -1
        if c == "[":
            in_class = True
        elif c == "]":
            in_class = False
        elif c == "/" and not in_class:
            i += 1
            while i < n and src[i].isalpha():  # trailing flags: g, i, m, u, y
                i += 1
            return i
        i += 1
    return -1


def strip(src: str, jsx: bool) -> str:
    out: list[str] = []
    i, n = 0, len(src)

    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""

        # ── strings ───────────────────────────────────────────────────────────
        if ch in "'\"":
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                out.append(src[i])
                if src[i] == "\\":
                    if i + 1 < n:
                        out.append(src[i + 1])
                        i += 2
                        continue
                elif src[i] == quote:
                    i += 1
                    break
                i += 1
            continue

        # ── template literals (with ${ } nesting) ─────────────────────────────
        if ch == "`":
            out.append(ch)
            i += 1
            depth = 0
            while i < n:
                c = src[i]
                if c == "\\":
                    out.append(c)
                    if i + 1 < n:
                        out.append(src[i + 1])
                    i += 2
                    continue
                if c == "$" and i + 1 < n and src[i + 1] == "{":
                    depth += 1
                    out.append("${")
                    i += 2
                    continue
                if c == "}" and depth > 0:
                    depth -= 1
                    out.append(c)
                    i += 1
                    continue
                if c == "`" and depth == 0:
                    out.append(c)
                    i += 1
                    break
                out.append(c)
                i += 1
            continue

        # ── JSX comment {/* ... */} — drop the braces too ─────────────────────
        if jsx and ch == "{" and src.startswith("{/*", i):
            end = src.find("*/}", i)
            if end != -1:
                body = src[i : end + 3]
                if keep(body):
                    out.append(body)
                else:
                    # Swallow a now-empty line rather than leaving whitespace.
                    j = end + 3
                    line_start = "".join(out).rsplit("\n", 1)[-1]
                    if line_start.strip() == "":
                        while out and out[-1] in " \t":
                            out.pop()
                        while j < n and src[j] in " \t":
                            j += 1
                        if j < n and src[j] == "\n":
                            j += 1
                    i = j
                    continue
                i = end + 3
                continue

        # ── line comment ──────────────────────────────────────────────────────
        if ch == "/" and nxt == "/":
            end = src.find("\n", i)
            end = n if end == -1 else end
            body = src[i:end]
            if keep(body):
                out.append(body)
                i = end
                continue
            line_start = "".join(out).rsplit("\n", 1)[-1]
            if line_start.strip() == "":
                # Whole-line comment: remove the line entirely.
                while out and out[-1] in " \t":
                    out.pop()
                i = end + 1 if end < n else n
            else:
                # Trailing comment: keep the code, drop the trailing spaces.
                while out and out[-1] in " \t":
                    out.pop()
                i = end
            continue

        # ── block comment ─────────────────────────────────────────────────────
        if ch == "/" and nxt == "*":
            end = src.find("*/", i + 2)
            end = n if end == -1 else end + 2
            body = src[i:end]
            if keep(body):
                out.append(body)
                i = end
                continue
            line_start = "".join(out).rsplit("\n", 1)[-1]
            if line_start.strip() == "":
                while out and out[-1] in " \t":
                    out.pop()
                j = end
                while j < n and src[j] in " \t":
                    j += 1
                if j < n and src[j] == "\n":
                    j += 1
                i = j
            else:
                i = end
            continue

        # ── regex literal ─────────────────────────────────────────────────────
        if ch == "/":
            prev = last_significant(out)
            # '</' opens a JSX closing tag and '/>' closes a self-closing one —
            # neither is a regex, even though '<' and '}' can precede one.
            plausible = (
                prev != "<"
                and nxt != ">"
                and (prev in REGEX_PRECEDERS or preceded_by_keyword(out))
            )
            # Only commit if the literal actually terminates on this line. A
            # regex cannot span a newline, so failing that test means we
            # misread an operator and should emit the slash verbatim.
            end = scan_regex(src, i) if plausible else -1
            if end != -1:
                out.append(src[i:end])
                i = end
                continue

        out.append(ch)
        i += 1

    text = "".join(out)

    # Collapse runs of blank lines left behind, and trim trailing whitespace.
    lines = [ln.rstrip() for ln in text.split("\n")]
    cleaned: list[str] = []
    for ln in lines:
        if ln == "" and cleaned and cleaned[-1] == "":
            continue
        cleaned.append(ln)
    while cleaned and cleaned[0] == "":
        cleaned.pop(0)
    while cleaned and cleaned[-1] == "":
        cleaned.pop()
    return "\n".join(cleaned) + "\n"


def targets(root: Path) -> list[Path]:
    found: list[Path] = []
    for base in (
        root / "backend" / "src",
        root / "backend" / "prisma",
        root / "frontend" / "src",
    ):
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if p.suffix not in (".ts", ".tsx", ".prisma"):
                continue
            if any(s in p.parts for s in SKIP_PARTS):
                continue
            if p.name in SKIP_NAMES:
                continue
            found.append(p)
    return found


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    changed = 0
    removed_lines = 0

    for path in targets(root):
        original = path.read_text(encoding="utf-8")
        result = strip(original, jsx=path.suffix == ".tsx")
        if result == original:
            continue
        changed += 1
        removed_lines += len(original.splitlines()) - len(result.splitlines())
        if not args.dry_run:
            path.write_text(result, encoding="utf-8")

    verb = "would change" if args.dry_run else "changed"
    print(f"{verb} {changed} files, {removed_lines} fewer lines")
    if args.dry_run:
        print("(dry run — nothing written)")


if __name__ == "__main__":
    sys.exit(main())

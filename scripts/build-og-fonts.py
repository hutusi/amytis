#!/usr/bin/env python3
"""Build the fonts the generated share cards (src/app/og/) render with.

Usage:
  python3 -m pip install fonttools brotli
  python3 scripts/build-og-fonts.py <full-NotoSerifSC-Bold.otf>

Writes src/fonts/og/. next/og (Satori) reads only ttf, otf and woff, so the
site's woff2 fonts are re-saved as plain TrueType. Chinese titles need a CJK
font: Noto Serif SC Bold (Serif/SubsetOTF/SC/NotoSerifSC-Bold.otf in the
notofonts/noto-cjk repository) is cut down to the 6,763 hanzi of GB2312 plus
CJK punctuation, plus any CJK character a title under content/ uses beyond
that. Without it, next/og fetches every missing glyph from Google Fonts during
the build, which stalls or prints boxes on offline and mainland-China builds.
Re-run after adding titles with rarer characters; until then those glyphs
still come from Google Fonts.
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

try:
    import brotli  # noqa: F401 -- fontTools needs it to read WOFF2
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("build-og-fonts.py needs fontTools and brotli: python3 -m pip install fonttools brotli")


ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
SRC_DIR = ROOT / "src" / "fonts"
OUT_DIR = SRC_DIR / "og"

# Site fonts re-saved for Satori: the card title is set in Baskerville, the
# kicker and meta lines in Inter.
WOFF2_TO_TTF = ["LibreBaskerville-Bold", "Inter-Regular", "Inter-Bold"]

PUNCTUATION_RANGES = [
    (0x00B7, 0x00B7),  # middle dot
    (0x2010, 0x2027),  # dashes, curly quotes, ellipsis
    (0x3000, 0x303F),  # CJK symbols and punctuation: 、。「」《》【】
    (0xFF00, 0xFFEF),  # fullwidth forms: ，！？：；（）
]


def gb2312_hanzi() -> list[int]:
    """The 6,763 hanzi of GB2312 (rows 16-87), which cover common modern text."""
    chars = []
    for row in range(0xB0, 0xF8):
        for cell in range(0xA1, 0xFF):
            try:
                chars.append(ord(bytes([row, cell]).decode("gb2312")))
            except UnicodeDecodeError:
                pass  # unassigned positions at the end of row 55
    return chars


# Frontmatter `title:` lines, including the entries of a book's chapter list,
# and rST `:title:` fields.
TITLE_LINE = re.compile(r"^\s*(?:-\s*)?:?title:\s*(.+)$", re.MULTILINE)


def content_title_chars() -> set[int]:
    """CJK characters (U+2E80 and up) used in any title under content/."""
    chars: set[int] = set()
    for path in CONTENT_DIR.rglob("*"):
        if path.suffix not in {".md", ".mdx", ".rst"}:
            continue
        for title in TITLE_LINE.findall(path.read_text(encoding="utf-8")):
            chars.update(ord(ch) for ch in title if ord(ch) >= 0x2E80)
    return chars


def convert_woff2(name: str) -> None:
    # recalcTimestamp off: a rebuild from the same inputs is byte-identical.
    font = TTFont(io.BytesIO((SRC_DIR / f"{name}.woff2").read_bytes()), recalcTimestamp=False)
    font.flavor = None
    font.save(OUT_DIR / f"{name}.ttf")


def subset_cjk(src: Path) -> None:
    font = TTFont(io.BytesIO(src.read_bytes()), recalcTimestamp=False)
    if len(font.getBestCmap()) < 20000:
        sys.exit(f"{src} is already a subset; pass the full upstream NotoSerifSC-Bold.otf")

    hanzi = gb2312_hanzi()
    if len(hanzi) != 6763:
        sys.exit(f"expected 6763 GB2312 hanzi, decoded {len(hanzi)}")
    options = subset.Options()
    options.layout_features = ["locl", "ccmp", "kern", "palt", "halt"]
    options.name_IDs = ["*"]  # keep the copyright and license records
    options.hinting = False  # rasterized at 52px and up; hints only add bytes
    subsetter = subset.Subsetter(options)
    punctuation = [cp for lo, hi in PUNCTUATION_RANGES for cp in range(lo, hi + 1)]
    extra = content_title_chars() - set(hanzi) - set(punctuation)
    subsetter.populate(unicodes=hanzi + punctuation + sorted(extra))
    print(f"GB2312 hanzi: {len(hanzi)}, extra title characters: {''.join(map(chr, sorted(extra)))}")
    subsetter.subset(font)
    subset.save_font(font, str(OUT_DIR / "NotoSerifSC-Bold.otf"), options)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in WOFF2_TO_TTF:
        convert_woff2(name)
    subset_cjk(Path(sys.argv[1]))
    for path in sorted(OUT_DIR.glob("*.[ot]tf")):
        print(f"{path.relative_to(ROOT)}: {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()

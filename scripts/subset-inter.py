#!/usr/bin/env python3
"""Subset the full upstream Inter fonts down to what this site renders.

Usage:
  python3 -m pip install fonttools brotli
  python3 scripts/subset-inter.py <dir-with-full-Inter-Regular-and-Bold.woff2>

Writes src/fonts/Inter-Regular.woff2 and src/fonts/Inter-Bold.woff2. The
input must be the full upstream files (Inter 4.001 is what shipped before
subsetting; `git show 95e5fb8:src/fonts/Inter-Regular.woff2` recovers it).
Re-run after adding a range below; subsetting an already-subset file can't
bring glyphs back, so the script refuses one.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

try:
    import brotli  # noqa: F401 -- fontTools needs it to read and write WOFF2
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("subset-inter.py needs fontTools and brotli: python3 -m pip install fonttools brotli")


WEIGHTS = ("Regular", "Bold")
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "fonts"

# Body text renders in Inter, so each range is something prose or UI chrome
# can show. Everything else (Cyrillic, Vietnamese, IPA, polytonic Greek,
# combining marks, private-use glyphs) falls back to the system sans, like
# CJK already does.
UNICODE_RANGES = [
    (0x0000, 0x00FF),  # Basic Latin, Latin-1 Supplement
    (0x0100, 0x017F),  # Latin Extended-A: most European languages, pinyin ā ō
    (0x01CD, 0x01DC),  # pinyin ǎ ǐ ǒ ǔ ǖ ǘ ǚ ǜ
    (0x02BB, 0x02BC),  # modifier apostrophes
    (0x02C6, 0x02C6),  # circumflex
    (0x02DA, 0x02DA),  # ring above
    (0x02DC, 0x02DC),  # small tilde
    (0x0370, 0x03FF),  # Greek: math variables in prose (λ θ π σ)
    (0x1D00, 0x1DBF),  # phonetic extensions: superscript modifier letters
    (0x2000, 0x206F),  # general punctuation: dashes, curly quotes, ellipsis
    (0x2070, 0x209F),  # superscripts and subscripts
    (0x20A0, 0x20CF),  # currency
    (0x2100, 0x214F),  # letterlike symbols
    (0x2150, 0x218F),  # number forms
    (0x2190, 0x21FF),  # arrows
    (0x2200, 0x22FF),  # math operators
    (0x2300, 0x23FF),  # misc technical (⌘ ⌥)
    (0x25A0, 0x25FF),  # geometric shapes
    (0x2600, 0x27BF),  # misc symbols, dingbats (✓ ✗ ⚠)
    (0xFEFF, 0xFEFF),  # byte order mark
    (0xFFFD, 0xFFFD),  # replacement character
]

# No CSS sets font-feature-settings or font-variant-*, so Inter's stylistic
# sets, character variants and numeric features (tnum, frac, sups) are dead
# weight. Keep what browsers apply by default.
LAYOUT_FEATURES = ["kern", "mark", "mkmk", "ccmp", "locl", "calt", "case"]


def subset_weight(src: Path, dst: Path) -> None:
    # Read into memory first so writing dst can't race a lazy read of src.
    font = TTFont(io.BytesIO(src.read_bytes()))
    if 0x0416 not in font.getBestCmap():  # Cyrillic Zhe: every full Inter has it
        sys.exit(f"{src} has no Cyrillic, so it is already a subset; pass the full upstream file")

    options = subset.Options()
    options.layout_features = LAYOUT_FEATURES
    options.name_IDs = ["*"]  # keep the copyright and license records
    options.flavor = "woff2"
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[cp for lo, hi in UNICODE_RANGES for cp in range(lo, hi + 1)])
    subsetter.subset(font)
    subset.save_font(font, str(dst), options)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src_dir = Path(sys.argv[1])
    for weight in WEIGHTS:
        src = src_dir / f"Inter-{weight}.woff2"
        dst = OUT_DIR / f"Inter-{weight}.woff2"
        before = src.stat().st_size
        subset_weight(src, dst)
        print(f"{dst.name}: {before:,} -> {dst.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

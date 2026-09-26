#!/usr/bin/env python
"""
Optimise the portfolio screenshots for the /work grid and the case-study hero.

The captures in 06-portfolio/assets/screenshots/ are full-page: 1019-1024px wide
and up to 12,880px tall. The site never shows more than a 16:10 band of any of
them (ProjectCover object-covers them inside an aspect-[16/10] or aspect-[16/9]
box), so shipping the whole page meant sending 3.9MB to paint a 322x201
thumbnail.

This script crops the band the site actually shows and writes three WebP files
per project:

  <name>.webp       hero    1024x640   used by the case-study hero (16:9 box)
  <name>-card.webp  card      800x500   used by every card grid
  <name>-full.webp  detail   720xN     the WHOLE page, for the case-study viewer

The first two are the 16:10 band off the top of the capture. The third is the
entire full-page screenshot, downscaled to 720px wide: the case study offers it
behind a "See the whole page" toggle, inside a scrolling frame, so a reader who
wants to judge the whole design can, without the grid paying for it. It is never
requested until that toggle is pressed, so it costs a /work visitor nothing.
720px is the widest that keeps all five files inside ~400 KB combined while
staying legible at the ~600px the frame paints them at.

The unsuffixed name is the hero because that is what seed.ts stores in
`coverImage`; ProjectCover builds the -card srcset entry from it, so the seed
only ever holds one path per project.

The crop offset is 0 for every project built here: the above-the-fold band is
the one worth showing and the one the site was already displaying. Each was
checked by eye for anything Ideovent must not republish — see the note beside
the disabled WTF Go entry in JOBS for the one case where the top band failed
that check.

Source files are never modified. Re-runnable.
"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.normpath(os.path.join(ROOT, "..", "..", "06-portfolio", "assets", "screenshots"))
OUT = os.path.join(ROOT, "public", "work")

HERO_W, HERO_H = 1024, 640  # 16:10, feeds the case-study hero box
CARD_W, CARD_H = 800, 500   # 16:10, feeds every card grid
FULL_W = 720                # full-page, height follows the capture
ASPECT = 10 / 16

# name -> y offset of the band to keep
JOBS = {
    "gym-map": 0,
    "wedart-films": 0,
    "atelier-co": 0,
    "tamkuhi-bazaar": 0,
    "aura-orbit": 0,
    # "wtfgo": 4569,
    #   DELIBERATELY NOT BUILT. WTF Go is the founder's work for Witness The
    #   Fitness Pvt. Ltd., and FACTS.md requires written IP permission before
    #   their interface is published — [[WTFGO_SCREENSHOT_PERMISSION]]. seed.ts
    #   carries coverImage: "" and a noImageReason for it. Uncomment this line
    #   the day permission arrives; 4569 is the one band on that page that shows
    #   the product without repeating the employer's own marketing counters.
}

# Onyx ships its own app screenshots; they are already the right shape, so they
# are only transcoded, not cropped.
ONYX = ["cover", "tour-01-welcome", "tour-03-open-settings", "tour-05-tip", "tour-08-done"]


def kb(path: str) -> float:
    return os.path.getsize(path) / 1024


def main() -> None:
    rows = []
    fulls: list[tuple[str, int, int, float]] = []

    for name, top in JOBS.items():
        src = os.path.join(SRC, f"{name}.png")
        im = Image.open(src).convert("RGB")
        w, h = im.size
        band = round(w * ASPECT)
        top = min(top, max(0, h - band))
        crop = im.crop((0, top, w, min(top + band, h)))

        hero_path = os.path.join(OUT, f"{name}.webp")
        card_path = os.path.join(OUT, f"{name}-card.webp")
        full_path = os.path.join(OUT, f"{name}-full.webp")
        crop.resize((HERO_W, HERO_H), Image.LANCZOS).save(hero_path, "WEBP", quality=82, method=6)
        crop.resize((CARD_W, CARD_H), Image.LANCZOS).save(card_path, "WEBP", quality=80, method=6)

        # The whole capture, uncropped. The registry in
        # src/components/ui/full-page-capture.tsx has to carry these exact
        # dimensions, so they are printed at the end of the run.
        full_h = round(h * FULL_W / w)
        im.resize((FULL_W, full_h), Image.LANCZOS).save(full_path, "WEBP", quality=70, method=6)
        fulls.append((name, FULL_W, full_h, kb(full_path)))

        # The full-page PNG this replaces, wherever it still is.
        old = os.path.join(OUT, f"{name}.png")
        before = kb(old) if os.path.exists(old) else kb(src)
        for stale in (old, os.path.join(OUT, f"{name}-1024.webp"), os.path.join(OUT, f"{name}-640.webp")):
            if os.path.exists(stale):
                os.remove(stale)

        rows.append((f"{name}", f"{w}x{h}", before, f"{HERO_W}x{HERO_H}",
                     kb(hero_path), f"{CARD_W}x{CARD_H}", kb(card_path)))

    for n in ONYX:
        p = os.path.join(OUT, "onyx", f"{n}.png")
        if not os.path.exists(p):
            continue
        im = Image.open(p)
        out = os.path.join(OUT, "onyx", f"{n}.webp")
        before = kb(p)
        im.save(out, "WEBP", quality=85, method=6)
        os.remove(p)
        rows.append((f"onyx/{n}", f"{im.size[0]}x{im.size[1]}", before,
                     f"{im.size[0]}x{im.size[1]}", kb(out), "-", 0.0))

    tb = sum(r[2] for r in rows)
    ta = sum(r[4] + r[6] for r in rows)
    print(f"{'file':<22}{'source':>12}{'before KB':>11}{'hero':>12}{'KB':>9}{'card':>10}{'KB':>8}")
    for r in rows:
        print(f"{r[0]:<22}{r[1]:>12}{r[2]:>11.0f}{r[3]:>12}{r[4]:>9.0f}{r[5]:>10}{r[6]:>8.0f}")
    print(f"{'TOTAL':<22}{'':>12}{tb:>11.0f}{'':>12}{'':>9}{'':>10}{ta:>8.0f}")
    print(f"saved {tb - ta:.0f} KB ({(1 - ta / tb) * 100:.1f}%)  [card + hero only]")

    if fulls:
        print()
        print("full-page captures — copy these into FULL_CAPTURES in")
        print("src/components/ui/full-page-capture.tsx:")
        for name, fw, fh, size in fulls:
            print(f'  ["{name}", {{ width: {fw}, height: {fh} }}],   // {size:.0f} KB')
        print(f"  on-demand total: {sum(f[3] for f in fulls):.0f} KB — fetched only when a reader opens the viewer")


if __name__ == "__main__":
    main()

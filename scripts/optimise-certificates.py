#!/usr/bin/env python
"""
Optimise the certificate scans served by /verify/:certId.

The two scans were pulled off i.postimg.cc and self-hosted (that host had one
asset time out at 25s and a certificate take 8.24s in the audit, on the one page
whose whole job is to look trustworthy). They landed as 1131x800 RGBA PNGs of
about 200 KB each.

Two things were wasteful about them:

  * RGBA for an image that is opaque. 2,262 of 904,800 pixels had alpha below
    255 — antialiasing on one edge, 0.25% of the frame. The alpha channel was
    costing a quarter of the file to describe nothing.
  * Truecolour for artwork with 7,481 distinct colours. An adaptive 256-colour
    palette reproduces it at a mean absolute error of 0.13/0.09/0.18 per channel
    out of 255, which is not visible, and halves the file again.

They stay PNG rather than becoming WebP on purpose: CertificateVerify's Download
button derives the saved filename's extension from this URL, and a certificate
somebody is going to attach to a job application should arrive as a .png.

Originals are copied to screenshots-src/certificates/ on first run and read from
there afterwards, so this is re-runnable without compounding the quantisation.

A certificate that is already a palette PNG is left alone (3 Oct 2026). The two
scans were reissued that day with a QR code for www.ideovent.in as palette PNGs,
while the copies banked in screenshots-src/ still carry the old ideovent.com
code: re-quantising from those would quietly put the old QR back. A file that is
not a palette PNG yet is a new original, so it is banked again before use.
"""
from __future__ import annotations

import os
import shutil

from PIL import Image, ImageChops, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "certificates")
SRC = os.path.join(ROOT, "screenshots-src", "certificates")

FILES = ["INT2025A73.png", "INT2025A74.png"]


def kb(path: str) -> float:
    return os.path.getsize(path) / 1024


def mode_of(path: str) -> str | None:
    if not os.path.exists(path):
        return None
    with Image.open(path) as im:
        return im.mode


def main() -> None:
    os.makedirs(SRC, exist_ok=True)
    rows = []

    for name in FILES:
        live = os.path.join(OUT, name)
        original = os.path.join(SRC, name)

        live_mode = mode_of(live)
        # Already optimised (see the docstring): never re-made from a banked copy.
        if live_mode == "P":
            print(f"  = {name}: already a palette PNG, left as it is")
            continue

        # First run, or a new scan put in public/certificates/: the live file IS the
        # original, so bank it before touching it.
        if live_mode is not None:
            shutil.copy2(live, original)
        elif not os.path.exists(original):
            print(f"  ! {name}: nothing to optimise")
            continue

        im = Image.open(original)
        before = kb(original)

        # Flatten onto white rather than dropping the channel, so the 0.25% of
        # semi-transparent edge pixels composite the way the page shows them
        # (the scan sits on a white card in both themes).
        flat = Image.new("RGB", im.size, (255, 255, 255))
        flat.paste(im, mask=im.getchannel("A") if im.mode in ("RGBA", "LA") else None)

        quantised = flat.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
        quantised.save(live, "PNG", optimize=True)

        diff = ImageChops.difference(flat, quantised.convert("RGB"))
        err = ImageStat.Stat(diff).mean

        rows.append((name, f"{im.size[0]}x{im.size[1]}", im.mode, before, kb(live), err))

    if not rows:
        return

    print(f"{'file':<20}{'size':>10}{'was':>6}{'before KB':>11}{'after KB':>10}{'saved':>8}   mean err R/G/B")
    for name, size, mode, before, after, err in rows:
        pct = (1 - after / before) * 100
        print(
            f"{name:<20}{size:>10}{mode:>6}{before:>11.0f}{after:>10.0f}{pct:>7.0f}%"
            f"   {err[0]:.2f}/{err[1]:.2f}/{err[2]:.2f}"
        )
    tb = sum(r[3] for r in rows)
    ta = sum(r[4] for r in rows)
    print(f"{'TOTAL':<20}{'':>10}{'':>6}{tb:>11.0f}{ta:>10.0f}{(1 - ta / tb) * 100:>7.0f}%")


if __name__ == "__main__":
    main()

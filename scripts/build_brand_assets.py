"""
Build the website's brand-derived assets from the REAL Ideovent logo.

Inputs (all in E:\\myagency\\01-brand\\logo):
  png/ideovent-lockup-white-1044.png   white reverse of the full stacked lockup
                                       (iV mark + IDEOVENT + TECHNOLOGIES),
                                       rasterised from ideovent-logo-white.svg
  png/ideovent-mark-white-512.png      the iV mark alone, white
  png/ideovent-avatar-512.png          white mark on a navy rounded square

Outputs (into public/):
  og/ideovent-og.png          1200x630 Open Graph / Twitter card
  favicon.ico                 16 / 32 / 48 px
  icons/icon-192.png
  icons/icon-512.png
  icons/icon-maskable-512.png
  icons/apple-touch-icon.png  180x180, opaque (iOS does not honour alpha)

Palette is anchored to _assets/brand.css: navy-900 #081738 is the logo colour,
navy-500 #2B55B8 and gold-500 #C8A951 are the document accents.

No photograph is used. Every pixel here comes from the logo.

Run:  python scripts/build_brand_assets.py
"""

import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
PUBLIC = os.path.join(SITE, "public")
LOGO = r"E:\myagency\01-brand\logo\png"

NAVY_900 = (0x08, 0x17, 0x38)
NAVY_500 = (0x2B, 0x55, 0xB8)
GOLD_500 = (0xC8, 0xA9, 0x51)
WHITE = (0xFF, 0xFF, 0xFF)

"""
THE CARD IS SET IN THE SITE'S OWN FACES, NOT IN SEGOE UI.

Until this pass the two lines on the Open Graph card were drawn in Segoe UI
Semibold and Segoe UI, i.e. in a Windows system font that appears nowhere on the
website, in no proposal, and in none of the printed brand. The card is the FIRST
thing anyone sees of Ideovent: it is what renders in WhatsApp, in a LinkedIn
post and in a Slack unfurl, usually before the link is ever opened. Setting it in
a different typeface from the page it links to is the same mistake as a business
card that does not match the letterhead.

It is now Sora and Instrument Serif Italic, the two display faces index.html
loads, used in exactly the roles the site uses them in:

  Sora 300      the headline, light, which is what the site's .text-hero and
                .text-display are set at (DESIGN-DIRECTION.md move 3: "Set
                display headings at 300 with a single 800 word, or the reverse.
                The jump is the design.")
  Instrument    ONE OR TWO WORDS of that headline, in italic, in gold. This is
  Serif Italic  `.accent-italic`, the single strongest "a person set this"
                signal the site has, and the reason the redesign exists. The
                home hero reads "We build websites, portals and *custom
                software.*"; the default card now closes on the same two words
                in the same face.
  Sora 400      the second line, the standfirst.

TWO FILES, VENDORED NEXT TO THIS SCRIPT. scripts/fonts/ holds the TTFs because
PIL cannot read the woff2 that src/assets/fonts/ carries, and because a build
that reaches out to fonts.googleapis.com is a build that fails on a train. Both
are SIL Open Font License 1.1, which permits redistribution; the licences travel
with the upstream repositories named below.

  Sora-var.ttf                Sora[wght].ttf, the variable font, axis 100..800.
                              Instanced per use with set_variation_by_axes.
                              github.com/google/fonts/tree/main/ofl/sora
  InstrumentSerif-Italic.ttf  Instrument Serif ships Regular and Italic at 400
                              and nothing else, which is why index.html asks
                              Google for `ital@1` and no weight axis.
                              github.com/google/fonts/tree/main/ofl/instrumentserif

THE ACCENT IS GOLD, AND ON THIS GROUND THAT IS ALLOWED. #C8A951 measures 2.27:1
on white and can never carry text there, which is why the light theme uses
gold-700 instead. On the card's #081738 it measures 7.77:1, well clear of AA,
and it is the same colour the dark theme already sets `.accent-italic` in.
"""
FONT_DIR = os.path.join(HERE, "fonts")
F_SORA = os.path.join(FONT_DIR, "Sora-var.ttf")
F_SERIF_ITALIC = os.path.join(FONT_DIR, "InstrumentSerif-Italic.ttf")


def sora(size, weight):
    """Sora at one weight. The variable font is instanced, not faux-bolded."""
    f = ImageFont.truetype(F_SORA, size)
    f.set_variation_by_axes([float(weight)])
    return f


def serif_italic(size):
    return ImageFont.truetype(F_SERIF_ITALIC, size)


def ensure(path):
    os.makedirs(path, exist_ok=True)
    return path


def load(name):
    return Image.open(os.path.join(LOGO, name)).convert("RGBA")


def fit_height(im, h):
    w = max(1, round(im.width * h / im.height))
    return im.resize((w, h), Image.LANCZOS)


def glow(size, colour, radius, centre, strength):
    """A soft radial wash, the same treatment the printed covers use.

    PIL's radial_gradient is 0 at the centre and 255 in the CORNERS, so the
    inscribed circle's edge sits at 255/sqrt(2). Rescaling to that value and
    clamping is what stops the gradient's own square from showing as a seam.
    """
    w, h = size
    d = radius * 2
    grad = Image.radial_gradient("L").resize((d, d), Image.LANCZOS)
    edge = 255.0 / (2 ** 0.5)
    mask_tile = grad.point(
        lambda v: int(255 * strength * max(0.0, 1.0 - v / edge) ** 1.6)
    )
    layer = Image.new("RGBA", (w, h), colour + (0,))
    alpha = Image.new("L", (w, h), 0)
    alpha.paste(mask_tile, (centre[0] - radius, centre[1] - radius))
    layer.putalpha(alpha)
    return layer


# ───────────────────────────── Open Graph card ─────────────────────────────
def _runs(parts, size):
    """(text, font, colour) for each fragment of a mixed sans/italic headline.

    `parts` is a list of (text, kind) where kind is "sans" or "accent".

    The serif italic needs the same corrections here that `.accent-italic`
    applies in index.css, and for the same reasons, because it is the same face
    set inline inside the same sans:

      size    x1.04. Instrument Serif's cap height is shorter than Sora's at the
              same em, so at 1.00 the accent word sits visibly small inside the
              line instead of reading as part of it.
      colour  gold. The accent is the one coloured thing in the sentence.
      bearing the italic leans right, so anything after it is advanced by a
              fraction of the em to stop the letters touching. On the page that
              is padding-right; here it is an explicit pen offset.
    """
    out = []
    for text, kind in parts:
        if kind == "accent":
            out.append((text, serif_italic(round(size * 1.04)), GOLD_500))
        else:
            out.append((text, sora(size, 300), WHITE))
    return out


def _is_italic(font):
    return os.path.basename(getattr(font, "path", "")) == os.path.basename(F_SERIF_ITALIC)


def _run_width(d, runs):
    w = 0.0
    for i, (text, font, _) in enumerate(runs):
        w += d.textlength(text, font=font)
        if _is_italic(font) and i + 1 < len(runs):
            w += font.size * 0.06          # the italic's right bearing
    return w


def build_og(filename, line1_parts, line2):
    """One 1200x630 card: navy ground, the real lockup, a gold rule, two lines.

    Every card is built from the same geometry so the default and the /work
    variant are visibly the same object with a different sentence. A social card
    that changes layout between pages reads as two different companies.

    `line1_parts` is the headline, split into (text, "sans" | "accent")
    fragments so the accent words can be set in the serif italic. ONE OR TWO
    WORDS, never the whole line: the same rule the site is held to.

    Every claim must survive _assets/FACTS.md. No stock imagery, no photograph,
    no metric, no client name, no count.
    """
    W, H = 1200, 630
    card = Image.new("RGBA", (W, H), NAVY_900 + (255,))
    card.alpha_composite(glow((W, H), NAVY_500, 760, (1140, 10), 0.55))
    card.alpha_composite(glow((W, H), GOLD_500, 620, (40, 660), 0.22))

    # 236px tall puts the stacked lockup about 265px wide, above the 180px
    # minimum width LOGO-USAGE.md section 4 sets for that file, so TECHNOLOGIES
    # still resolves. This card is the one place in the repo wide enough to set
    # the full lockup honestly; the site header uses the mark alone.
    lockup = fit_height(load("ideovent-lockup-white-1044.png"), 236)

    d = ImageDraw.Draw(card)

    size1, size2 = 40, 25
    runs1 = _runs(line1_parts, size1)
    f2 = sora(size2, 400)

    gap_rule, rule_h, gap_l1, gap_l2 = 46, 3, 34, 18
    h1, h2 = 46, 30
    block = lockup.height + gap_rule + rule_h + gap_l1 + h1 + gap_l2 + h2
    y = (H - block) // 2

    card.alpha_composite(lockup, ((W - lockup.width) // 2, y))
    y += lockup.height + gap_rule

    d.rectangle([W // 2 - 38, y, W // 2 + 38, y + rule_h - 1], fill=GOLD_500 + (255,))
    y += rule_h + gap_l1

    # A card is cropped hard by some clients; keep both sentences inside the
    # safe width rather than letting either run to the bleed.
    w1 = _run_width(d, runs1)
    w2 = d.textlength(line2, font=f2)
    assert w1 < W - 160, "line1 too wide: %.0fpx" % w1
    assert w2 < W - 160, "line2 too wide: %.0fpx" % w2

    # Mixed faces cannot be centred with anchor="mm" in one call, so the pen
    # starts at the measured left edge and every fragment is drawn on the same
    # BASELINE ("ls"). That is what keeps a serif italic sitting on the line
    # rather than floating by the difference between the two faces' ascenders.
    baseline = y + h1 - 12
    x = (W - w1) / 2
    for i, (text, font, colour) in enumerate(runs1):
        d.text((x, baseline), text, font=font, fill=colour + (255,), anchor="ls")
        x += d.textlength(text, font=font)
        if _is_italic(font) and i + 1 < len(runs1):
            x += font.size * 0.06
    y += h1 + gap_l2

    d.text((W // 2, y + h2 // 2), line2, font=f2, fill=WHITE + (190,), anchor="mm")

    out = ensure(os.path.join(PUBLIC, "og"))
    path = os.path.join(out, filename)
    card.convert("RGB").save(path, optimize=True)
    print("og  ", path, os.path.getsize(path) // 1024, "KB")


# ─────────────────────────────── icons ────────────────────────────────────
def build_icons():
    avatar = load("ideovent-avatar-512.png")          # white mark on navy square
    mark = load("ideovent-mark-white-512.png")

    icons = ensure(os.path.join(PUBLIC, "icons"))

    for size in (192, 512):
        p = os.path.join(icons, f"icon-{size}.png")
        avatar.resize((size, size), Image.LANCZOS).save(p, optimize=True)
        print("icon", p)

    # Maskable: full-bleed navy, mark kept inside the 80% safe circle.
    mask = Image.new("RGBA", (512, 512), NAVY_900 + (255,))
    inner = fit_height(mark.crop(mark.getchannel("A").getbbox()), 206)
    mask.alpha_composite(inner, ((512 - inner.width) // 2, (512 - inner.height) // 2))
    p = os.path.join(icons, "icon-maskable-512.png")
    mask.save(p, optimize=True)
    print("icon", p)

    # apple-touch-icon: iOS squares and opaques it anyway, so hand it a square.
    p = os.path.join(icons, "apple-touch-icon.png")
    Image.alpha_composite(
        Image.new("RGBA", (512, 512), NAVY_900 + (255,)), avatar
    ).resize((180, 180), Image.LANCZOS).convert("RGB").save(p, optimize=True)
    print("icon", p)

    p = os.path.join(PUBLIC, "favicon.ico")
    avatar.resize((64, 64), Image.LANCZOS).save(
        p, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("icon", p)


if __name__ == "__main__":
    # The same sentence the home hero opens with, closing on the same two words
    # in the same gold serif italic. Someone who taps a WhatsApp preview and
    # lands on the page meets the headline twice, set the same way both times.
    build_og(
        "ideovent-og.png",
        [("Websites, portals and ", "sans"), ("custom software.", "accent")],
        "Ideovent Technologies  ·  Saket, New Delhi, India",
    )
    # /work and the case studies. "Open and use" is the page's own framing and
    # is literally true — every project listed there has a live URL that
    # returns 200, which is why no count and no result is claimed here.
    build_og(
        "ideovent-og-work.png",
        [("Client projects you can ", "sans"), ("open and use.", "accent")],
        "Selected work  ·  Ideovent Technologies, Saket, New Delhi",
    )
    build_icons()

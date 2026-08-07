"""
Build the DesiZoom flyer as a real PDF.

    python3 make_flyer.py

Reads  shreyan.jpg  from this folder if present (any of .jpg/.jpeg/.png).
Writes DesiZoom-flyer.pdf next to it.

Re-run this any time the wording changes — it's quicker than editing a PDF.
"""

import os
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdfcanvas

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "DesiZoom-flyer.pdf")
URL = "https://www.desizoom.com"

W, H = letter                      # 612 x 792 pt
M = 44                             # page margin

ORANGE = (0.918, 0.345, 0.047)     # #ea580c
DARK = (0.165, 0.082, 0.000)       # #2a1500
BODY = (0.290, 0.227, 0.165)       # #4a3a2a
MUTED = (0.420, 0.353, 0.282)      # #6b5a48
FAINT = (0.541, 0.478, 0.408)      # #8a7a68
CREAM = (1.000, 0.969, 0.929)      # #fff7ed
STONE = (0.957, 0.945, 0.918)      # #f4f1ea
RULE = (0.906, 0.871, 0.824)       # #e7ded2


def wrap(c, text, font, size, width):
    """Greedy wrap to a pixel width. Returns a list of lines."""
    c.setFont(font, size)
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def para(c, text, x, y, width, font="Helvetica", size=10.5, leading=15, color=BODY):
    c.setFillColorRGB(*color)
    for line in wrap(c, text, font, size, width):
        c.setFont(font, size)
        c.drawString(x, y, line)
        y -= leading
    return y


def bullet(c, text, x, y, width, size=10.6, leading=14.6):
    """A '›' bullet with a bold lead-in before the first ' — ' or full stop."""
    c.setFillColorRGB(*ORANGE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y - 0.5, "›")
    tx = x + 12
    tw = width - 12
    c.setFillColorRGB(*DARK)
    for i, line in enumerate(wrap(c, text, "Helvetica", size, tw)):
        c.setFont("Helvetica", size)
        c.drawString(tx, y, line)
        y -= leading
    return y - 7


def find_photo():
    for name in ("shreyan.jpg", "shreyan.jpeg", "shreyan.png", "Shreyan.jpg"):
        p = os.path.join(HERE, name)
        if os.path.exists(p):
            return p
    return None


def build():
    c = pdfcanvas.Canvas(OUT, pagesize=letter)
    c.setTitle("DesiZoom")

    # ── Header ───────────────────────────────────────────────────────────────
    y = H - M - 16
    c.setFillColorRGB(*DARK)
    c.setFont("Helvetica-Bold", 27)
    c.drawString(M, y, "Desi")
    dw = c.stringWidth("Desi", "Helvetica-Bold", 27)
    c.setFillColorRGB(*ORANGE)
    c.drawString(M + dw, y, "Zoom")
    zw = c.stringWidth("Zoom", "Helvetica-Bold", 27)

    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(M + dw + zw + 12, y + 1, "Everything desi, for your city")

    y -= 13
    c.setStrokeColorRGB(*ORANGE)
    c.setLineWidth(2.4)
    c.line(M, y, W - M, y)

    # ── Story ────────────────────────────────────────────────────────────────
    y -= 26
    photo_w, photo_h = 108, 137
    photo = find_photo()
    if photo:
        try:
            c.drawImage(ImageReader(photo), M, y - photo_h, width=photo_w, height=photo_h,
                        preserveAspectRatio=True, anchor="c", mask="auto")
        except Exception:
            photo = None
    if not photo:
        c.setFillColorRGB(*STONE)
        c.roundRect(M, y - photo_h, photo_w, photo_h, 7, stroke=0, fill=1)
        c.setFillColorRGB(*FAINT)
        c.setFont("Helvetica", 8)
        c.drawCentredString(M + photo_w / 2, y - photo_h / 2, "save shreyan.jpg here")

    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.8)
    c.roundRect(M, y - photo_h, photo_w, photo_h, 7, stroke=1, fill=0)

    c.setFillColorRGB(*DARK)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(M, y - photo_h - 14, "Shreyan Jamalpur")
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(M, y - photo_h - 25, "12th grade · Little Elm, TX")

    tx = M + photo_w + 20
    tw = W - M - tx
    ty = y - 2

    c.setFillColorRGB(*DARK)
    c.setFont("Helvetica-Bold", 21)
    c.drawString(tx, ty, "Everything desi.")
    ew = c.stringWidth("Everything desi. ", "Helvetica-Bold", 21)
    c.setFillColorRGB(*ORANGE)
    c.drawString(tx + ew, ty, "One place.")
    ty -= 26

    ty = para(c,
              "Whether you're looking for it or you're the one providing it — DesiZoom is where the "
              "desi community finds each other. Order dinner tonight, book a priest for the pooja, "
              "hire the caterer, buy garba tickets.",
              tx, ty, tw)
    ty -= 5
    ty = para(c,
              "And if you run the restaurant, the catering, the mehndi studio — this is where those "
              "families find you, order from you, and pay you directly. One platform, both sides of "
              "the counter.",
              tx, ty, tw)

    # ── Two columns ──────────────────────────────────────────────────────────
    story_bottom = min(ty, y - photo_h - 34)
    footer_line = M + 116
    gap = 16
    cw = (W - 2 * M - gap) / 2

    families = [
        "Order pickup from desi restaurants — no delivery-app fees, no marked-up prices",
        "Local deals, sweets and catering for every festival",
        "Book priests, caterers, mehndi artists and photographers for any occasion",
        "Temple events, garba nights and which desi films are in theatres",
    ]
    business = [
        "Keep 94% of every order — 6%, not the ~30% the delivery apps take",
        "Orders ring on your phone. Tap once to accept, once when ready",
        "Money goes straight to your bank — no monthly fee, no tablet, no contract",
        "Send us a photo of your menu and we'll set the whole thing up, free",
    ]

    # Measure first so the cards hug their content instead of leaving a dead
    # band inside them, then centre the pair in the space that's left.
    def card_height(items):
        h = 48
        for it in items:
            h += len(wrap(c, it, "Helvetica", 10.6, cw - 44)) * 14.6 + 7
        return h + 12

    ch = max(card_height(families), card_height(business))
    slack = (story_bottom - footer_line) - ch
    top = story_bottom - max(18, slack / 2)

    for i, (title, tcol, bg, items) in enumerate([
        ("FOR FAMILIES", (0.573, 0.439, 0.047), CREAM, families),
        ("FOR BUSINESSES", MUTED, STONE, business),
    ]):
        cx = M + i * (cw + gap)
        c.setFillColorRGB(*bg)
        c.roundRect(cx, top - ch, cw, ch, 11, stroke=0, fill=1)

        c.setFillColorRGB(*tcol)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(cx + 16, top - 24, title)

        by = top - 48
        for it in items:
            by = bullet(c, it, cx + 16, by, cw - 32)

    # A quiet line tying it to the area, and filling the gap honestly.
    band = top - ch - 24
    c.setFillColorRGB(*FAINT)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, band, "Little Elm · Frisco · Plano · The Colony — and wherever you are next")

    # ── Footer ───────────────────────────────────────────────────────────────
    fy = M + 116
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(1.6)
    c.line(M, fy, W - M, fy)

    qr = qrcode.QRCode(box_size=10, border=0)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2a1500", back_color="white")
    # Keep the QR in memory — writing a temp file into the repo folder can hit
    # permission issues depending on where this runs.
    from io import BytesIO
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qpath = ImageReader(buf)

    qs = 92
    qy = fy - 18 - qs
    c.drawImage(qpath, M, qy, width=qs, height=qs)

    fx = M + qs + 20
    c.setFillColorRGB(*ORANGE)
    c.setFont("Helvetica-Bold", 21)
    c.drawString(fx, fy - 38, "desizoom.com")

    c.setFillColorRGB(*BODY)
    c.setFont("Helvetica", 10)
    c.drawString(fx, fy - 55, "Scan the code, or just type the address. It's free.")

    c.setFillColorRGB(*DARK)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(fx, fy - 73, "No app store needed — add it to your home screen:")
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(fx, fy - 86, "iPhone: tap Share, then Add to Home Screen")
    c.drawString(fx, fy - 98, "Android: tap the Add button when it appears, or menu › Install app")

    c.setFillColorRGB(*FAINT)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W / 2, M - 4, "Built in Little Elm, Texas by Shreyan Jamalpur, a 12th grader who got tired of the hunt \u2014 and his dad")

    c.showPage()
    c.save()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()

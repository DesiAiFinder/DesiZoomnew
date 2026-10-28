# Regenerates marketing/desizoom-whatsapp.png — the WhatsApp share image.
#   python3 marketing/make_whatsapp_poster.py
#
# Fees here must match create-order-session (6%) and create-ticket-session (5%).
# If those change, change this and re-run.
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1700
CREAM=(251,246,236); NAVY=(61,21,9); ACCENT=(239,159,39); GOLD=(250,199,117)
TEXT=(44,26,16); MUTED=(138,117,99); BROWN=(133,79,11); SOFT=(250,238,218)
FD="/usr/share/fonts/truetype/dejavu"
def f(s,b=False,it=False):
    return ImageFont.truetype(f"{FD}/DejaVuSans-Oblique.ttf" if it else
                              (f"{FD}/DejaVuSans-Bold.ttf" if b else f"{FD}/DejaVuSans.ttf"), s)

img = Image.new("RGB",(W,H),CREAM); d = ImageDraw.Draw(img)

d.rectangle([0,0,W,250], fill=NAVY)
d.text((68,52),"Desi",font=f(62,True),fill=(255,255,255))
d.text((68+d.textlength("Desi",font=f(62,True)),52),"Zoom",font=f(62,True),fill=ACCENT)
d.text((68,136),"Everything desi in your city.",font=f(31),fill=GOLD)
d.text((68,180),"Events · Rooms · Services · Deals · Food",font=f(26),fill=(201,182,166))

def sect(label, lines, y0, size=28, gap=45):
    d.text((68,y0),label,font=f(24,True),fill=BROWN); y=y0+40
    for ln in lines:
        d.ellipse([72,y+11,84,y+23],fill=ACCENT)
        d.text((102,y),ln,font=f(size),fill=TEXT); y+=gap
    return y

y = sect("For all of us",[
 "Temple events, garba nights and melas, with tickets",
 "Rooms, roommates and rentals. No brokers.",
 "Caterers, priests, mehndi artists, photographers",
 "Local deals worth knowing about",
 "Desi radio, films and community news",
 "Order pickup from desi restaurants"], 288)

y += 6
d.rounded_rectangle([68,y,W-68,y+54], radius=12, fill=SOFT)
d.text((96,y+14),"Anyone can post. You don't need a business.",font=f(27,True),fill=BROWN)
y += 78

y = sect("For local businesses",[
 "Get found by desi customers nearby. Free listing.",
 "Post deals and events free, as often as you like",
 "Pickup orders at 6%, card fees included",
 "Event tickets at 5%, straight to your bank",
 "No monthly fee, no tablet, no contract"], y)

qr = qrcode.QRCode(box_size=10, border=1, error_correction=qrcode.constants.ERROR_CORRECT_H)
qr.add_data("https://www.desizoom.com"); qr.make(fit=True)
qi = qr.make_image(fill_color="#2c1a10", back_color="white").convert("RGB").resize((238,238), Image.NEAREST)

by = y + 16
d.rounded_rectangle([68,by,W-68,by+276], radius=22, fill=(255,255,255), outline=(236,223,201), width=2)
img.paste(qi,(100,by+19))
tx = 380
d.text((tx,by+52),"Scan the code, or tap the link below",font=f(24),fill=MUTED)
wf = f(46,True); x = tx
for part,col in (("Desi",TEXT),("Zoom",ACCENT),(".com",MUTED)):
    d.text((x,by+90),part,font=wf,fill=col); x += d.textlength(part,font=wf)
d.text((tx,by+152),"Free. Nothing to install.",font=f(24),fill=MUTED)
d.text((tx,by+184),"Add it to your home screen.",font=f(24),fill=MUTED)

fy = by + 300
d.rounded_rectangle([68,fy,W-68,fy+252], radius=22, fill=NAVY)
try:
    ph = Image.open(os.path.join(ROOT,"public","shreyan.jpg")).convert("RGB")
    ph = ImageOps.fit(ph,(126,158),Image.LANCZOS,centering=(0.5,0.22))
    m = Image.new("L",(126,158),0); ImageDraw.Draw(m).rounded_rectangle([0,0,126,158],radius=14,fill=255)
    img.paste(ph,(98,fy+30),m)
except Exception as e:
    print("photo:",e)
tx2 = 252
for i,ln in enumerate([
    '"The same questions come up repeatedly in our',
    "community. Who's a good caterer, is anyone renting",
    'a room, what time does garba start. Every time the',
    'answer was somewhere else: Instagram, Google,',
    'Facebook, four WhatsApp chats. So I built one place."']):
    d.text((tx2,fy+34+i*34),ln,font=f(23,it=True),fill=(222,206,192))
d.text((tx2,fy+206),"Shreyan Jamalpur · high school senior · Little Elm",font=f(22,True),fill=ACCENT)

# Contact
cy = fy + 252 + 36
d.text((68,cy),"Questions, or want to be listed?",font=f(25),fill=MUTED)
cf = f(25,True)
for row,(local,) in enumerate([("Info",),("Shreyan",)]):
    xx = 68
    for part,col in ((local,TEXT),("@Desi",MUTED),("Zoom",ACCENT),(".com",MUTED)):
        d.text((xx,cy+42+row*38),part,font=cf,fill=col); xx += d.textlength(part,font=cf)

out = os.path.join(ROOT,"marketing","desizoom-whatsapp.png")
img.save(out,"PNG",optimize=True)
print("bottom:", cy+42+38+30, "of", H, "->", out)

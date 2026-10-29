# Builds two share images:
#   marketing/desizoom-community.png  — WhatsApp groups, aimed at signups
#   marketing/desizoom-merchant.png   — restaurant and service owners
# Rates must match create-order-session (6%), create-booking-session (8%),
# create-ticket-session (5%).
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREAM=(251,246,236); NAVY=(61,21,9); ACCENT=(239,159,39); GOLD=(250,199,117)
TEXT=(44,26,16); MUTED=(138,117,99); BROWN=(133,79,11); SOFT=(250,238,218)
FD="/usr/share/fonts/truetype/dejavu"
def f(s,b=False,it=False):
    return ImageFont.truetype(f"{FD}/DejaVuSans-Oblique.ttf" if it else
        (f"{FD}/DejaVuSans-Bold.ttf" if b else f"{FD}/DejaVuSans.ttf"), s)

def qr_img(px=238):
    q=qrcode.QRCode(box_size=10,border=1,error_correction=qrcode.constants.ERROR_CORRECT_H)
    q.add_data("https://www.desizoom.com"); q.make(fit=True)
    return q.make_image(fill_color="#2c1a10",back_color="white").convert("RGB").resize((px,px),Image.NEAREST)

def header(d,sub,strap):
    d.rectangle([0,0,1080,250],fill=NAVY)
    d.text((68,52),"Desi",font=f(62,True),fill=(255,255,255))
    d.text((68+d.textlength("Desi",font=f(62,True)),52),"Zoom",font=f(62,True),fill=ACCENT)
    d.text((68,136),sub,font=f(31),fill=GOLD)
    d.text((68,180),strap,font=f(26),fill=(201,182,166))

def bullets(d,label,lines,y0,size=28,gap=45):
    d.text((68,y0),label,font=f(24,True),fill=BROWN); y=y0+40
    for ln in lines:
        d.ellipse([72,y+11,84,y+23],fill=ACCENT); d.text((102,y),ln,font=f(size),fill=TEXT); y+=gap
    return y

def qr_block(img,d,y):
    d.rounded_rectangle([68,y,1012,y+276],radius=22,fill=(255,255,255),outline=(236,223,201),width=2)
    img.paste(qr_img(),(100,y+19)); tx=380
    d.text((tx,y+52),"Scan the code, or tap the link below",font=f(24),fill=MUTED)
    wf=f(46,True); x=tx
    for part,col in (("Desi",TEXT),("Zoom",ACCENT),(".com",MUTED)):
        d.text((x,y+90),part,font=wf,fill=col); x+=d.textlength(part,font=wf)
    d.text((tx,y+152),"Free. Nothing to install.",font=f(24),fill=MUTED)
    d.text((tx,y+184),"Add it to your home screen.",font=f(24),fill=MUTED)
    return y+276

def contact(d,y):
    d.text((68,y),"Questions, or want to be listed?",font=f(25),fill=MUTED)
    cf=f(25,True)
    for row,local in enumerate(["Info","Shreyan"]):
        xx=68
        for part,col in ((local,TEXT),("@Desi",MUTED),("Zoom",ACCENT),(".com",MUTED)):
            d.text((xx,y+42+row*38),part,font=cf,fill=col); xx+=d.textlength(part,font=cf)
    return y+42+38+30

# ───────────────────────── community ─────────────────────────
H=1500; img=Image.new("RGB",(1080,H),CREAM); d=ImageDraw.Draw(img)
header(d,"Everything desi in your city.","Events, rooms, services, deals and food.")
y=bullets(d,"For all of us",[
 "Temple events, garba nights and melas, with tickets",
 "Rooms, roommates and rentals. No brokers.",
 "Caterers, priests, mehndi artists, photographers",
 "Local deals worth knowing about",
 "Desi radio, films and community news",
 "Order pickup from desi restaurants"],288)
y+=8
d.rounded_rectangle([68,y,1012,y+54],radius=12,fill=SOFT)
d.text((96,y+14),"Anyone can post. You don't need a business.",font=f(27,True),fill=BROWN)
y=qr_block(img,d,y+78)
fy=y+26
# This poster always goes out with Shreyan's WhatsApp message above it,
# and that message already tells the "same questions, four different apps"
# four seconds. So the panel does what the caption can't: says he is still
# building, and gives the Shreyan@ address below a reason to exist.
# The DTABS poster is the exception — it is posted with no caption at all,
# so it keeps the full quote.
d.rounded_rectangle([68,fy,1012,fy+290],radius=22,fill=NAVY)
ph=ImageOps.fit(Image.open(os.path.join(ROOT,"public","shreyan.jpg")).convert("RGB"),(126,158),Image.LANCZOS,centering=(0.5,0.22))
m=Image.new("L",(126,158),0); ImageDraw.Draw(m).rounded_rectangle([0,0,126,158],radius=14,fill=255)
img.paste(ph,(98,fy+30),m)
for i,ln in enumerate([
 '"The same questions come up repeatedly in our',
 "community. Where's a good desi deal, who's a good",
 'caterer, is anyone renting a room, what time does',
 'garba start. Every time the answer was somewhere',
 'else: Instagram, Google, Facebook, four WhatsApp',
 'chats. So I built one place."']):
    d.text((252,fy+34+i*34),ln,font=f(23,it=True),fill=(222,206,192))
d.text((252,fy+244),"Shreyan Jamalpur, high school senior, Little Elm",font=f(22,True),fill=ACCENT)
y=fy+290+30
d.text((68,y),"Own a business? List it free.",font=f(25,True),fill=BROWN)
print("community bottom:",contact(d,y+44),"of",H)
img.save(os.path.join(ROOT,"marketing","desizoom-community.png"),"PNG",optimize=True)

# ───────────────────────── merchant ─────────────────────────
H2=1180; im2=Image.new("RGB",(1080,H2),CREAM); d2=ImageDraw.Draw(im2)
header(d2,"Get found by desi customers nearby.","Free listing. No monthly fee. No contract.")
y=bullets(d2,"For local businesses",[
 "Free listing. Show what you offer and your hours.",
 "Post deals and events free, as often as you like.",
 "Food orders at 6%, card fees included.",
 "Service bookings at 8%. Event tickets at 5%.",
 "Money goes straight to your own bank account.",
 "No tablet, no contract, cancel any time."],288)
y+=6
d2.rounded_rectangle([68,y,1012,y+54],radius=12,fill=SOFT)
d2.text((96,y+14),"Your prices. Your customers. No markup.",font=f(27,True),fill=BROWN)
y=qr_block(im2,d2,y+78)
y+=30
d2.text((68,y),"Built in Little Elm by Shreyan Jamalpur, a high school senior.",font=f(24),fill=MUTED)
print("merchant bottom:",contact(d2,y+46),"of",H2)
im2.save(os.path.join(ROOT,"marketing","desizoom-merchant.png"),"PNG",optimize=True)

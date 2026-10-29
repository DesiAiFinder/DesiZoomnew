# DesiZoom poster for DTABS WhatsApp groups.
# Must stand alone: DTABS send the image with no caption, so there is no
# tappable link. The QR and the printed address carry everything, and the
# top band ties it to the event their members are already discussing.
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREAM=(251,246,236); NAVY=(61,21,9); ACCENT=(239,159,39); GOLD=(250,199,117)
TEXT=(44,26,16); MUTED=(138,117,99); BROWN=(133,79,11); SOFT=(250,238,218)
DEEP=(122,26,10)
FD="/usr/share/fonts/truetype/dejavu"
def f(s,b=False,it=False):
    return ImageFont.truetype(f"{FD}/DejaVuSans-Oblique.ttf" if it else
        (f"{FD}/DejaVuSans-Bold.ttf" if b else f"{FD}/DejaVuSans.ttf"), s)

W,H=1080,1650
img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img)

# Event band
d.rectangle([0,0,W,150],fill=DEEP)
d.text((68,30),"Going to the DTABS Diwali Mela on Nov 7?",font=f(32,True),fill=GOLD)
d.text((68,80),"Find it, and everything else desi nearby, on DesiZoom.",font=f(26),fill=(236,214,198))

# Brand header
d.rectangle([0,150,W,386],fill=NAVY)
d.text((68,190),"Desi",font=f(58,True),fill=(255,255,255))
d.text((68+d.textlength("Desi",font=f(58,True)),190),"Zoom",font=f(58,True),fill=ACCENT)
d.text((68,268),"Everything desi in your city.",font=f(30),fill=GOLD)
d.text((68,312),"Events, rooms, services, deals and food.",font=f(25),fill=(201,182,166))

def bullets(label,lines,y0,gap=45):
    d.text((68,y0),label,font=f(24,True),fill=BROWN); y=y0+40
    for ln in lines:
        d.ellipse([72,y+11,84,y+23],fill=ACCENT); d.text((102,y),ln,font=f(28),fill=TEXT); y+=gap
    return y

y=bullets("For all of us",[
 "Temple events, garba nights and melas, with tickets",
 "Rooms, roommates and rentals. No brokers.",
 "Caterers, priests, mehndi artists, photographers",
 "Local deals worth knowing about",
 "Desi radio, films and community news",
 "Order pickup from desi restaurants"],424)

y+=8
d.rounded_rectangle([68,y,W-68,y+54],radius=12,fill=SOFT)
d.text((96,y+14),"Anyone can post. You don't need a business.",font=f(27,True),fill=BROWN)
y+=78

# QR — no caption exists, so never say "tap the link below"
q=qrcode.QRCode(box_size=10,border=1,error_correction=qrcode.constants.ERROR_CORRECT_H)
q.add_data("https://www.desizoom.com"); q.make(fit=True)
qi=q.make_image(fill_color="#2c1a10",back_color="white").convert("RGB").resize((238,238),Image.NEAREST)
d.rounded_rectangle([68,y,W-68,y+276],radius=22,fill=(255,255,255),outline=(236,223,201),width=2)
img.paste(qi,(100,y+19)); tx=380
d.text((tx,y+52),"Scan the code, or go to",font=f(24),fill=MUTED)
wf=f(46,True); x=tx
for part,col in (("Desi",TEXT),("Zoom",ACCENT),(".com",MUTED)):
    d.text((x,y+90),part,font=wf,fill=col); x+=d.textlength(part,font=wf)
d.text((tx,y+152),"Free. Nothing to install.",font=f(24),fill=MUTED)
d.text((tx,y+184),"Add it to your home screen.",font=f(24),fill=MUTED)
y+=276

fy=y+26
d.rounded_rectangle([68,fy,W-68,fy+290],radius=22,fill=NAVY)
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
d.text((68,y+44),"Questions, or want to be listed?",font=f(25),fill=MUTED)
cf=f(25,True)
for row,local in enumerate(["Info","Shreyan"]):
    xx=68
    for part,col in ((local,TEXT),("@Desi",MUTED),("Zoom",ACCENT),(".com",MUTED)):
        d.text((xx,y+86+row*38),part,font=cf,fill=col); xx+=d.textlength(part,font=cf)
print("bottom:",y+86+38+30,"of",H)
img.save(os.path.join(ROOT,"marketing","desizoom-dtabs.png"),"PNG",optimize=True)

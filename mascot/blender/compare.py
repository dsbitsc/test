import sys
from PIL import Image
U='/root/.claude/uploads/bc990891-82d0-5b5e-8bd3-3510c65b77e3/'
refs={'ref1':'4eabed55-image.jpg','ref2':'f13ce267-image.jpg','ref3':'d4ce7b0e-image.jpg'}
views=sys.argv[2:]; out=sys.argv[1]
rows=[]
for v in views:
    a=Image.open(U+refs[v]).convert('RGB'); b=Image.open(f'renders/{v}.png').convert('RGB')
    h=640; a=a.resize((int(a.width*h/a.height),h)); b=b.resize((h,h)); rows.append((a,b))
W=max(a.width+b.width for a,b in rows)
sh=Image.new('RGB',(W,640*len(rows)),(255,255,255))
for i,(a,b) in enumerate(rows): sh.paste(a,(0,i*640)); sh.paste(b,(a.width,i*640))
sh.save(out)

"""Deterministic, mathematically scaled SVG figures for the authored questions."""
from pathlib import Path
out=Path('public/digital-sat/math')
def svg(content,title): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 300" role="img" aria-label="'+title+'"><rect width="460" height="300" fill="white"/><g font-family="Arial,sans-serif" font-size="13" fill="#17233d">'+content+'</g></svg>'
def plot(filename,title,points,xmax,ymax,line=None,labels=False,xtitle='x',ytitle='y'):
    sx=lambda x:55+360*x/xmax
    sy=lambda y:245-205*y/ymax
    c=f'<text x="55" y="20">{title}</text>'
    for i in range(6):
        xx=xmax*i/5;yy=ymax*i/5
        c+=f'<path d="M{sx(xx)} 40V245 M55 {sy(yy)}H415" stroke="#e0e5ee" fill="none"/><text x="{sx(xx)-7}" y="264">{xx:g}</text><text x="24" y="{sy(yy)+4}">{yy:g}</text>'
    c+='<path d="M55 40V245H415" fill="none" stroke="#17233d" stroke-width="2"/>'
    c+=f'<text x="420" y="250">{xtitle}</text><text x="45" y="34">{ytitle}</text>'
    if line:
        m,b=line;c+=f'<line x1="{sx(0)}" y1="{sy(b)}" x2="{sx(xmax)}" y2="{sy(m*xmax+b)}" stroke="#17233d" stroke-width="2"/>'
    for x,y in points:
        c+=f'<circle cx="{sx(x)}" cy="{sy(y)}" r="4" fill="#bf4934"/>'
        if labels:c+=f'<text x="{sx(x)+8}" y="{sy(y)-7}">({x:g}, {y:g})</text>'
    (out/filename).write_text(svg(c,title))
plot('line-intercepts.svg','Line ℓ',[(0,6),(8,0)],10,10,(-.75,6),True)
plot('temperature.svg','Temperature measurements',[(1,18),(3,24),(5,30)],10,45,None,True,'t','°C')
plot('residual.svg','Measurements and line of best fit',[(2,24),(5,27),(8,39),(10,47),(13,46),(15,55)],15,60,(2.4,18),True)
c='<text x="35" y="25">Activity survey</text>'
headers=['','Chess','No chess','Total'];rows=[['Soccer','18','12','30'],['No soccer','10','20','30'],['Total','28','32','60']]
for i,row in enumerate([headers]+rows):
 for j,text in enumerate(row):
  xx=25+102*j;yy=48+45*i;c+=f'<rect x="{xx}" y="{yy}" width="102" height="45" fill="none" stroke="#17233d"/><text x="{xx+9}" y="{yy+27}">{text}</text>'
(out/'two-way-table.svg').write_text(svg(c,'Activity survey two-way table'))
c='<text x="35" y="24">Data distributions</text>'
for name,ys,base in [('A',[2,4,6,8,10],100),('B',[1,4,6,8,11],205)]:
 c+=f'<text x="15" y="{base-40}">Set {name}</text><path d="M45 {base}H430" stroke="#17233d"/>'
 for n in range(13):
  xx=45+30*n;c+=f'<path d="M{xx} {base-4}v8" stroke="#17233d"/><text x="{xx-4}" y="{base+22}">{n}</text>'
 for n in ys:c+=f'<circle cx="{45+30*n}" cy="{base-14}" r="5" fill="#17233d"/>'
(out/'dotplots.svg').write_text(svg(c,'Dot plots of data sets A and B'))

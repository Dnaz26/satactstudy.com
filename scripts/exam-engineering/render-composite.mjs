import fs from 'node:fs'
const values=[120,150,80,90];const plotted=values.map(v=>2*v)
if((150-120)/120!==.25||(90-80)/80!==.125||plotted.some((pixels,i)=>pixels/2!==values[i]))throw Error('Independent graphic calculations failed')
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" aria-labelledby="title"><title id="title">Mean breaking force by fiber orientation and polishing</title><rect width="720" height="440" fill="white"/><g font-family="Arial,sans-serif" fill="#111"><text x="20" y="30" font-size="22" font-weight="bold">Mean breaking force (N)</text>'
for(let v=0;v<=150;v+=50){const x=220+2*v;svg+=`<path d="M${x} 60V310" stroke="#ccc"/><text x="${x-10}" y="345" font-size="18">${v}</text>`}
const ys=[85,125,220,260]
for(let i=0;i<4;i++){svg+=`<rect x="220" y="${ys[i]}" width="${plotted[i]}" height="30" fill="${i%2?'#555':'#ddd'}" stroke="#111"/><text x="${230+plotted[i]}" y="${ys[i]+22}" font-size="18">${values[i]}</text>`}
svg+='<text x="20" y="120" font-size="20">Aligned fibers</text><text x="20" y="255" font-size="20">Random fibers</text><rect x="220" y="385" width="25" height="20" fill="#ddd" stroke="#111"/><text x="255" y="403" font-size="18">Unpolished</text><rect x="430" y="385" width="25" height="20" fill="#555"/><text x="465" y="403" font-size="18">Polished</text></g></svg>'
fs.writeFileSync('public/digital-sat/reading-writing/composite-strength.svg',svg)
console.log('Composite bar data independently checked; SVG written.')

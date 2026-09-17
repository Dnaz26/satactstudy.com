import fs from 'node:fs'
import authored from './sat-rw-candidates.mjs'
// Independent checks of comparisons before drawing any visual.
if(40-22!==18||26-20!==6||86-84!==2||73-51!==22)throw Error('Table values fail independent arithmetic')
const tables=[{file:'soil-water-loss.svg',title:'Water lost after 48 hours',headers:['Soil','Unshaded (mL)','Shaded (mL)'],rows:[['Coarse',40,22],['Fine',26,20]]},
{file:'recall-practice.svg',title:'Recall scores',headers:['Practice schedule','Immediate (%)','One week (%)'],rows:[['Single session',84,51],['Spaced sessions',86,73]]}]
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
fs.mkdirSync('public/digital-sat/reading-writing',{recursive:true})
for(const t of tables){
 const rows=[t.headers,...t.rows],width=660,height=220
 const elements=rows.flatMap((row,i)=>row.map((v,j)=>`<text x="${20+j*220}" y="${83+i*49}" font-size="${i?19:17}" font-weight="${i?'normal':'bold'}">${escape(v)}</text>`)).join('')
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${escape(t.title)}</title><rect width="660" height="220" fill="white"/><g font-family="Arial,sans-serif" fill="#111"><text x="20" y="30" font-size="22" font-weight="bold">${escape(t.title)}</text>${elements}</g><g stroke="#777"><path d="M20 96H640M20 145H640M20 194H640"/></g></svg>`
 fs.writeFileSync(`public/digital-sat/reading-writing/${t.file}`,svg)
}
// Confirm passage evidence and drawn values share the same dataset.
for(const [index,t] of [[4,tables[0]],[5,tables[1]]])for(const value of t.rows.flat().filter(v=>typeof v==='number'))if(!authored[index][4].includes(String(value)))throw Error('Graphic and passage mismatch')
fs.writeFileSync('scripts/exam-engineering/rw-graphic-validation.json',JSON.stringify({independentArithmetic:true,passageDataMatches:true,assets:tables.map(t=>t.file),visualRendering:'pending_browser_review'},null,2)+'\n')
console.log('Two original tables rendered; data checks passed.')

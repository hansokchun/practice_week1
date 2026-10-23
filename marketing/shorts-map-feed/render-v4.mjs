import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile, mkdtemp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const sourceDirectory = join(dirname(fileURLToPath(import.meta.url)), 'sources');
const outputOption = process.argv.find(argument => argument.startsWith('--out='));
const output = resolve(outputOption?.slice('--out='.length) || 'output/shorts-rebuild-v4');
await mkdir(join(output, 'sources'), { recursive: true });
const definitions = ['photo.jpg', 'map.jpg', 'brand.png', 'main-full.jpg', 'main-scrolled.jpg']
  .map(name => [name, join(sourceDirectory, name)]);
for (const [name, source] of definitions) {
  await copyFile(source, join(output, 'sources', name));
}
const sourceBytes = await Promise.all(definitions.map(([name]) => readFile(join(output, 'sources', name))));
const [photo, map, brand, main, scrolled] = sourceBytes;
const data = (bytes, format='png') => `data:image/${format};base64,${bytes.toString('base64')}`;
const photoUrl=data(photo,'jpeg'),mapUrl=data(map,'jpeg'),brandUrl=data(brand);
// Stitch the unobscured area from the second actual screenshot over the floating
// map button in the first. This is a promo composition, not a production UI edit.
const unobscured = await sharp(scrolled).extract({left:100,top:276,width:340,height:130}).png().toBuffer();
const mainClean = await sharp(main).extract({left:0,top:0,width:540,height:1370})
  .composite([{input:unobscured,left:100,top:852}]).png().toBuffer();
const header = await sharp(mainClean).extract({left:0,top:0,width:540,height:76}).png().toBuffer();
await writeFile(join(output,'sources/main-clean.png'),mainClean);
const feedUrl=data(mainClean),headerUrl=data(header);
const smooth=(t,start,duration)=>{const p=Math.max(0,Math.min(1,(t-start)/duration));return p*p*p*(p*(p*6-15)+10);};
const ease=p=>1-(1-p)**3;
const mix=(a,b,p)=>a+(b-a)*p;
const n=x=>Number(x.toFixed(4));

// Slim white pin and leaf, morphing continuously into an exact rounded card.
// Ten cubic segments keep the marker/card contours compatible and tangent-smooth.
const pointMix=(a,b,p)=>a.map((v,i)=>mix(v,b[i],p));
function splitCurve(a,b,c,d,t=.5){
  const ab=pointMix(a,b,t),bc=pointMix(b,c,t),cd=pointMix(c,d,t);
  const abc=pointMix(ab,bc,t),bcd=pointMix(bc,cd,t),mid=pointMix(abc,bcd,t);
  return [[ab,abc,mid],[bcd,cd,d]];
}
const upper=splitCurve([0,-.5],[.29,-.5],[.5,-.32],[.5,-.12]);
const lower=splitCurve([.5,-.12],[.5,.10],[.13,.42],[0,.5],1/3);
const lowerTail=splitCurve(lower[0][2],...lower[1]);
const rightHalf=[...upper,lower[0],...lowerTail];
const leftHalf=rightHalf.map((curve,i)=>{
  const previous=i===0?[0,-.5]:rightHalf[i-1][2];
  return [curve[1],curve[0],previous].map(([x,y])=>[-x,y]);
}).reverse();
const pinCurves=[...rightHalf,...leftHalf];
function contour(w,h,r,progress){
  const x=r/w,y=r/h,k=.55228475;
  const card=[
    [[0,-.5],[.5-x,-.5],[.5-x,-.5]],
    [[.5-x+k*x,-.5],[.5,-.5+y-k*y],[.5,-.5+y]],
    [[.5,0],[.5,.5-y],[.5,.5-y]],
    [[.5,.5-y+k*y],[.5-x+k*x,.5],[.5-x,.5]],
    [[.5-x,.5],[0,.5],[0,.5]],
    [[0,.5],[-.5+x,.5],[-.5+x,.5]],
    [[-.5+x-k*x,.5],[-.5,.5-y+k*y],[-.5,.5-y]],
    [[-.5,0],[-.5,-.5+y],[-.5,-.5+y]],
    [[-.5,-.5+y-k*y],[-.5+x-k*x,-.5],[-.5+x,-.5]],
    [[-.5+x,-.5],[0,-.5],[0,-.5]]
  ];
  return 'M0 '+n(-h/2)+' '+card.map((curve,i)=>'C'+curve.map((p,j)=>{
    const [a,b]=pointMix(pinCurves[i][j],p,progress);return n(a*w)+' '+n(b*h);
  }).join(' ')).join(' ')+'Z';
}
const page={x:70,y:140,w:940,h:1640,s:940/540};
const target={x:page.x+108*page.s,y:page.y+422*page.s,w:324*page.s,h:405*page.s};
function frameSvg(t) {
  const pinEnter=smooth(t,.08,.24);
  const grow=smooth(t,.50,.84);
  const photoIn=smooth(t,.62,.30);
  const merge=smooth(t,1.50,.74);
  const pageEnter=smooth(t,1.48,.56);
  const scroll=smooth(t,2.32,.81)*318*page.s;
  const end=smooth(t,3.15,.22);
  const brandEnter=smooth(t,3.26,.23);
  const mapFade=1-smooth(t,.78,.52);
  const cardW=mix(mix(122,760,grow),target.w,merge);
  const cardH=mix(mix(166,1140,grow),target.h,merge);
  const cardX=mix(mix(534,540,grow),target.x+target.w/2,merge);
  const pageOffset=94*(1-ease(pageEnter));
  const cardY=mix(mix(824,950,grow),target.y+target.h/2+pageOffset,merge)-scroll;
  const radius=mix(mix(43,30,grow),16*page.s,merge);
  const shape=smooth(t,.53,.67);
  const border=mix(mix(5,12,grow),0,merge);
  const outer=contour(cardW,cardH,radius,shape);
  const innerW=cardW-border*2,innerH=cardH-border*2;
  const inner=contour(innerW,innerH,Math.max(5,radius-border),shape);
  const shadowAlpha=.13*(1-merge);
  const pinScale=.92+.08*ease(pinEnter);
  const sceneOpacity=1-end;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <radialGradient id="bg"><stop stop-color="#e7f0e9"/><stop offset="1" stop-color="#f8faf8"/></radialGradient>
    <linearGradient id="ceramic" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#edf5ef"/></linearGradient>
    <filter id="shadow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="16"/></filter>
    <clipPath id="page"><rect x="${page.x}" y="${page.y}" width="${page.w}" height="${page.h}" rx="34"/></clipPath>
    <clipPath id="photo"><path d="${inner}"/></clipPath>
  </defs>
  <rect width="1080" height="1920" fill="#f8faf8"/>
  <ellipse cx="540" cy="950" rx="690" ry="800" fill="url(#bg)"/>
  <g opacity="${n(sceneOpacity)}">
    <g opacity="${n(mapFade)}">
      <rect x="62" y="704" width="956" height="510" rx="30" fill="#173f36" opacity=".12" filter="url(#shadow)"/>
      <rect x="54" y="684" width="972" height="514" rx="28" fill="white"/>
      <image x="70" y="700" width="940" height="482" xlink:href="${mapUrl}"/>
      <ellipse cx="534" cy="907" rx="${n(35+48*pinEnter)}" ry="${n(11+15*pinEnter)}" fill="#245457" opacity="${n(.14*pinEnter*(1-grow))}"/>
      <ellipse cx="534" cy="907" rx="${n(44+74*pinEnter)}" ry="${n(15+25*pinEnter)}" fill="none" stroke="#245457" stroke-width="2" opacity="${n(.25*pinEnter*(1-grow))}"/>
    </g>
    <g opacity="${n(pageEnter)}" transform="translate(0 ${n(pageOffset)})">
      <rect x="${page.x+8}" y="${page.y+18}" width="${page.w-16}" height="${page.h}" rx="34" fill="#173f36" opacity=".12" filter="url(#shadow)"/>
      <g clip-path="url(#page)">
        <rect x="${page.x}" y="${page.y}" width="${page.w}" height="${page.h}" fill="#faf9f5"/>
        <image x="${page.x}" y="${n(page.y-scroll)}" width="${page.w}" height="${1370*page.s}" xlink:href="${feedUrl}"/>
      </g>
    </g>
    <g opacity="${n(pinEnter)}" transform="translate(${n(cardX)} ${n(cardY)}) scale(${n(mix(pinScale,1,grow))})">
      <path d="${outer}" transform="translate(1 12)" fill="#173f36" opacity="${n(shadowAlpha)}" filter="url(#shadow)"/>
      <path d="${outer}" fill="url(#ceramic)" stroke="#245457" stroke-width="${n(3.7*(1-grow))}" stroke-linejoin="round"/>
      <g opacity="${n(1-smooth(t,.58,.25))}" transform="translate(0 ${n(-cardH*.12)})"><path d="M-14 19 C-29-2-8-25 21-29 C25-7 11 18-14 19Z" fill="#245457"/><path d="M-14 20 C-10 5-1-5 13-18" fill="none" stroke="#f8faf8" stroke-width="2.5" stroke-linecap="round"/></g>
      <image opacity="${n(photoIn)}" x="${n(-innerW/2)}" y="${n(-innerH/2)}" width="${n(innerW)}" height="${n(innerH)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)" xlink:href="${photoUrl}"/>
    </g>
    <g opacity="${n(pageEnter)}" transform="translate(0 ${n(pageOffset)})" clip-path="url(#page)">
      <image x="${page.x}" y="${page.y}" width="${page.w}" height="${76*page.s}" xlink:href="${headerUrl}"/>
      <rect x="${page.x+1}" y="${page.y+1}" width="${page.w-2}" height="${page.h-2}" rx="33" fill="none" stroke="#ffffff" stroke-width="2"/>
    </g>
  </g>
  <g opacity="${n(brandEnter)}" transform="translate(540 960) scale(${n(.96+.04*ease(brandEnter))}) translate(-540 -960)">
    <image x="90" y="850" width="900" height="220" xlink:href="${brandUrl}"/>
  </g>
  </svg>`;
}

const frameDirectory=await mkdtemp(join(tmpdir(),'ikkyee-map-feed-v4-frames-'));
const samples=[0,24,48,84,111,135,162,183,213,239];
const stillsOnly=process.argv.includes('--stills');
const indexes=stillsOnly?samples:Array.from({length:240},(_,i)=>i);
const stills=[];
for(const i of indexes){
  const bytes=await sharp(Buffer.from(frameSvg(i/60))).png({compressionLevel:3}).toBuffer();
  await writeFile(join(frameDirectory,`frame-${String(i).padStart(3,'0')}.png`),bytes);
  if(samples.includes(i)){
    await writeFile(join(output,`still-${String(i).padStart(3,'0')}.png`),bytes);
    stills.push(await sharp(bytes).resize(216,384).png().toBuffer());
  }
  if(i%30===0)console.log(`Rendered ${i}/240 frames`);
}
await sharp({create:{width:1080,height:768,channels:3,background:'#fff'}})
  .composite(stills.map((input,i)=>({input,left:(i%5)*216,top:Math.floor(i/5)*384})))
  .png().toFile(join(output,'storyboard.png'));
await writeFile(join(output,'render-state.json'),JSON.stringify({frameDirectory,width:1080,height:1920,fps:60,frames:indexes.length,duration:4,audio:false,
  scenes:['actual map','slim leaf pin grows into photograph','photograph joins actual mobile main feed','feed scrolls with photograph','approved logo reveal'],
  timing:{pin:[.08,.50],photoMorph:[.50,1.34],joinFeed:[1.50,2.24],scroll:[2.32,3.13],brand:[3.26,4]}, easing:'quintic smoothstep; zero velocity and acceleration at transition boundaries',
  capture:{viewport:[540,960],scrollOffset:576,mainPhotoSlot:[108,422,324,405]},
  sources:definitions.map(([name],i)=>({name,sha256:createHash('sha256').update(sourceBytes[i]).digest('hex')})),
  notes:'Actual main-page screenshots composed for promotion. The featured photo replaces one recommendation card and moves with the feed. Google map attribution is retained. Decorative marker is not the brand master. No production website changes.'},null,2));
console.log(JSON.stringify({frameDirectory,output,stillsOnly}));

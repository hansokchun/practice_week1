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
const output = resolve(outputOption?.slice('--out='.length) || 'output/shorts-rebuild-v3');
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
const smooth=(t,start,duration)=>{const p=Math.max(0,Math.min(1,(t-start)/duration));return p*p*(3-2*p);};
const ease=p=>1-(1-p)**3;
const mix=(a,b,p)=>a+(b-a)*p;
const n=x=>Number(x.toFixed(4));

// A rounded photo-pin with a soft short pointer, continuously flattening into a
// rounded photograph. The approved brand master is a separate, unchanged image.
function bubble(w,h,r,tail) {
  const l=-w/2, right=w/2,top=-h/2,bottom=h/2-tail;
  const half=Math.min(20,tail*.85);
  return `M${n(l+r)} ${n(top)} H${n(right-r)} Q${n(right)} ${n(top)} ${n(right)} ${n(top+r)}
    V${n(bottom-r)} Q${n(right)} ${n(bottom)} ${n(right-r)} ${n(bottom)}
    H${n(half)} C${n(half*.55)} ${n(bottom)} 7 ${n(bottom+tail)} 0 ${n(bottom+tail)}
    C-7 ${n(bottom+tail)} ${n(-half*.55)} ${n(bottom)} ${n(-half)} ${n(bottom)}
    H${n(l+r)} Q${n(l)} ${n(bottom)} ${n(l)} ${n(bottom-r)} V${n(top+r)} Q${n(l)} ${n(top)} ${n(l+r)} ${n(top)} Z`;
}
const page={x:70,y:140,w:940,h:1640,s:940/540};
const target={x:page.x+108*page.s,y:page.y+422*page.s,w:324*page.s,h:405*page.s};
function frameSvg(t) {
  const pinEnter=smooth(t,.08,.21);
  const grow=smooth(t,.38,.60);
  const photoIn=smooth(t,.47,.23);
  const merge=smooth(t,1.12,.54);
  const pageEnter=smooth(t,1.12,.36);
  const scroll=smooth(t,1.73,.64)*318*page.s;
  const end=smooth(t,2.39,.15);
  const brandEnter=smooth(t,2.47,.15);
  const mapFade=1-smooth(t,.58,.43);
  const cardW=mix(mix(134,760,grow),target.w,merge);
  const cardH=mix(mix(152,1140,grow),target.h,merge);
  const cardX=mix(mix(534,540,grow),target.x+target.w/2,merge);
  const pageOffset=94*(1-ease(pageEnter));
  const cardY=mix(mix(831,950,grow),target.y+target.h/2+pageOffset,merge)-scroll;
  const radius=mix(mix(43,30,grow),16*page.s,merge);
  const tail=24*(1-grow);
  const border=mix(mix(10,12,grow),0,merge);
  const outer=bubble(cardW,cardH,radius,tail);
  const innerW=cardW-border*2,innerH=cardH-border*2-tail;
  const shadowAlpha=.13*(1-merge);
  const pinScale=.78+.22*ease(pinEnter);
  const sceneOpacity=1-end;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <radialGradient id="bg"><stop stop-color="#e7f0e9"/><stop offset="1" stop-color="#f8faf8"/></radialGradient>
    <linearGradient id="ceramic" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#edf5ef"/></linearGradient>
    <filter id="shadow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="16"/></filter>
    <clipPath id="page"><rect x="${page.x}" y="${page.y}" width="${page.w}" height="${page.h}" rx="34"/></clipPath>
    <clipPath id="photo"><rect x="${n(-innerW/2)}" y="${n(-cardH/2+border)}" width="${n(innerW)}" height="${n(innerH)}" rx="${n(Math.max(5,radius-border*.55))}"/></clipPath>
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
      <path d="${outer}" fill="url(#ceramic)" stroke="#245457" stroke-width="${n(3.5*(1-grow))}"/>
      <g opacity="${n(1-photoIn)}" transform="translate(0 ${n(-tail/2)})"><circle r="32" fill="#245457"/><circle r="10" fill="#f8faf8"/></g>
      <image opacity="${n(photoIn)}" x="${n(-innerW/2)}" y="${n(-cardH/2+border)}" width="${n(innerW)}" height="${n(innerH)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)" xlink:href="${photoUrl}"/>
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

const frameDirectory=await mkdtemp(join(tmpdir(),'ikkyee-map-feed-v3-frames-'));
const samples=[0,15,36,60,81,100,120,138,156,179];
const stillsOnly=process.argv.includes('--stills');
const indexes=stillsOnly?samples:Array.from({length:180},(_,i)=>i);
const stills=[];
for(const i of indexes){
  const bytes=await sharp(Buffer.from(frameSvg(i/60))).png({compressionLevel:3}).toBuffer();
  await writeFile(join(frameDirectory,`frame-${String(i).padStart(3,'0')}.png`),bytes);
  if(samples.includes(i)){
    await writeFile(join(output,`still-${String(i).padStart(3,'0')}.png`),bytes);
    stills.push(await sharp(bytes).resize(216,384).png().toBuffer());
  }
  if(i%30===0)console.log(`Rendered ${i}/180 frames`);
}
await sharp({create:{width:1080,height:768,channels:3,background:'#fff'}})
  .composite(stills.map((input,i)=>({input,left:(i%5)*216,top:Math.floor(i/5)*384})))
  .png().toFile(join(output,'storyboard.png'));
await writeFile(join(output,'render-state.json'),JSON.stringify({frameDirectory,width:1080,height:1920,fps:60,frames:indexes.length,duration:3,audio:false,
  scenes:['actual map','rounded photo-pin grows into photograph','photograph joins actual mobile main feed','feed scrolls with photograph','approved logo reveal'],
  timing:{pin:[.08,.38],photoMorph:[.38,.98],joinFeed:[1.12,1.66],scroll:[1.73,2.37],brand:[2.47,3]},
  capture:{viewport:[540,960],scrollOffset:576,mainPhotoSlot:[108,422,324,405]},
  sources:definitions.map(([name],i)=>({name,sha256:createHash('sha256').update(sourceBytes[i]).digest('hex')})),
  notes:'Actual main-page screenshots composed for promotion. The featured photo replaces one recommendation card and moves with the feed. Google map attribution is retained. Decorative marker is not the brand master. No production website changes.'},null,2));
console.log(JSON.stringify({frameDirectory,output,stillsOnly}));

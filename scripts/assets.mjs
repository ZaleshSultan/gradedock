import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../store-assets/', import.meta.url);
await mkdir(out,{recursive:true});await mkdir(new URL('../public/',import.meta.url),{recursive:true});
// Geometric, original icon. No stock images or external fonts.
const mark = `<path d="M146 312V218h54v94M229 312V173h54v139M312 312V126h54v186" fill="none" stroke="#f7f6f1" stroke-width="28" stroke-linecap="round"/><path d="m146 150 72-47 68 21 79-56" fill="none" stroke="#b8e4b3" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><circle cx="365" cy="68" r="13" fill="#b8e4b3"/><path d="M117 379h278" stroke="#b8e4b3" stroke-width="14" stroke-linecap="round"/>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#127868"/><g transform="translate(26 62) scale(.9)">${mark}</g></svg>`;
await writeFile(new URL('icon.svg',out),icon);
await writeFile(new URL('../public/icon.svg',import.meta.url),icon);
await sharp(Buffer.from(icon)).png().toFile(new URL('icon-512.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const feature = (language) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><rect width="1024" height="500" fill="#f7f6f1"/><circle cx="899" cy="179" r="254" fill="#e4ece4"/><rect x="692" y="93" width="254" height="310" rx="48" fill="#127868"/><g transform="translate(714 119) scale(.42)">${mark}</g><text x="66" y="161" font-family="Arial,sans-serif" font-size="62" font-weight="bold" fill="#182d39">GradeDock</text><text x="68" y="239" font-family="Arial,sans-serif" font-size="30" fill="#182d39">${language==='ru'?'Узнай, сколько нужно на финале.':'Know what you need on your final.'}</text><text x="68" y="289" font-family="Arial,sans-serif" font-size="24" fill="#566963">${language==='ru'?'Твои предметы. Твои веса. Твоя цель.':'Your courses. Your weights. Your goal.'}</text><text x="68" y="374" font-family="Arial,sans-serif" font-size="20" fill="#127868">${language==='ru'?'ОФЛАЙН  ·  БЕЗ РЕКЛАМЫ  ·  RU / EN':'OFFLINE  ·  NO ADS  ·  RU / EN'}</text></svg>`;
for(const lang of ['ru','en']) {await writeFile(new URL(`feature-${lang}.svg`,out),feature(lang));await sharp(Buffer.from(feature(lang))).flatten({background:'#f7f6f1'}).png().toFile(new URL(`feature-${lang}-1024x500.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1'));}
// Android launcher icons and vector adaptive foreground have large safe margins.
for(const [density,size] of Object.entries({'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192})) {
 const dir=new URL(`../android/app/src/main/res/mipmap-${density}/`,import.meta.url);await mkdir(dir,{recursive:true});
 for(const name of ['ic_launcher','ic_launcher_round']) {
   const mask=`<svg width="512" height="512"><${name==='ic_launcher_round'?'circle cx="256" cy="256" r="248"':'rect x="8" y="8" width="496" height="496" rx="100"'} fill="white"/></svg>`;
   const masked=await sharp(Buffer.from(icon)).composite([{input:Buffer.from(mask),blend:'dest-in'}]).png().toBuffer();
   await sharp(masked).resize(size,size).png().toFile(new URL(`${name}.png`,dir).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
 }
}
const adaptive=new URL('../android/app/src/main/res/mipmap-anydpi-v26/',import.meta.url);await mkdir(adaptive,{recursive:true});
const xml=`<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>`;
for(const name of ['ic_launcher','ic_launcher_round'])await writeFile(new URL(`${name}.xml`,adaptive),xml);
const drawable=new URL('../android/app/src/main/res/drawable/',import.meta.url);await mkdir(drawable,{recursive:true});
await writeFile(new URL('ic_launcher_foreground.xml',drawable),`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:strokeColor="#f7f6f1" android:strokeWidth="5" android:strokeLineCap="round" android:pathData="M35,66 L35,51 M48,66 L48,43 M61,66 L61,36 M31,74 L71,74"/><path android:strokeColor="#b8e4b3" android:strokeWidth="3" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent" android:pathData="M34,40 L45,33 L56,36 L69,26"/></vector>`);
const values=new URL('../android/app/src/main/res/values/',import.meta.url);await mkdir(values,{recursive:true});
await writeFile(new URL('ic_launcher_background.xml',values),'<resources><color name="ic_launcher_background">#127868</color></resources>');
console.log('Original store assets and Android launcher icons generated.');

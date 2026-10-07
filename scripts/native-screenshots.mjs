import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const adb=process.env.GRADEDOCK_ADB,endpoint=process.env.GRADEDOCK_CDP_URL;
if(!adb||!endpoint)throw new Error('Set test emulator GRADEDOCK_ADB and GRADEDOCK_CDP_URL.');
const cmd=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8'}).trim();
let browser=await chromium.connectOverCDP(endpoint,{noDefaults:true});let page=browser.contexts()[0].pages()[0];
const shots = new Set((process.env.GRADEDOCK_SCREENSHOT_SHOTS || '1,2,3,4').split(','));
const reconnect=async()=>{
 await browser.close();cmd('shell','am','force-stop','com.zaleshsultan.gradedock');cmd('shell','am','start','-W','-n','com.zaleshsultan.gradedock/.MainActivity');
 const pid=cmd('shell','pidof','com.zaleshsultan.gradedock');const port=cmd('forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`);
 for(let i=0;i<20;i++){try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{noDefaults:true});page=browser.contexts()[0].pages()[0];return;}catch{await new Promise(r=>setTimeout(r,200));}}
 throw new Error('Could not reconnect to QA WebView');
};
const capture=async(name)=>{await page.evaluate(()=>document.fonts.ready);cmd('shell','screencap','-p','/sdcard/gradedock-store.png');const file=resolve('store-assets',name);cmd('pull','/sdcard/gradedock-store.png',file);await writeFile(file,await sharp(await readFile(file)).removeAlpha().png().toBuffer());};
for(const lang of (process.env.GRADEDOCK_SCREENSHOT_LANGS || 'ru,en').split(',')) {
 const ru=lang==='ru';const make=(id,title,target,color,a)=>({id,title,target,color,assessments:a.map((v,i)=>({id:`${id}-${i}`,title:v[0],weight:v[1],points:v[2],maxPoints:v[3],dueDate:v[4]||''}))});
 const data={version:1,language:lang,courses:[
  make('math',ru?'Демо · Математика':'Demo · Mathematics',80,'#127868',[
   [ru?'Практические работы':'Coursework',30,26,30], [ru?'Промежуточный экзамен':'Midterm',30,21,30], [ru?'Финальный экзамен':'Final exam',40,null,100,'2026-10-21']]),
  make('net',ru?'Демо · Сети':'Demo · Networks',75,'#5962b5',[
   [ru?'Лабораторные':'Labs',50,42,50], [ru?'Проект сети':'Network project',25,null,100,'2026-10-15'], [ru?'Экзамен':'Exam',25,null,100,'2026-10-24']]),
  make('sec',ru?'Демо · Безопасность':'Demo · Security',85,'#ac6529',[
   [ru?'Практика':'Practice',40,36,40], [ru?'Защита проекта':'Project defense',60,null,100,'2026-10-18']])
 ]};
 await page.evaluate(async data=>{await window.Capacitor.nativePromise('Preferences','set',{key:'gradedock.data.v1',value:JSON.stringify(data)});},data);
 await reconnect();await page.locator('.forecast-value').waitFor();
 await page.locator('.course-heading').evaluate(el=>el.scrollIntoView({block:'start'}));
 if(shots.has('1'))await capture(`screenshot-${lang}-1-forecast-1080x1920.png`);
 if(shots.has('2')){await page.locator('.section-heading').scrollIntoViewIfNeeded();await capture(`screenshot-${lang}-2-scores-1080x1920.png`);}
 if(shots.has('3')){await page.getByRole('button',{name:ru?'План':'Plan',exact:true}).click();await page.locator('.plan-row').first().waitFor();await capture(`screenshot-${lang}-3-plan-1080x1920.png`);}
 if(shots.has('4')){await page.getByRole('button',{name:ru?'Настройки':'Settings',exact:true}).click();await page.locator('.settings-card').first().waitFor();await capture(`screenshot-${lang}-4-backup-1080x1920.png`);}
}
console.log('Requested real Android emulator screenshots captured with explicitly labeled sample data.');await browser.close();

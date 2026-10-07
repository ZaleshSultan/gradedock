import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const adb=process.env.GRADEDOCK_ADB,endpoint=process.env.GRADEDOCK_CDP_URL;
if(!adb||!endpoint)throw new Error('Set test emulator GRADEDOCK_ADB and GRADEDOCK_CDP_URL.');
const cmd=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8'});
const browser=await chromium.connectOverCDP(endpoint,{noDefaults:true});const page=browser.contexts()[0].pages()[0];
const capture=async(name)=>{await page.evaluate(()=>document.fonts.ready);cmd('shell','screencap','-p','/sdcard/gradedock-store.png');cmd('pull','/sdcard/gradedock-store.png',resolve('store-assets',name));};
for(const lang of ['ru','en']) {
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
 await page.reload();await page.locator('.forecast-value').waitFor();
 await capture(`screenshot-${lang}-1-forecast-1080x1920.png`);
 await page.locator('.section-heading').scrollIntoViewIfNeeded();await capture(`screenshot-${lang}-2-scores-1080x1920.png`);
 await page.getByRole('button',{name:ru?'План':'Plan',exact:true}).click();await page.locator('.plan-row').first().waitFor();await capture(`screenshot-${lang}-3-plan-1080x1920.png`);
 await page.getByRole('button',{name:ru?'Настройки':'Settings',exact:true}).click();await page.locator('.settings-card').first().waitFor();await capture(`screenshot-${lang}-4-backup-1080x1920.png`);
}
console.log('Eight real Android emulator screenshots captured with explicitly labeled sample data.');await browser.close();

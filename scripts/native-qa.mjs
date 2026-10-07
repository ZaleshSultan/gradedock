import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
const adb=process.env.GRADEDOCK_ADB;
const endpoint=process.env.GRADEDOCK_CDP_URL;
if(!adb||!endpoint)throw new Error('Set GRADEDOCK_ADB and GRADEDOCK_CDP_URL to the isolated test emulator.');
const cmd=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8'}).trim();
const browser=await chromium.connectOverCDP(endpoint,{noDefaults:true});const page=browser.contexts()[0].pages()[0];
const errors=[];page.on('pageerror',e=>errors.push(e.message));
if(await page.getByRole('button',{name:'Посмотреть демо'}).count())await page.getByRole('button',{name:'Посмотреть демо'}).click();
await page.locator('.forecast-value').waitFor();
const forecast=await page.locator('.forecast-value').textContent();
await page.getByRole('button',{name:'Настройки',exact:true}).click();
await page.getByRole('button',{name:'Экспорт JSON',exact:true}).click();
// Native sharing is asynchronous; wait for the exported app-cache file, then dismiss the chooser.
let backup;
for(let i=0;i<20;i++){try{backup=JSON.parse(cmd('shell','run-as','com.zaleshsultan.gradedock','cat','cache/exports/gradedock-backup.json'));break;}catch{await new Promise(r=>setTimeout(r,250));}}
if(!backup||backup.courses.length<1)throw new Error('Native backup missing');
let chooser=false;
for(let i=0;i<30;i++){const activities=cmd('shell','dumpsys','activity','activities');if(/topResumedActivity=.*(?:ChooserActivity|intentresolver)/.test(activities)){chooser=true;break;}await new Promise(r=>setTimeout(r,100));}
if(!chooser)throw new Error('Native share chooser did not open');
cmd('shell','input','keyevent','KEYCODE_BACK');
for(let i=0;i<30;i++){if(/topResumedActivity=.*com\.zaleshsultan\.gradedock/.test(cmd('shell','dumpsys','activity','activities')))break;await new Promise(r=>setTimeout(r,100));}
await page.getByRole('button',{name:'Предметы',exact:true}).click();
await page.locator('.forecast-value').waitFor();
const result={platform:await page.evaluate(()=>window.Capacitor.getPlatform()),forecast,nativeBackupCourses:backup.courses.length,nativeBackupVersion:backup.version,errors};
await mkdir('docs',{recursive:true});await writeFile('docs/native-qa.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));await browser.close();

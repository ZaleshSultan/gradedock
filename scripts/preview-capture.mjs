import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'Посмотреть демо'}).click();
await page.screenshot({path:'store-assets/preview-ru.png'});
console.log(JSON.stringify({errors,buttons:await page.getByRole('button').allTextContents(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
await browser.close();

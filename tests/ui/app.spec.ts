import {test,expect,type Page} from '@playwright/test';
const dialog=(page:Page)=>page.getByRole('dialog');
const demo=async(page:Page)=>{await page.goto('/');await page.getByRole('button',{name:'Посмотреть демо'}).click();await expect(page.locator('.forecast-value')).toContainText('82,5');};
test('real course creation, points/max, blank and zero, and persistence',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Добавить первый предмет'}).click();
  await dialog(page).getByLabel('Название предмета').fill('Networks');await dialog(page).getByRole('button',{name:'Создать предмет'}).click();
  await page.locator('.setup-card').getByRole('button',{name:'Добавить работу'}).click();
  await dialog(page).getByLabel('Название работы').fill('Labs');await dialog(page).getByLabel('Вес в итоговой оценке, %').fill('60');await dialog(page).getByLabel('Получено баллов').fill('48');await dialog(page).getByLabel('Максимум баллов').fill('60');await dialog(page).getByRole('button',{name:'Добавить работу'}).click();
  await expect(page.locator('.invalid-card')).toBeVisible();await expect(page.locator('.forecast-value')).toHaveCount(0);
  await page.getByRole('button',{name:'Добавить',exact:true}).click();await dialog(page).getByLabel('Название работы').fill('Exam');await dialog(page).getByLabel('Вес в итоговой оценке, %').fill('40');await dialog(page).getByLabel('Срок сдачи — необязательно').fill('2026-11-01');await dialog(page).getByRole('button',{name:'Добавить работу'}).click();
  await expect(page.locator('.forecast-value')).toContainText('80');await expect(page.getByRole('button',{name:'Редактировать Exam'})).toContainText('Не оценено');
  await expect(page.locator('.saving-indicator')).toHaveCount(0);await page.reload();await expect(page.getByRole('heading',{name:'Networks'})).toBeVisible();await expect(page.locator('.forecast-value')).toContainText('80');
  await page.getByRole('button',{name:'План',exact:true}).click();await expect(page.locator('.plan-list')).toContainText('Exam');
  await page.locator('.plan-row').click();await dialog(page).getByLabel('Получено баллов').fill('0');await dialog(page).getByRole('button',{name:'Сохранить работу'}).click();
  await expect(page.locator('.plan-list')).toHaveCount(0);await page.getByRole('button',{name:'Предметы',exact:true}).click();await expect(page.locator('.forecast-value')).toContainText('48');await expect(page.getByRole('button',{name:'Редактировать Exam'})).toContainText('0%');
});
test('invalid input cannot replace a grade; impossible target is explicit',async({page})=>{
  await demo(page);await page.getByRole('button',{name:'Редактировать Практические работы'}).click();await dialog(page).getByLabel('Получено баллов').fill('31');await dialog(page).getByRole('button',{name:'Сохранить работу'}).click();await expect(dialog(page).getByRole('alert')).toBeVisible();await dialog(page).getByRole('button',{name:'Закрыть / Close'}).click();await expect(page.locator('.forecast-value')).toContainText('82,5');
  await page.locator('.course-heading .icon-button').click();await dialog(page).getByLabel('Цель за весь курс, %').fill('90');await dialog(page).getByRole('button',{name:'Сохранить предмет'}).click();await expect(page.locator('.forecast-card')).toHaveClass(/unreachable/);
});
test('backup export/import needs confirmation and rejects corrupt backup',async({page})=>{
  await demo(page);await page.getByRole('button',{name:'Настройки',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт JSON',exact:true}).click();const file=await download;const path=await file.path();expect(file.suggestedFilename()).toBe('gradedock-backup.json');
  await page.getByLabel('Выбрать резервную копию').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":100}')});await expect(page.getByRole('status')).toContainText('Файл не подходит');await expect(dialog(page)).toHaveCount(0);
  await page.getByLabel('Выбрать резервную копию').setInputFiles(path!);await expect(dialog(page)).toBeVisible();await dialog(page).getByRole('button',{name:'Отмена'}).click();await expect(page.getByRole('heading',{name:'Настройки',exact:true})).toBeVisible();
  await page.getByLabel('Выбрать резервную копию').setInputFiles(path!);await dialog(page).getByRole('button',{name:'Заменить данные',exact:true}).click();await expect(page.locator('.forecast-value')).toContainText('82,5');
});
test('language persists and damaged stored data is preserved',async({page})=>{
  await demo(page);await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.getByRole('button',{name:'English',exact:true}).click();await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();await expect(page.locator('.saving-indicator')).toHaveCount(0);await page.reload();await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.evaluate(()=>localStorage.setItem('CapacitorStorage.gradedock.data.v1','broken-save'));await page.reload();await expect(page.locator('.recovery-panel')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('CapacitorStorage.gradedock.data.v1'))).toBe('broken-save');expect(await page.evaluate(()=>localStorage.getItem('CapacitorStorage.gradedock.recovery.v1'))).toBe('broken-save');
});
test('mobile layouts avoid horizontal overflow and do not make remote requests',async({page})=>{
  const remote:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('data:'))remote.push(r.url());});
  await demo(page);for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Настройки',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Предметы',exact:true}).click();}expect(remote).toEqual([]);
});

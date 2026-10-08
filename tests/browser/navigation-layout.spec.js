import {test,expect} from '@playwright/test';

test('侧栏空页与单屏布局：仅静态页面，不创建服务任务',async({page})=>{
  const errors=[];page.on('pageerror',reason=>errors.push(reason.message));
  await page.route('**/api/**',route=>route.request().url().endsWith('/api/health')?route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}):route.abort());await page.goto('/');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page).toHaveTitle('动作工坊');
  await expect(page.locator('.sidebar-title')).toHaveCount(0);
  await expect(page.locator('.brand')).toHaveText('动作工坊');
  await expect(page.locator('.brand-mark svg')).toHaveCount(1);
  await expect(page.locator('.topbar #download,.topbar #edit-export,.topbar #matting-export')).toHaveCount(0);
  await expect(page.locator('#download,#edit-export,#matting-export')).toHaveCount(0);
  await expect(page.locator('#export-workspace #export-download')).toHaveCount(1);
  await expect(page.locator('#workflow-steps [role=tab]')).toHaveCount(3);
  await expect(page.locator('#organize')).toBeDisabled();await expect(page.locator('#edit-back,#edit-finish')).toHaveCount(0);
  await expect(page.locator('#process-mode')).toBeHidden();
  await expect(page.locator('#extract-workspace .source-panel #open')).toBeVisible();
  await expect(page.locator('#results .section-title #play')).toBeVisible();
  await expect(page.locator('#results .section-title #play')).toBeDisabled();
  await expect(page.locator('.timeline #start,.timeline #end')).toHaveCount(2);
  await expect(page.locator('.parameters #start,.parameters #end')).toHaveCount(2);
  await expect(page.locator('.source-panel #range,.source-panel #start,.source-panel #end')).toHaveCount(0);
  await expect(page.locator('.topbar #open,.topbar #filename,.topbar #file')).toHaveCount(0);
  for(const size of [{width:1440,height:1000},{width:800,height:600},{width:390,height:844}]){
    await page.setViewportSize(size);
    expect(await page.evaluate(()=>{
      const fits=element=>{const r=element.getBoundingClientRect();return r.left>=0 && r.top>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;};
      return [...document.querySelectorAll('#workflow-steps,.topbar,#open,#filename,#play,.timeline label,.timeline input,#range,#extract-workspace .workarea,#extract-workspace .parameters')].every(fits) && document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth;
    })).toBe(true);
    await expect(page.locator('#workflow-steps')).toHaveAttribute('aria-orientation',size.width>700?'vertical':'horizontal');
    await page.screenshot({path:`output/acceptance/sidebar-empty-${size.width}.png`});
  }
  expect(errors).toEqual([]);
});

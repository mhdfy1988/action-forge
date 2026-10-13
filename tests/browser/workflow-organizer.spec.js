import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {addLegacyNode} from './workflow-legacy-fixture.js';

test('整理补齐：预览、独立导航、快捷键与恢复取消',async({page})=>{
  await page.goto('/workflow');await expect(page.locator('#organizeWorkbench')).toBeAttached();
  await page.evaluate(async()=>{
    const {createOrganizeWorkbench}=await import('/assets/workflow-organize-workbench.js');document.getElementById('organizeWorkbench').remove();
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const blob=await new Promise(resolve=>canvas.toBlob(resolve));
    const input={width:320,height:180,sequence:{formatVersion:2,canvas:{width:320,height:180}},frames:Array.from({length:4},(_,i)=>({id:`f${i}`,blob,durationSeconds:'1/12',sourceTimeSeconds:`${i}/12`}))};
    const work=createOrganizeWorkbench({context:()=>({node:{name:'补齐验收'},input,fingerprint:'tools',confirmed:false}),load:async()=>null,save:async()=>{},publish:async()=>{},notify(){}});await work.open('tools');
  });
  const work=page.locator('#organizeWorkbench'),cards=work.locator('.organize-frame');
  await work.getByRole('button',{name:'全不选',exact:true}).click();await expect(work.getByRole('button',{name:'播放',exact:true})).toBeDisabled();
  await work.getByRole('button',{name:'下一帧',exact:true}).click();await expect(work.locator('[data-view]')).toHaveText('原帧 002');
  await work.getByRole('button',{name:'查看原帧4',exact:true}).click();await work.getByRole('button',{name:'下一帧',exact:true}).click();await expect(work.locator('[data-view]')).toHaveText('原帧 004');
  await work.getByRole('button',{name:'100%',exact:true}).click();await expect(work.locator('[data-zoom]')).toHaveText('100%');
  await work.locator('.organize-stage').hover();await page.mouse.wheel(0,-120);await expect(work.locator('[data-zoom]')).toHaveText('112%');
  const box=await work.locator('.organize-stage').boundingBox();await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();await page.mouse.move(box.x+70,box.y+60);await page.mouse.up();expect(await work.locator('.organize-stage img').evaluate(image=>image.style.transform)).toContain('30px, 20px');
  const transfer=await page.evaluateHandle(()=>new DataTransfer());await cards.first().dispatchEvent('dragstart',{dataTransfer:transfer});await work.locator('.organize-strip').dispatchEvent('drop',{dataTransfer:transfer});await expect(cards.last().locator('.organize-thumbnail span')).toHaveText('001');await work.getByRole('button',{name:'撤销',exact:true}).click();
  await work.getByRole('button',{name:'适配',exact:true}).click();await work.getByRole('button',{name:'删除原帧2',exact:true}).click();await expect(cards).toHaveCount(3);
  await work.getByRole('button',{name:'重置',exact:true}).click();await work.getByRole('button',{name:'取消',exact:true}).click();await expect(cards).toHaveCount(3);
  await work.getByRole('button',{name:'重置',exact:true}).click();await work.locator('.organize-reset-dialog').getByRole('button',{name:'重置',exact:true}).click();await expect(cards).toHaveCount(4);
  await work.getByRole('button',{name:'撤销',exact:true}).click();await expect(cards).toHaveCount(3);
  await work.locator('.organize-strip').focus();await page.keyboard.press('Control+a');await expect(work.locator('[data-checked]')).toHaveText('勾选 3 帧');await page.keyboard.press('Escape');await expect(work.locator('[data-checked]')).toHaveText('勾选 0 帧');
  await work.getByRole('spinbutton',{name:'整理预览帧率'}).fill('60');await work.getByRole('spinbutton',{name:'整理预览帧率'}).blur();await work.getByRole('button',{name:'全选',exact:true}).click();await work.getByRole('button',{name:'播放',exact:true}).click();await expect(work.getByRole('button',{name:'播放',exact:true})).toBeVisible();
});

test('真实抽帧交接整理：查看勾选、交换、删除恢复、历史、确认、刷新与上游失效',async({page},info)=>{
  const file=info.outputPath('run.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12','-t','1','-c:v','libx264','-pix_fmt','yuv420p',file]);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/workflow');
  async function add(type){if(['extract-frames','organize-frames'].includes(type))await addLegacyNode(page,type);else await page.locator(`.node-tool[data-node-type="${type}"]`).click();return page.locator(`.workflow-node[data-node-id^="${type}-"]`);}
  async function wire(from,to){const a=await from.locator('.port-dot[data-direction=output]').boundingBox(),b=await to.locator('.port-dot[data-direction=input]').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();}
  const video=await add('action-video');await video.locator('input[type=file]').setInputFiles(file);await expect(video.locator('.mode-mark')).toHaveAttribute('data-status','ready');
  const box=await video.locator('.node-header').boundingBox();await page.mouse.move(box.x+40,box.y+10);await page.mouse.down();await page.mouse.move(box.x-310,box.y+10,{steps:10});await page.mouse.up();
  const extract=await add('extract-frames');await page.locator('#zoomFit').click();await wire(video,extract);await extract.locator('.node-header').click();await page.getByRole('button',{name:'打开抽帧工作台',exact:true}).click();await page.locator('#extractFps').fill('8');await page.locator('#extractRun').click();await expect(page.locator('#extractFrameGrid img')).toHaveCount(8);await page.locator('#backToCanvas').click();
  const organizer=await add('organize-frames');const ob=await organizer.locator('.node-header').boundingBox();await page.mouse.move(ob.x+40,ob.y+10);await page.mouse.down();await page.mouse.move(ob.x+600,ob.y+400,{steps:10});await page.mouse.up();await page.locator('#zoomFit').click();await wire(extract,organizer);await organizer.locator('.node-header').click();await page.getByRole('button',{name:'打开整理工作台',exact:true}).click();
  const work=page.locator('#organizeWorkbench'),cards=work.locator('.organize-frame');await expect(cards).toHaveCount(8);await work.getByRole('button',{name:'全不选',exact:true}).click();await work.getByRole('button',{name:'查看原帧3',exact:true}).click();await expect(work.locator('[data-view]')).toHaveText('原帧 003');await expect(work.locator('[data-checked]')).toHaveText('勾选 0 帧');await work.getByRole('checkbox',{name:'勾选原帧2',exact:true}).check();await expect(work.locator('[data-view]')).toHaveText('原帧 003');
  for(const viewport of [{width:1920,height:900},{width:1280,height:600},{width:800,height:900}]){await page.setViewportSize(viewport);await expect(work.getByRole('button',{name:'确认整理',exact:true})).toBeVisible();expect(await work.evaluate(root=>root.scrollWidth<=innerWidth+1)).toBe(true);if(viewport.width>=1280){await expect(work.getByRole('button',{name:'确认整理',exact:true})).toBeInViewport({ratio:1});expect(await work.locator('.organize-strip').evaluate(strip=>strip.getBoundingClientRect().top+strip.clientHeight-strip.querySelector('.organize-frame').getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(16);}}await page.setViewportSize({width:1440,height:1000});
  await work.getByRole('button',{name:'播放',exact:true}).click();await expect(work.locator('[data-view]')).toHaveText('原帧 002');await work.getByRole('button',{name:'暂停',exact:true}).click();
  const back=await work.getByRole('button',{name:'返回画布',exact:true}).boundingBox(),status=await work.locator('[data-status]').boundingBox();
  expect(back.x+back.width).toBeGreaterThan(1410);expect(status.x+status.width).toBeLessThan(back.x);
  await work.getByRole('button',{name:'删除原帧3',exact:true}).click();await expect(cards).toHaveCount(7);await expect(work.getByRole('checkbox',{name:'勾选原帧2',exact:true})).toBeChecked();await work.getByRole('button',{name:'撤销',exact:true}).click();await expect(cards).toHaveCount(8);await work.getByRole('button',{name:'恢复',exact:true}).click();await expect(cards).toHaveCount(7);
  await work.locator('summary').click();await work.getByRole('button',{name:'恢复原帧 3',exact:true}).click();await expect(cards).toHaveCount(8);
  await cards.nth(0).dragTo(cards.nth(2));await expect(cards.nth(0).locator('.organize-thumbnail span')).toHaveText('003');await expect(cards.nth(2).locator('.organize-thumbnail span')).toHaveText('001');
  await work.getByRole('button',{name:'删除原帧1',exact:true}).click();await expect(cards).toHaveCount(7);await page.reload();await organizer.locator('.node-header').click();await page.getByRole('button',{name:'打开整理工作台',exact:true}).click();await expect(cards).toHaveCount(7);await expect(cards.nth(0).locator('.organize-thumbnail span')).toHaveText('003');await expect(work.getByRole('button',{name:'撤销',exact:true})).toBeEnabled();
  await work.getByRole('button',{name:'全选',exact:true}).click();await work.getByRole('button',{name:'确认整理',exact:true}).click();await expect(work.locator('[data-status]')).toHaveText('已确认');
  await page.screenshot({path:info.outputPath('organize-workbench.png')});await work.getByRole('button',{name:'返回画布',exact:true}).click();await expect(organizer.locator('.mode-mark')).toHaveAttribute('data-status','ready');await expect(organizer.locator('.node-param-preview')).toContainText('7 帧');
  await organizer.locator('.node-header').click();await page.getByRole('button',{name:'打开整理工作台',exact:true}).click();
  await page.evaluate(()=>{window.organizerOriginalTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(){throw new DOMException('模拟磁盘已满','QuotaExceededError');};});
  await work.getByRole('button',{name:'删除原帧3',exact:true}).click();await expect(work.locator('[data-error]')).toContainText('模拟磁盘已满');await expect(cards).toHaveCount(7);await expect(work.locator('[data-status]')).toHaveText('未确认整理');
  await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.organizerOriginalTransaction;delete window.organizerOriginalTransaction;});
  await work.getByRole('button',{name:'全选',exact:true}).click();await work.getByRole('button',{name:'确认整理',exact:true}).click();await expect(work.locator('[data-status]')).toHaveText('已确认');await work.getByRole('button',{name:'返回画布',exact:true}).click();
  await page.reload();await expect(organizer.locator('.mode-mark')).toHaveAttribute('data-status','ready');await organizer.locator('.node-header').click();await page.getByRole('button',{name:'打开整理工作台',exact:true}).click();await work.getByRole('button',{name:'全选',exact:true}).click();await work.getByRole('button',{name:'删除勾选帧',exact:true}).click();await expect(cards).toHaveCount(0);await expect(work.getByRole('button',{name:'确认整理',exact:true})).toBeDisabled();await work.getByRole('button',{name:'撤销',exact:true}).click();await expect(cards).toHaveCount(7);await work.getByRole('button',{name:'返回画布',exact:true}).click();await expect(organizer.locator('.mode-mark')).toHaveAttribute('data-status','stale');
  await extract.locator('.node-header').click();await page.getByRole('button',{name:'打开抽帧工作台',exact:true}).click();await page.locator('#extractFps').fill('6');await page.locator('#extractFps').blur();await page.locator('#backToCanvas').click();await organizer.locator('.node-header').click();await expect(page.getByRole('button',{name:'打开整理工作台',exact:true})).toBeDisabled();
  expect(errors).toEqual([]);
});

test('整理长序列布局：600帧横向滚动、已删除列表内滚动与短屏确认可达',async({page},info)=>{
  await page.goto('/workflow');await expect(page.locator('#organizeWorkbench')).toBeAttached();
  // 隔离布局夹具：真实领域编辑器和工作台，不替代上一个真实抽帧闭环。
  await page.evaluate(async()=>{
    const {createOrganizeWorkbench}=await import('/assets/workflow-organize-workbench.js');document.getElementById('organizeWorkbench').remove();
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='#355a67';ctx.fillRect(0,0,320,180);const blob=await new Promise(resolve=>canvas.toBlob(resolve));
    const input={width:320,height:180,sequence:{formatVersion:2,canvas:{width:320,height:180}},frames:Array.from({length:600},(_,i)=>({id:`frame-${i}`,blob,durationSeconds:'1/12',sourceTimeSeconds:`${i}/12`}))};
    const work=createOrganizeWorkbench({context:()=>({node:{name:'长序列'},input,fingerprint:'layout',confirmed:false}),load:async()=>null,save:async()=>{},publish:async()=>{},notify(){}});await work.open('layout');
  });
  const work=page.locator('#organizeWorkbench');await expect(work.locator('.organize-frame')).toHaveCount(600);
  for(const viewport of [{width:1920,height:900},{width:1280,height:600}]){await page.setViewportSize(viewport);await expect(work.getByRole('button',{name:'确认整理',exact:true})).toBeInViewport({ratio:1});expect(await work.locator('.organize-strip').evaluate(strip=>strip.scrollWidth>strip.clientWidth)).toBe(true);}
  await work.getByRole('button',{name:'查看原帧600',exact:true}).click();await expect(work.locator('[data-view]')).toHaveText('原帧 600');await work.getByRole('button',{name:'删除勾选帧',exact:true}).click();await expect(work.locator('.organize-frame')).toHaveCount(0);await work.locator('summary').click();
  await expect(work.getByRole('button',{name:'确认整理',exact:true})).toBeInViewport({ratio:1});await work.getByRole('button',{name:'恢复原帧 600',exact:true}).click();await expect(work.locator('.organize-frame')).toHaveCount(1);await work.getByRole('button',{name:'撤销',exact:true}).click();await expect(work.locator('.organize-frame')).toHaveCount(0);await page.screenshot({path:info.outputPath('600-deleted-layout.png')});
});

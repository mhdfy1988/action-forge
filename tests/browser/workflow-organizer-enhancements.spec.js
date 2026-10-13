import {test,expect} from '@playwright/test';

async function fixture(page,{count=48,still=false}={}){
  await page.goto('/workflow');await expect(page.locator('#organizeWorkbench')).toBeAttached();
  // 真实PNG夹具经过生产工作线程解码与同一领域算法，不伪造候选结果。
  await page.evaluate(async({count,still})=>{
    const {createOrganizeWorkbench}=await import('/assets/workflow-organize-workbench.js');document.getElementById('organizeWorkbench').remove();
    const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;const ctx=canvas.getContext('2d'),frames=[];
    const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    for(let i=0;i<count;i++){
      ctx.fillStyle='rgb(0,240,0)';ctx.fillRect(0,0,24,24);box(10,5,4,12,'rgb(120,65,35)');box(11,6,2,2,'rgb(230,200,150)');
      const a=(still?0:i%12)*2*Math.PI/12;box(12+Math.cos(a)*5,11+Math.sin(a)*5,3,3,'rgb(240,25,20)');box(9-Math.cos(a)*4,15-Math.sin(a)*3,2,3,'rgb(50,55,140)');
      frames.push({id:`f${i}`,blob:await new Promise(resolve=>canvas.toBlob(resolve)),durationSeconds:'1/12',sourceTimeSeconds:`${i}/12`});
    }
    const input={width:24,height:24,sequence:{formatVersion:2,canvas:{width:24,height:24}},frames};window.fixtureFingerprint='periodic';window.fixtureSaves=0;
    window.fixtureWorkbench=createOrganizeWorkbench({context:()=>({node:{name:'循环验收'},input,fingerprint:window.fixtureFingerprint,confirmed:false}),load:async()=>null,save:async()=>{window.fixtureSaves++;},publish:async()=>{},notify(){}});await window.fixtureWorkbench.open('periodic');
  },{count,still});
  return page.locator('#organizeWorkbench');
}

test('真实循环分析：12帧候选、预览取消、确认一步历史与来源身份保留',async({page},info)=>{
  const work=await fixture(page),dialog=work.getByRole('dialog',{name:'寻找动作循环'}),cards=work.locator('.organize-frame');
  const order=()=>cards.locator('.organize-thumbnail span').allTextContents();const original=await order();
  await work.getByRole('button',{name:'全不选',exact:true}).click();await work.getByRole('button',{name:'查看原帧7',exact:true}).click();
  await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await expect(dialog.locator('[data-candidates] button').first()).toContainText('12 帧');await expect(dialog.locator('.frame-player-stage img')).toBeVisible();
  await dialog.press('Control+a');await dialog.press('Delete');expect(await order()).toEqual(original);
  await dialog.getByRole('button',{name:'播放',exact:true}).click();await expect(dialog.getByRole('button',{name:'暂停',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('loop-candidates.png')});await dialog.getByRole('button',{name:'取消',exact:true}).click();await expect(dialog).not.toBeVisible();expect(await order()).toEqual(original);await expect(work.locator('[data-view]')).toHaveText('原帧 007');await expect(work.locator('[data-checked]')).toHaveText('勾选 0 帧');
  await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await expect(dialog.locator('[data-candidates] button').first()).toContainText('12 帧');
  const label=await dialog.locator('[data-candidates] button[aria-pressed=true]').textContent(),positions=label.match(/位置 (\d+)–(\d+)/);const expected=original.slice(Number(positions[1])-1,Number(positions[2]));
  await dialog.getByRole('button',{name:'勾选此循环',exact:true}).click();await expect(cards).toHaveCount(48);expect(await order()).toEqual(original);expect(await cards.filter({has:page.locator('input:checked')}).locator('.organize-thumbnail span').allTextContents()).toEqual(expected);
  await work.getByRole('button',{name:'撤销',exact:true}).click();expect(await order()).toEqual(original);await expect(work.locator('[data-checked]')).toHaveText('勾选 0 帧');await work.getByRole('button',{name:'恢复',exact:true}).click();await expect(cards).toHaveCount(48);await expect(work.locator('[data-checked]')).toHaveText('勾选 12 帧');
});

test('单次/循环播放切换只影响预览，跨末帧后循环仍播放',async({page})=>{
  const work=await fixture(page,{count:8});await work.getByRole('spinbutton',{name:'整理预览帧率'}).fill('60');await work.getByRole('spinbutton',{name:'整理预览帧率'}).blur();
  await work.getByRole('button',{name:'单次',exact:true}).click();await work.getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(350);await expect(work.getByRole('button',{name:'暂停',exact:true})).toBeVisible();
  await work.getByRole('button',{name:'循环',exact:true}).click();await expect(work.getByRole('button',{name:'播放',exact:true})).toBeVisible();await expect(work.locator('[data-view]')).toHaveText('原帧 008');expect(await page.evaluate(()=>window.fixtureSaves)).toBe(0);
  await expect(work.locator('[data-duration]')).toHaveText('0.67 秒');
});

test('静止帧无候选；取消、关闭和上游变化不提交候选',async({page})=>{
  let work=await fixture(page,{still:true}),dialog=work.getByRole('dialog',{name:'寻找动作循环'});
  await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await expect(dialog.locator('[data-state]')).toHaveText('未找到可靠循环');await expect(dialog.getByRole('button',{name:'勾选此循环'})).toBeDisabled();await dialog.getByRole('button',{name:'关闭循环查找'}).click();await expect(dialog).not.toBeVisible();
  work=await fixture(page);dialog=work.getByRole('dialog',{name:'寻找动作循环'});await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await expect(dialog.locator('[data-candidates] button').first()).toBeVisible();
  await page.evaluate(()=>{window.fixtureFingerprint='changed';window.fixtureWorkbench.refresh();});await expect(dialog.locator('[data-state]')).toContainText('变化');await expect(dialog.locator('[data-candidates] button')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'勾选此循环'})).toBeDisabled();await dialog.getByRole('button',{name:'取消',exact:true}).click();await expect(work.locator('.organize-frame')).toHaveCount(48);expect(await page.evaluate(()=>window.fixtureSaves)).toBe(0);
});

test('分析失败与迟到结果隔离，Escape和取消后不复活',async({page})=>{
  await page.route('**/loop-worker.js',route=>route.fulfill({contentType:'text/javascript',body:"self.onmessage=()=>setTimeout(()=>self.postMessage({type:'error',message:'模拟分析失败'}),250)"}));
  const work=await fixture(page),dialog=work.getByRole('dialog',{name:'寻找动作循环'});await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await dialog.getByRole('button',{name:'取消',exact:true}).click();await page.waitForTimeout(350);await expect(dialog).not.toBeVisible();expect(await page.evaluate(()=>window.fixtureSaves)).toBe(0);
  await work.getByRole('button',{name:'寻找动作循环',exact:true}).click();await expect(dialog.locator('[data-state]')).toHaveText('模拟分析失败');await expect(dialog.getByRole('button',{name:'勾选此循环'})).toBeDisabled();await dialog.press('Escape');await expect(dialog).not.toBeVisible();await expect(work.locator('.organize-frame')).toHaveCount(48);
});

test('600帧按需缩略图：可见范围预取、离屏释放、排序反馈及关闭释放',async({page})=>{
  const work=await fixture(page,{count:600}),strip=work.locator('.organize-strip'),images=strip.locator('img');
  await expect.poll(()=>strip.getAttribute('data-loaded-thumbnails')).not.toBe('0');
  expect(await strip.locator('img[src]').count()).toBeLessThan(30);await expect(images.nth(500)).not.toHaveAttribute('src');
  await work.getByRole('button',{name:'查看原帧600',exact:true}).click();await expect(images.last()).toHaveAttribute('src',/^blob:/);await expect(images.first()).not.toHaveAttribute('src');expect(await strip.locator('img[src]').count()).toBeLessThan(30);
  await work.getByRole('button',{name:'查看原帧1',exact:true}).click();await images.first().scrollIntoViewIfNeeded();
  const cards=strip.locator('.organize-frame'),transfer=await page.evaluateHandle(()=>new DataTransfer());await cards.first().dispatchEvent('dragstart',{dataTransfer:transfer});await cards.nth(1).dispatchEvent('dragover',{dataTransfer:transfer});await expect(cards.nth(1)).toHaveClass(/drop-swap/);await expect(work.locator('.organize-hint')).toContainText('松开交换');
  await cards.nth(1).dispatchEvent('drop',{dataTransfer:transfer});await expect(cards.first().locator('span')).toHaveText('002');expect(await cards.first().evaluate(card=>card.getAnimations().length)).toBeGreaterThan(0);
  await work.getByRole('button',{name:'返回画布',exact:true}).click();await expect(strip).toHaveAttribute('data-loaded-thumbnails','0');
});

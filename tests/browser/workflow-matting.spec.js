import {test,expect} from '@playwright/test';

async function seed(page,count=4){
  await page.goto('/workflow');await expect(page.locator('#mattingWorkbench')).toBeAttached();
  await page.evaluate(async count=>{
    const core=await import('/assets/workflow-core.js'),{openWorkflowLibrary}=await import('/assets/workflow-library.js'),{putImage}=await import('/assets/workflow-image-store.js'),{hashBytes}=await import('/assets/workflow-extraction.js');
    const library=openWorkflowLibrary(),key=library.active().key,registry=await (await fetch('/assets/workflow-node-registry.json')).json();
    let graph=core.createWorkflowProject({id:JSON.parse(localStorage.getItem(key))?.id||'untitled-workflow'});
    graph=core.addNode(graph,registry.nodes.find(node=>node.type==='extract-frames'),{x:100,y:100});const source=graph.nodes.at(-1);
    graph=core.addNode(graph,registry.nodes.find(node=>node.type==='remove-background'),{x:500,y:100});const target=graph.nodes.at(-1);
    graph=core.addNode(graph,registry.nodes.find(node=>node.type==='process-frames'),{x:900,y:100});const downstream=graph.nodes.at(-1);
    graph=core.connectNodes(graph,registry,source.id,'frames',target.id,'frames');graph=core.connectNodes(graph,registry,target.id,'frames',downstream.id,'source');
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d'),frames=[];
    for(let i=0;i<count;i++){ctx.fillStyle='#0f0';ctx.fillRect(0,0,320,180);ctx.fillStyle='#c96';ctx.fillRect(110+i%20,40,80,100);const blob=await new Promise(resolve=>canvas.toBlob(resolve));frames.push({id:'a'.repeat(32)+'-'+String(i+1).padStart(6,'0'),sourceFrameIndex:i*2,sourceTimeSeconds:`${i}/12`,durationSeconds:'1/12',blob,contentHash:await hashBytes(await blob.arrayBuffer())});}
    const record={id:crypto.randomUUID(),kind:'frame-set/source',name:'跑步',width:320,height:180,contentHash:await hashBytes('fixture'),sequence:{formatVersion:2,canvas:{width:320,height:180},frames:frames.map(({blob,...frame})=>frame)},frames};await putImage(record);
    graph.assets.push({id:record.id,type:record.kind,revision:1,path:`media/${record.id}`,contentHash:record.contentHash});graph.results.push({nodeId:source.id,definitionVersion:1,resultSignature:record.contentHash,confirmed:true,outputs:[{port:'frames',asset:{id:record.id,revision:1}}]});
    localStorage.setItem(key,JSON.stringify(graph));
  },count);await page.reload();
  const node=page.locator('.workflow-node[data-node-id^="remove-background-"]');await node.locator('.node-header').click();await page.getByRole('button',{name:'打开透明背景工作台',exact:true}).click();return page.locator('#mattingWorkbench');
}
async function alpha(page,selector){return page.locator(selector).first().evaluate(async image=>{await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;return {corner:data[3],center:data[(25*canvas.width+20)*4+3],width:canvas.width,height:canvas.height};});}

test('透明背景返回画布位于右上角，窄屏不挤压状态且返回保留画布',async({page},info)=>{
  const work=await seed(page),back=work.getByRole('button',{name:'返回画布',exact:true});
  for(const viewport of [{width:1920,height:900},{width:1280,height:600},{width:800,height:900}]){
    await page.setViewportSize(viewport);await expect(back).toBeInViewport({ratio:1});
    const title=await work.locator('[data-title]').boundingBox(),status=await work.locator('[data-status]').boundingBox(),button=await back.boundingBox();
    expect(title.x+title.width).toBeLessThan(status.x);expect(status.x+status.width).toBeLessThan(button.x);
    expect(button.x+button.width).toBeGreaterThan(viewport.width-30);
    await page.screenshot({path:info.outputPath(`return-right-${viewport.width}.png`)});
  }
  const before=await page.locator('#canvasWorld').getAttribute('style');
  await back.click();await expect(work).toBeHidden();await expect(page.locator('.workflow-node')).toHaveCount(3);
  expect(await page.locator('#canvasWorld').getAttribute('style')).toBe(before);
  await page.getByRole('button',{name:'打开透明背景工作台',exact:true}).click();await expect(work).toBeVisible();
});

test('透明背景闭环：像素、播放、精修实时保存、刷新、下游整理及短屏',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));const work=await seed(page);
  await expect(work.getByRole('tab')).toHaveCount(0);await expect(work.locator('.matting-frame').first()).toContainText('001');await expect(work.locator('[data-frame-status]')).toHaveText('原帧 001 · 未处理');await expect(work).not.toContainText('NaN');
  await expect(work.locator('.matting-frame')).toHaveCount(4);await expect(work.locator('[data-publish]')).not.toBeVisible();
  await expect(work.getByRole('slider',{name:'原始帧与处理帧对比'})).not.toBeVisible();await expect(work.locator('[data-repair]')).toHaveCount(0);
  await work.getByRole('button',{name:'去除背景',exact:true}).click();await expect(work.locator('[data-status]')).toHaveText('待确认输出');await expect(work.locator('.is-pending')).toHaveCount(0);
  expect(await alpha(page,'#mattingWorkbench .matting-stage img')).toEqual({corner:0,center:128,width:320,height:180});
  const compare=work.getByRole('slider',{name:'原始帧与处理帧对比'});await expect(compare).toBeVisible();await compare.focus();await page.keyboard.press('Home');await expect(compare).toHaveValue('0');await expect(work.locator('.matting-comparison')).toHaveCSS('--split','0%');await page.keyboard.press('End');await expect(compare).toHaveValue('100');await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  const sliderBox=await compare.boundingBox();await page.mouse.move(sliderBox.x+sliderBox.width*.25,sliderBox.y+sliderBox.height/2);await page.mouse.down();await page.mouse.move(sliderBox.x+sliderBox.width*.6,sliderBox.y+sliderBox.height/2);await page.mouse.up();expect(Number(await compare.inputValue())).toBeGreaterThan(50);
  await expect(work.locator('.matting-preview-controls .matting-background')).toBeVisible();await expect(work.locator('.matting-settings .matting-background')).toHaveCount(0);await expect(work.locator('.matting-preview>header')).toHaveCount(0);
  const zoomBox=await work.locator('.matting-zoom-tools').boundingBox(),playBox=await work.locator('.matting-play-tools').boundingBox(),backgroundBox=await work.locator('.matting-background').boundingBox();expect(zoomBox.x+zoomBox.width).toBeLessThan(playBox.x);expect(playBox.x+playBox.width).toBeLessThan(backgroundBox.x);expect(Math.abs(playBox.y-backgroundBox.y)).toBeLessThan(20);
  const backgrounds=work.getByRole('group',{name:'检查背景'});await expect(backgrounds.locator('select')).toHaveCount(0);await expect(backgrounds.getByRole('button')).toHaveCount(4);
  for(const [name,value,color] of [['浅色背景','light','rgb(229, 229, 229)'],['深色背景','dark','rgb(11, 11, 11)'],['紫色背景','violet','rgb(114, 83, 176)']]){await backgrounds.getByRole('button',{name,exact:true}).click();await expect(work.locator('.matting-stage')).toHaveAttribute('data-background',value);await expect(backgrounds.locator('[aria-pressed=true]')).toHaveCount(1);await expect(work.locator('.matting-comparison>img').first()).toHaveCSS('background-color',color);expect((await alpha(page,'#mattingWorkbench .matting-stage img')).corner).toBe(0);}
  await backgrounds.getByRole('button',{name:'透明网格背景',exact:true}).click();await expect(work.locator('.matting-stage')).toHaveAttribute('data-background','checker');
  await page.screenshot({path:info.outputPath('sliding-comparison.png')});
  await work.getByRole('button',{name:'播放',exact:true}).click();await expect(work.getByRole('button',{name:'暂停',exact:true})).toBeVisible();await work.getByRole('button',{name:'暂停',exact:true}).click();
  await work.getByRole('button',{name:'查看原帧1',exact:true}).click();
  await work.getByRole('button',{name:'查看原帧1',exact:true}).dblclick();const dialog=work.getByRole('dialog',{name:'精修当前帧',exact:true}),editor=dialog.frameLocator('iframe');
  await expect(editor.locator('#resultImage')).toBeVisible();await expect(editor.getByRole('button',{name:'魔法棒',exact:true})).toBeVisible();await expect(editor.getByRole('button',{name:'恢复画笔',exact:true})).toBeVisible();
  await expect(editor.locator('body')).toHaveCSS('background-color','rgb(23, 23, 23)');await expect(editor.locator('.edit-toolbar')).toHaveCSS('background-color','rgb(32, 32, 32)');await page.screenshot({path:info.outputPath('dark-repair.png')});
  await editor.getByRole('button',{name:'去除画笔',exact:true}).click();const canvas=editor.locator('#resultImage');const rect=await canvas.boundingBox();await page.mouse.move(rect.x+rect.width*20/320,rect.y+rect.height*25/180);await page.mouse.down();await page.mouse.up();
  await expect(work.locator('[data-modified]')).toHaveText('1 帧');await dialog.getByRole('button',{name:'关闭精修',exact:true}).click();await expect(dialog).not.toBeVisible();
  const edited=await alpha(page,'#mattingWorkbench .matting-stage img');expect(edited.center).toBeLessThan(128);
  await work.getByRole('button',{name:'确认输出',exact:true}).click();await expect(work.locator('[data-status]')).toHaveText('已确认');
  await work.getByRole('button',{name:'重新去除背景',exact:true}).click();await work.locator('.matting-reprocess').getByRole('button',{name:'取消',exact:true}).click();expect((await alpha(page,'#mattingWorkbench .matting-stage img')).center).toBe(edited.center);
  for(const viewport of [{width:1920,height:900},{width:1280,height:600},{width:800,height:900}]){
    await page.setViewportSize(viewport);await expect(work.getByRole('button',{name:'确认输出',exact:true})).toBeInViewport({ratio:1});expect(await work.evaluate(root=>root.scrollWidth<=innerWidth+1)).toBe(true);
    const timeline=await work.locator('.matting-timeline').boundingBox(),preview=await work.locator('.matting-stage').boundingBox(),settings=await work.locator('.matting-settings').boundingBox();expect(timeline.y+timeline.height).toBeCloseTo(viewport.height,0);expect(preview.width).toBeLessThanOrEqual(761);expect(settings.x+settings.width).toBeCloseTo(viewport.width,0);await expect(work.locator('.matting-frame').first()).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`transparent-${viewport.width}.png`)});
  }
  await page.reload();await page.locator('.workflow-node[data-node-id^="remove-background-"] .node-header').click();await page.getByRole('button',{name:'打开透明背景工作台',exact:true}).click();await expect(work.locator('[data-modified]')).toHaveText('1 帧');expect((await alpha(page,'#mattingWorkbench .matting-stage img')).center).toBe(edited.center);
  await work.getByRole('slider',{name:'原始帧与处理帧对比'}).dblclick();await expect(editor.locator('#resultImage')).toBeVisible();
  // 模拟精修已提交但本机回读失败：不能关闭窗口或丢掉待同步结果。
  await page.route('**/api/workflow-matting/jobs/*/frames/*/current',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'验收模拟回读失败'})}));
  await editor.getByRole('button',{name:'恢复画笔',exact:true}).click();const again=await canvas.boundingBox();await page.mouse.click(again.x+again.width*20/320,again.y+again.height*25/180);
  await expect(dialog.locator('[data-repair-error]')).toContainText('本机保存失败');await expect(dialog).toBeVisible();
  await page.unroute('**/api/workflow-matting/jobs/*/frames/*/current');await dialog.getByRole('button',{name:'关闭精修',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(work.locator('[data-status]')).toHaveText('待确认输出');await work.getByRole('button',{name:'确认输出',exact:true}).click();await expect(work.locator('[data-status]')).toHaveText('已确认');
  await work.getByRole('button',{name:'返回画布',exact:true}).click();await page.locator('.workflow-node[data-node-id^="process-frames-"] .node-header').click();await page.getByRole('button',{name:'打开序列帧工作台',exact:true}).click();await expect(page.locator('#sequenceWorkbench .organize-frame')).toHaveCount(4);expect(errors).toEqual([]);
});

test('取消、重新处理确认、600帧按需缩略图',async({page},info)=>{
  const work=await seed(page,600);await expect(work.locator('.matting-frame')).toHaveCount(600);await expect.poll(()=>work.locator('.matting-frame img[src]').count()).toBeGreaterThan(0);expect(await work.locator('.matting-frame img[src]').count()).toBeLessThan(30);
  await work.getByRole('button',{name:'查看原帧600',exact:true}).click();await expect(work.locator('.matting-frame').last().locator('img')).toHaveAttribute('src',/^blob:/);await expect(work.locator('.matting-frame').first().locator('img')).not.toHaveAttribute('src');
  await work.getByRole('button',{name:'去除背景',exact:true}).click();await expect(work.locator('[data-publish]')).not.toBeVisible();await work.getByRole('button',{name:'取消任务',exact:true}).click();await expect(work.locator('[data-error]')).toContainText('取消');await expect(work.locator('[data-status]')).toHaveText('等待去除背景');await expect(work.locator('[data-publish]')).not.toBeVisible();await page.screenshot({path:info.outputPath('long-cancelled.png')});
});

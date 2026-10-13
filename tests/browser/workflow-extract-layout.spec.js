import {test,expect} from '@playwright/test';

test('抽帧工作台布局：121帧、桌面单屏与窄屏操作可达',async({page},info)=>{
  await page.goto('/workflow');
  // 隔离布局夹具，仅检查真实组件的排版；真实FFmpeg闭环由workflow-extraction.spec覆盖。
  await page.evaluate(async()=>{
    const {createExtractWorkbench}=await import('/assets/workflow-extract-workbench.js');
    document.getElementById('extractWorkbench').remove();
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#193d32';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#b9c9bf';ctx.fillRect(450,120,240,480);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const frames={width:1280,height:720,frames:Array.from({length:121},(_,i)=>({blob,durationSeconds:'1/12',sourceTimeSeconds:`${i}/12`}))};
    const workbench=createExtractWorkbench({context:()=>({node:{name:'跑步 · 右',parameters:{startSeconds:0,endSeconds:10.048005,fps:12}},status:{key:'ready',label:'已就绪'},video:null,videoReady:true,frames}),changeParameters(){},run(){},cancel(){}});
    workbench.open('layout-test');
  });
  for(const viewport of [{width:1920,height:900},{width:1440,height:900},{width:1366,height:768},{width:1280,height:600}]){
    await page.setViewportSize(viewport);
    const back=await page.locator('#backToCanvas').boundingBox(),status=await page.locator('#extractWorkStatus').boundingBox();
    expect(back.x+back.width).toBeGreaterThan(viewport.width-30);expect(status.x+status.width).toBeLessThan(back.x);
    await expect(page.locator('.workflow-topbar')).toBeVisible();
    expect(await page.locator('.workflow-app').evaluate(element=>element.inert)).toBe(false);
    expect(await page.locator('#canvasViewport').evaluate(element=>element.inert)).toBe(true);
    await expect.poll(()=>page.evaluate(()=>document.getElementById('extractWorkbench').getBoundingClientRect().top-document.querySelector('.workflow-topbar').getBoundingClientRect().bottom)).toBe(0);
    await expect(page.locator('#extractRun')).toBeInViewport({ratio:1});
    await expect(page.locator('#extractStart')).toBeInViewport({ratio:1});
    await expect(page.locator('#extractStart')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    const parameterRows=await page.locator('#extractWorkbench .extract-settings input').evaluateAll(inputs=>inputs.map(input=>{const box=input.getBoundingClientRect();return {right:box.right,top:box.top};}));
    expect(Math.max(...parameterRows.map(row=>row.right))-Math.min(...parameterRows.map(row=>row.right))).toBeLessThan(1);
    expect(parameterRows[1].top).toBeGreaterThan(parameterRows[0].top);
    expect(parameterRows[2].top).toBeGreaterThan(parameterRows[1].top);
    const actionLayout=await page.evaluate(()=>{
      const estimate=document.getElementById('extractEstimate').getBoundingClientRect(),run=document.getElementById('extractRun').getBoundingClientRect(),panel=document.querySelector('#extractWorkbench .extract-source'),style=getComputedStyle(panel);
      return {sameRow:Math.abs((estimate.top+estimate.bottom)/2-(run.top+run.bottom)/2),bottomGap:panel.getBoundingClientRect().bottom-run.bottom-parseFloat(style.paddingBottom)};
    });
    expect(actionLayout.sameRow).toBeLessThan(1);
    expect(Math.abs(actionLayout.bottomGap)).toBeLessThan(1);
    await expect(page.locator('#extractResultPlayer .frame-player-controls')).toBeInViewport({ratio:1});
    const metrics=await page.evaluate(()=>{
      const content=document.querySelector('#extractWorkbench .extract-workbench-content'),preview=document.querySelector('#extractWorkbench .extract-preview'),timeline=document.querySelector('#extractWorkbench .extract-timeline'),grid=document.getElementById('extractFrameGrid');
      return {contentHeight:content.clientHeight,contentScroll:content.scrollHeight,previewWidth:preview.clientWidth,timelineWidth:timeline.clientWidth,gridWidth:grid.clientWidth,gridScroll:grid.scrollWidth,contentWidth:content.clientWidth,contentScrollWidth:content.scrollWidth};
    });
    expect(metrics.contentScroll).toBeLessThanOrEqual(metrics.contentHeight+1);
    expect(metrics.timelineWidth).toBeGreaterThan(metrics.previewWidth);
    await expect(page.locator('#extractSourceMedia')).toBeHidden();
    expect(metrics.gridScroll).toBeGreaterThan(metrics.gridWidth);
    expect(metrics.contentScrollWidth).toBeLessThanOrEqual(metrics.contentWidth+1);
    // 编号与卡片下沿必须在滚动内容区内，且为滚动条留出独立间距。
    const clearance=await page.locator('#extractFrameGrid').evaluate(grid=>{
      const top=grid.getBoundingClientRect().top;
      return top+grid.clientHeight-grid.querySelector('button').getBoundingClientRect().bottom;
    });
    expect(clearance).toBeGreaterThanOrEqual(16);
    if(viewport.width===1920)await page.screenshot({path:info.outputPath('desktop-121-frames.png')});
  }
  await expect(page.getByRole('button',{name:'播放',exact:true}).locator('svg')).toHaveCount(1);
  await page.getByRole('tab',{name:'原视频',exact:true}).click();
  await expect(page.locator('#extractResultPlayer')).toBeHidden();
  await page.getByRole('tab',{name:'抽帧结果',exact:true}).click();
  await expect(page.locator('#extractResultPlayer')).toBeVisible();
  await expect(page.locator('#extractResultPlayer .frame-play-toggle')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(page.locator('#extractResultPlayer .frame-play-toggle')).toHaveCSS('box-shadow','none');
  await page.getByLabel('缩略图大小',{exact:true}).selectOption('144');
  await expect(page.locator('#extractFrameGrid button').first()).toHaveCSS('width','144px');
  await page.locator('#extractFrameGrid button').nth(100).click();
  await expect(page.locator('#extractResultPlayer .frame-player-controls span')).toHaveText('101 / 121');
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await expect(page.getByRole('button',{name:'暂停',exact:true}).locator('svg')).toHaveCSS('stroke-width','0px');
  await expect(page.getByRole('button',{name:'暂停',exact:true}).locator('svg')).not.toHaveCSS('fill','none');
  await expect(page.locator('#extractFrameGrid button.is-current')).not.toHaveText(/101$/);
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  await expect(page.locator('#extractFrameGrid button.is-current')).toBeInViewport({ratio:1});
  await page.locator('#extractFrameGrid').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#extractFrameGrid button[aria-current=true]')).toHaveCount(1);
  await page.setViewportSize({width:700,height:600});
  await page.locator('#extractRun').scrollIntoViewIfNeeded();await expect(page.locator('#extractRun')).toBeInViewport({ratio:1});
  await page.locator('#extractFrameGrid button').last().scrollIntoViewIfNeeded();await expect(page.locator('#extractFrameGrid button').last()).toBeInViewport({ratio:1});
  await page.screenshot({path:info.outputPath('narrow-121-frames.png')});
  await page.locator('#projectButton').click();
  await expect(page.locator('#projectPanel')).toBeVisible();
  expect(await page.locator('#projectPanel').evaluate(element=>{const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x+20,box.y+20));})).toBe(true);
  await page.locator('#projectButton').click();
  const transform=await page.locator('#canvasWorld').getAttribute('style');
  await page.locator('#backToCanvas').click();
  await expect(page.locator('#extractWorkbench')).toBeHidden();
  await expect(page.locator('#canvasViewport')).toBeVisible();
  expect(await page.locator('#canvasViewport').evaluate(element=>element.inert)).toBe(false);
  expect(await page.locator('#canvasWorld').getAttribute('style')).toBe(transform);
});

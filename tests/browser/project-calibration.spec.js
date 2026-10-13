import {test,expect} from '@playwright/test';

test('角色校准：跑步基准、跳跃叠图、整组调整并保存重开',async({page,request})=>{
  const suffix=Date.now().toString(36),projectId='calibration-'+suffix;
  const created=await request.post('/__test/seed-r2-character-project',{data:{projectId}});
  expect(created.ok()).toBe(true);
  let saved=await created.json();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/projects');
  await page.locator('.project-card[data-id="'+projectId+'"]').click();
  await page.locator('.action-card[data-id="jump"]').click();
  await page.locator('#open-calibration').click();
  await expect(page.locator('#calibration-dialog')).toBeVisible();
  await expect(page.locator('#baseline-action')).toHaveValue('run');
  await expect(page.locator('#target-frame')).toHaveValue('jump-frame');

  const clickCanvasPoint=async(x,y)=>{
    const box=await page.locator('#calibration-canvas').boundingBox();
    await page.mouse.click(box.x+box.width*x/512,box.y+box.height*y/512);
  };
  await expect.poll(()=>page.locator('#calibration-canvas').evaluate(canvas=>canvas.width)).toBe(512);
  await page.locator('#set-baseline-anchor-mode').click();await clickCanvasPoint(256,461);
  await page.locator('#set-origin-mode').click();await clickCanvasPoint(256,440);
  await page.locator('#confirm-baseline').click();
  await page.locator('#set-target-anchor-mode').click();await clickCanvasPoint(256,450);
  await page.locator('#action-scale').fill('1.15');
  await page.locator('#action-offset-x').fill('3');
  await page.locator('#action-offset-y').fill('-4');
  await page.locator('#calibration-play').click();
  await expect(page.locator('#target-frame')).toHaveValue('jump-frame-2');
  await page.locator('#calibration-play').click();
  await expect(page.locator('#project-state')).toHaveText('有未保存修改');
  await page.screenshot({path:'output/acceptance/project-calibration-r2.png'});
  await page.locator('#save-calibration').click();
  await expect(page.locator('#calibration-dialog')).toBeHidden();
  const persisted=await request.get('/api/character-projects/'+projectId);
  expect(persisted.ok()).toBe(true);saved=await persisted.json();
  expect(saved.characters[0].baseline).toEqual({actionId:'run',frameId:'run-frame'});
  expect(saved.characters[0].canvas).toEqual({width:512,height:512});
  expect(saved.characters[0].origin).toEqual({x:256,y:439});
  expect(saved.characters[0].actions[1].transform.scale).toEqual({x:1.15,y:1.15});
  expect(saved.characters[0].actions[1].transform.offset).toEqual({x:3,y:-4});

  await page.reload();await page.locator('.project-card[data-id="'+projectId+'"]').click();
  await page.locator('.action-card[data-id="jump"]').click();await page.locator('#open-calibration').click();
  await expect(page.locator('#canvas-width')).toHaveValue('512');
  await expect(page.locator('#origin-y')).toHaveValue('439');
  await expect(page.locator('#action-scale')).toHaveValue('1.15');
  await expect(page.locator('#action-offset-y')).toHaveValue('-4');
  await page.keyboard.press('Escape');
  await expect(page.locator('#calibration-dialog')).toBeHidden();
  const snapshotSent=page.waitForResponse(response=>response.url().endsWith('/snapshot')&&response.request().method()==='PUT');
  await page.locator('#godot-preview').click();
  await expect(page.locator('#godot-preview-dialog')).toBeVisible();
  const websocketUrl=await page.locator('#preview-websocket-url').inputValue();
  expect(websocketUrl).toMatch(/^ws:\/\/127\.0\.0\.1:8898\/api\/preview-sessions\/[a-f0-9]{32}\/socket$/);
  const token=await page.locator('#preview-token').inputValue();expect(token.length).toBeGreaterThanOrEqual(40);
  const published=await snapshotSent;expect(published.ok()).toBe(true);
  const sessionId=websocketUrl.match(/preview-sessions\/([a-f0-9]{32})\/socket/)[1];
  await expect.poll(async()=>{
    const status=await request.get(`/api/preview-sessions/${sessionId}`,{headers:{Authorization:`Bearer ${token}`}});
    return (await status.json()).revision;
  }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

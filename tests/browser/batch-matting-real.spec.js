import {test,expect} from '@playwright/test';
import path from 'node:path';

test.skip(process.env.FRAMES_REAL_MATTING_BROWSER!=='1','真实模型网页门槛需显式启用');

test('自制视频一帧经真实模型、精修弹窗与透明ZIP下载',async({page,request})=>{
  const fixture=path.resolve('output/fixtures/自制 动作测试.mp4');
  const sessions=[];
  page.on('response',response=>{
    if(response.request().method()==='POST'&&response.url().endsWith('/api/edit-sessions')&&response.ok())
      sessions.push(response.json().then(body=>body.id));
  });
  try{
    await page.goto('/');
    await page.locator('#file').setInputFiles(fixture);
    await expect(page.locator('#status')).toHaveText('已导入');
    await page.locator('#start').fill('0');
    await page.locator('#end').fill('0.1');
    await page.locator('#fps').fill('1');
    await page.locator('#extract').click();
    await expect(page.locator('#result-meta')).toContainText('1 帧');
    await page.locator('#organize').click();
    await expect(page.locator('#edit-grid .frame')).toHaveCount(1);
    await page.locator('#tab-matting').click();
    await page.locator('#matting-start').click();
    await expect(page.locator('#matting-start')).toHaveText('重新抠图',{timeout:55000});
    await expect(page.locator('#matting-grid .frame')).toHaveCount(1);
    const batchId=await page.locator('#matting-image').evaluate(image=>image.src.match(/matting-batches\/([a-f0-9]{32})/)[1]);
    const batch=await (await request.get(`/api/matting-batches/${batchId}`)).json();
    expect(batch.processingPolicy).toBe('model-local-despill-v1');
    expect(batch.sequence.frames[0].matting.details.despill.method).toBe('ffmpeg-local-despill-v1');
    await page.locator('#matting-image').dblclick();
    await expect(page.locator('#repair-dialog')).toBeVisible();
    await expect(page.frameLocator('#repair-frame').locator('#message')).toContainText('修补当前帧');
    const frameId=batch.sequence.frames[0].id;
    const original=await (await request.get(`/api/matting-batches/${batchId}/frames/${frameId}/auto`)).body();
    const editor=page.frameLocator('#repair-frame');
    await editor.locator('[data-tool=restore]').click();
    const image=await editor.locator('#resultImage').boundingBox();
    await page.mouse.click(image.x+image.width*.1,image.y+image.height*.1);
    await page.locator('#repair-close').click();
    await expect(page.locator('#repair-dialog')).not.toBeVisible();
    const saved=await (await request.get(`/api/matting-batches/${batchId}`)).json();
    expect(saved.revisions[frameId]).toBe(1);
    const current=await (await request.get(`/api/matting-batches/${batchId}/frames/${frameId}/current`)).body();
    expect(current.equals(original)).toBe(false);
    expect((await (await request.get(`/api/matting-batches/${batchId}/frames/${frameId}/auto`)).body()).equals(original)).toBe(true);
    const download=page.waitForEvent('download');
    await page.locator('#tab-export').click();await expect(page.locator('#export-download')).toBeEnabled();await page.locator('#export-download').click();
    const archive=await download;
    expect(archive.suggestedFilename()).toMatch(/\.zip$/);
    await expect(page.locator('#export-status')).toContainText('导出完成');
    expect(await archive.path()).toBeTruthy();
    const state=await request.get('/api/health');
    expect(state.ok()).toBe(true);
  }finally{
    for(const id of await Promise.all(sessions))await request.delete(`/api/edit-sessions/${id}`);
  }
});

import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('R5真实角色ZIP：目录载入、双动作播放、事件与输入只读',async({page,request})=>{
  const suffix=Date.now().toString(36),projectId=`r5-js-${suffix}`;
  const seeded=await request.post('/__test/seed-r5-character-project',{data:{projectId}});
  expect(seeded.ok()).toBe(true);expect(await seeded.json()).toEqual({projectId,frameCount:7,formatVersion:2});
  const storedBefore=await request.get(`/api/character-projects/${projectId}`);
  expect(storedBefore.ok()).toBe(true);const projectBefore=await storedBefore.json();

  const archive=await request.get(`/api/character-projects/${projectId}/export`);
  expect(archive.ok()).toBe(true);
  const evidenceRoot=path.join(repository,'output','r5-e2e',projectId);
  const zipPath=path.join(repository,'output','r5-e2e',`${projectId}.zip`);
  await mkdir(path.dirname(zipPath),{recursive:true});await writeFile(zipPath,await archive.body());
  const python=path.join(repository,'.venv','Scripts','python.exe');
  const extracted=spawnSync(python,['-c','import pathlib,sys,zipfile; target=pathlib.Path(sys.argv[2]); target.mkdir(parents=True,exist_ok=False); zipfile.ZipFile(sys.argv[1]).extractall(target)',zipPath,evidenceRoot],{encoding:'utf8'});
  expect(extracted.status,extracted.stderr).toBe(0);
  const manifestPath=path.join(evidenceRoot,'project.json');
  const manifestBefore=await readFile(manifestPath);const digestBefore=createHash('sha256').update(manifestBefore).digest('hex');

  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/javascript-preview');
  await expect(page).toHaveTitle('JavaScript 运行预览 · 动作工坊');
  await page.locator('#package-input').setInputFiles(evidenceRoot);
  await expect(page.locator('#runtime-status')).toHaveText('资产已校验 · 本机只读');
  await expect(page.locator('#package-name')).toHaveText('R5 JavaScript运行验收');
  await expect(page.locator('#canvas-size')).toHaveText('256 × 256');
  await expect(page.locator('#origin-value')).toHaveText('128, 224');
  await expect(page.locator('.action-card')).toHaveCount(2);
  await expect(page.locator('#stage-title')).toContainText('跑步');
  const renderedPixels=await page.locator('#stage-canvas').evaluate(canvas=>{
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let opaque=0,transparent=0;
    for(let index=3;index<pixels.length;index+=4)pixels[index]===0?transparent++:opaque++;
    return {opaque,transparent};
  });
  expect(renderedPixels.opaque).toBeGreaterThan(0);expect(renderedPixels.transparent).toBeGreaterThan(0);

  await page.locator('#play-action').click();
  await expect(page.locator('#play-action')).toContainText('暂停');
  await expect(page.locator('#frame-index')).not.toHaveText('1 / 4',{timeout:1000});
  await expect(page.locator('#event-log')).toContainText('footstep',{timeout:3000});
  await expect(page.locator('#event-log')).toContainText('0.100s');
  await page.locator('#play-action').click();
  await page.locator('.action-card[data-action-id="jump"]').click();
  await expect(page.locator('#playback-mode')).toHaveText('逐帧时长');
  await page.locator('#play-action').click();
  await expect(page.locator('#event-log')).toContainText('land',{timeout:3000});
  await expect(page.locator('#event-log')).toContainText('0.200s');
  await expect(page.locator('#frame-index')).toHaveText('3 / 3',{timeout:3000});
  await expect(page.locator('#play-action')).toContainText('播放');
  await mkdir(path.join(repository,'output','acceptance'),{recursive:true});
  await page.screenshot({path:path.join(repository,'output','acceptance','action-forge-r5-javascript.png')});

  const manifestAfter=await readFile(manifestPath);const digestAfter=createHash('sha256').update(manifestAfter).digest('hex');
  expect(digestAfter).toBe(digestBefore);
  const storedAfter=await request.get(`/api/character-projects/${projectId}`);
  expect(storedAfter.ok()).toBe(true);expect(await storedAfter.json()).toEqual(projectBefore);
  expect(pageErrors).toEqual([]);
});

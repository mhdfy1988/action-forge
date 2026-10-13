import {test,expect} from '@playwright/test';

test('v1多帧项目：时长、事件、换序、循环触发、禁用保护和保存重开',async({page,request})=>{
  const projectId=`r4-browser-${Date.now().toString(36)}`;
  const seeded=await request.post('/__test/seed-r4-character-project',{data:{projectId}});
  expect(seeded.ok()).toBe(true);
  expect(await seeded.json()).toMatchObject({projectId,frameCount:10,formatVersionOnDisk:1});

  await page.goto('/projects');
  await page.locator(`.project-card[data-id="${projectId}"]`).click();
  // 旧项目预览可能仍可见；确认目标身份后才能修改其播放方式。
  await expect(page.locator('.project-card.is-active')).toHaveAttribute('data-id',projectId);
  await expect(page.locator('#project-frame')).toBeVisible();
  await page.locator('#action-playback-mode').selectOption('per-frame');
  await expect(page.locator('[aria-label="第1帧时长毫秒"]')).toHaveValue('83');
  await page.locator('[aria-label="第1帧时长毫秒"]').fill('120');
  await expect(page.locator('#project-state')).toHaveText('有未保存修改');
  await expect(page.locator('[aria-label="第1帧时长毫秒"]')).toHaveValue('120');
  await page.locator('[aria-label="第2帧时长毫秒"]').fill('250');
  await expect(page.locator('[aria-label="第2帧时长毫秒"]')).toHaveValue('250');
  await expect(page.locator('#action-total-duration')).toContainText('总时长 0.703 秒');

  const eventFrame=page.locator('.project-frame-card[data-frame-id="run-frame-002"]');
  await eventFrame.locator('.project-frame-select').click();
  await page.locator('#add-frame-event').click();
  await page.locator('#event-type').fill('footstep');
  await page.locator('#event-parameters').fill('{"foot":"left"}');
  await page.locator('#confirm-frame-event').click();
  await expect(eventFrame.locator('.project-frame-label small')).toHaveText('1 事件');
  await eventFrame.locator('.project-frame-order button').first().click();
  await expect(page.locator('.project-frame-card').first()).toHaveAttribute('data-frame-id','run-frame-002');
  await expect(page.locator('#frame-event-context')).toContainText('帧 001');

  await page.locator('#project-play').click();
  await expect(page.locator('#event-playback-log')).toContainText('footstep · 0.000s');
  await expect(page.locator('#event-playback-log')).toContainText('0.703s',{timeout:2000});
  await page.locator('#project-play').click();
  await page.locator('#save-project').click();
  await expect(page.locator('#project-state')).toHaveText('已保存');

  await page.reload();
  await page.locator(`.project-card[data-id="${projectId}"]`).click();
  await expect(page.locator('.project-card.is-active')).toHaveAttribute('data-id',projectId);
  await expect(page.locator('.project-frame-card').first()).toHaveAttribute('data-frame-id','run-frame-002');
  await expect(page.locator('.project-frame-card[data-frame-id="run-frame-002"] .project-frame-label small')).toHaveText('1 事件');
  await expect(page.locator('[aria-label="第1帧时长毫秒"]')).toHaveValue('250');
  await expect(page.locator('[aria-label="第2帧时长毫秒"]')).toHaveValue('120');
  await expect(page.locator('#action-total-duration')).toContainText('总时长 0.703 秒');

  const runRevision=(await request.get(`/api/character-projects/${projectId}`)).ok();
  expect(runRevision).toBe(true);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.project-frame-card[data-frame-id="run-frame-002"] input[type="checkbox"]').uncheck();
  await expect(page.locator('.project-frame-card[data-frame-id="run-frame-002"] .project-frame-label small')).toHaveText('0 事件');
  await page.locator('#save-project').click();
  await expect(page.locator('#project-state')).toHaveText('已保存');

  const response=await request.get(`/api/character-projects/${projectId}`);
  expect(response.ok()).toBe(true);
  const project=await response.json();
  expect(project.formatVersion).toBe(2);
  const [run,jump]=project.characters[0].actions;
  expect(run.playback).toEqual({mode:'per-frame'});
  expect(run.frames[0]).toMatchObject({id:'run-frame-002',enabled:false,duration:{numerator:1,denominator:4}});
  expect(run.frames[1]).toMatchObject({id:'run-frame-001',enabled:true,duration:{numerator:3,denominator:25}});
  expect(run.events).toEqual([]);
  expect(jump.revision).toBe(0);
});

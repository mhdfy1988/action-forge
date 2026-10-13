import {test,expect} from '@playwright/test';

test('必填弹窗：取消和关闭不触发表单校验，也不写入数据',async({page})=>{
  const suffix=Date.now().toString(36),projectId=`cancel-${suffix}`;
  await page.goto('/projects');
  const projectsBefore=await page.locator('#project-list .project-card').count();

  await page.locator('#new-project').click();
  await page.locator('#create-project-name').fill('不应创建');
  await page.locator('#create-project-dialog').getByRole('button',{name:'取消',exact:true}).click();
  await expect(page.locator('#create-project-dialog')).toBeHidden();
  await expect(page.locator('#project-list .project-card')).toHaveCount(projectsBefore);

  await page.locator('#new-project').click();
  await page.locator('#create-project-name').fill('仍不应创建');
  await page.locator('#create-project-dialog').getByRole('button',{name:'关闭'}).click();
  await expect(page.locator('#create-project-dialog')).toBeHidden();
  await expect(page.locator('#project-list .project-card')).toHaveCount(projectsBefore);

  await page.locator('#new-project').click();
  await page.locator('#create-project-id').fill(projectId);
  await page.locator('#create-project-name').fill('取消验收项目');
  await page.locator('#create-character-id').fill('hero');
  await page.locator('#create-character-name').fill('英雄');
  await page.locator('#confirm-create').click();
  await expect(page.locator('#project-name')).toHaveValue('取消验收项目');

  await page.locator('#add-action').click();
  await page.locator('#new-action-name').fill('不应添加');
  await page.locator('#action-dialog').getByRole('button',{name:'取消',exact:true}).click();
  await expect(page.locator('#action-dialog')).toBeHidden();
  await expect(page.locator('#action-list > button')).toHaveCount(0);
  await expect(page.locator('#project-state')).toHaveText('已保存');

  const cancelButtons=page.locator('dialog form[method="dialog"] button[value="cancel"]');
  await expect(cancelButtons).toHaveCount(10);
  for(const button of await cancelButtons.all())await expect(button).toHaveAttribute('formnovalidate','');
});

test('项目和动作删除：取消不变，确认后删除并持久化',async({page,request})=>{
  const suffix=Date.now().toString(36),projectId=`delete-${suffix}`;
  await page.goto('/projects');
  await page.locator('#new-project').click();
  await page.locator('#create-project-id').fill(projectId);
  await page.locator('#create-project-name').fill('删除验收项目');
  await page.locator('#create-character-id').fill('hero');
  await page.locator('#create-character-name').fill('英雄');
  await page.locator('#confirm-create').click();
  await page.locator('#add-action').click();
  await page.locator('#new-action-id').fill('run');
  await page.locator('#new-action-name').fill('跑步');
  await page.locator('#confirm-action').click();

  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#delete-action').click();
  await expect(page.locator('.action-card')).toHaveCount(1);
  await expect(page.locator('#project-state')).toHaveText('有未保存修改');

  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#delete-action').click();
  await expect(page.locator('.action-card')).toHaveCount(0);
  await page.locator('#save-project').click();
  await expect(page.locator('#project-state')).toHaveText('已保存');
  const saved=await request.get(`/api/character-projects/${projectId}`);
  expect(saved.ok()).toBe(true);
  expect((await saved.json()).characters[0].actions).toEqual([]);

  const projectCard=page.locator(`.project-card[data-id="${projectId}"]`);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator(`.project-card-row[data-id="${projectId}"] .project-delete`).click();
  await expect(projectCard).toBeVisible();

  page.once('dialog',dialog=>dialog.accept());
  await page.locator(`.project-card-row[data-id="${projectId}"] .project-delete`).click();
  await expect(projectCard).toHaveCount(0);
  await expect(page.locator('#project-empty')).toBeVisible();
  expect((await request.get(`/api/character-projects/${projectId}`)).ok()).toBe(false);
});

test('角色项目：两个动作独立编辑、保存并刷新回读',async({page,request})=>{
  const errors=[];page.on('pageerror',reason=>errors.push(reason.message));
  const suffix=Date.now().toString(36),projectId=`browser-${suffix}`;
  await page.goto('/projects');
  await expect(page).toHaveTitle('角色项目 · 动作工坊');
  await page.locator('#new-project').click();
  await page.locator('#create-project-id').fill(projectId);
  await page.locator('#create-project-name').fill('浏览器角色动作');
  await page.locator('#create-character-id').fill('hero');
  await page.locator('#create-character-name').fill('英雄');
  await page.locator('#confirm-create').click();
  await expect(page.locator('#project-name')).toHaveValue('浏览器角色动作');

  const add=async(id,name,fps)=>{
    await page.locator('#add-action').click();
    await page.locator('#new-action-id').fill(id);
    await page.locator('#new-action-name').fill(name);
    await page.locator('#new-action-fps').fill(String(fps));
    await page.locator('#confirm-action').click();
  };
  await add('run','跑步',12);await add('jump','跳跃',8);
  await expect(page.locator('#open-calibration')).toBeDisabled();
  await page.locator('.action-card[data-id="jump"]').click();
  await page.locator('#action-loop').uncheck();
  await page.locator('#save-project').click();
  await expect(page.locator('#project-state')).toHaveText('已保存');
  await expect(page.locator('.action-card')).toHaveCount(2);

  await page.reload();
  await page.locator('.project-card[data-id="'+projectId+'"]').click();
  await expect(page.locator('.project-card[data-id="'+projectId+'"]').first()).toHaveClass(/is-active/);
  await page.locator('.action-card[data-id="run"]').click();
  await expect(page.locator('#action-name')).toHaveValue('跑步');
  await expect(page.locator('#action-fps')).toHaveValue('12');
  await expect(page.locator('#action-loop')).toBeChecked();
  await page.locator('.action-card[data-id="jump"]').click();
  await expect(page.locator('#action-name')).toHaveValue('跳跃');
  await expect(page.locator('#action-fps')).toHaveValue('8');
  await expect(page.locator('#action-loop')).not.toBeChecked();

  await page.locator('#action-fps').fill('10');
  await expect(page.locator('#project-state')).toHaveText('有未保存修改');
  await page.locator('#save-project').click();
  await expect(page.locator('#project-state')).toHaveText('已保存');
  const response=await request.get(`/api/character-projects/${projectId}`);
  expect(response.ok()).toBe(true);
  const project=await response.json(),actions=project.characters[0].actions;
  expect(actions.map(item=>[item.id,item.playback.fps,item.loop])).toEqual([
    ['run',12,true],['jump',10,false],
  ]);
  expect(actions[0].revision).toBe(0);expect(actions[1].revision).toBe(1);
  await page.screenshot({path:'output/acceptance/project-workspace-r1.png'});
  expect(errors).toEqual([]);
});

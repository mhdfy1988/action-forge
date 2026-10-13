import {test,expect} from '@playwright/test';

test('主入口工程与多画布：保存隔离、切换、复制、取消及删除',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/workflow');await expect(page.locator('#projectLabel')).toHaveText('未命名工程');
  async function dialog(kind,name){await page.getByRole('button',{name:kind,exact:true}).click();if(name)await page.getByRole('textbox',{name:'名称',exact:true}).fill(name);}
  async function confirm(){await page.locator('#libraryConfirm').click();await expect(page.locator('#libraryDialog')).toBeHidden();await expect(page.locator('.node-tool')).toHaveCount(8);}
  async function manage(name,action){await page.locator('#flowButton').click();await page.getByRole('button',{name:`管理${name}`,exact:true}).click();await page.locator('#flowMenu').getByRole('menuitem',{name:action,exact:true}).click();}
  async function manageProject(name,action){await page.locator('#projectButton').click();await page.locator('#projectList').getByRole('button',{name:`管理${name}`,exact:true}).click();await page.locator('#projectMenu').getByRole('menuitem',{name:action,exact:true}).click();}
  // 新建必填为空时，取消与关闭都不得改变目录。
  const before=await page.evaluate(()=>localStorage.getItem('action-forge.workflow-library.v1'));
  for(const cancel of ['取消','关闭工程操作']){await page.locator('#projectButton').click();await dialog('新建工程');await page.getByRole('button',{name:cancel,exact:true}).click();await expect(page.locator('#libraryDialog')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('action-forge.workflow-library.v1'))).toBe(before);}
  await manageProject('未命名工程','重命名');await page.locator('#libraryName').fill('浣熊战士');await confirm();await expect(page.locator('#projectLabel')).toHaveText('浣熊战士');
  await page.locator('.node-tool[data-node-type="action-video"]').click();
  await manage('未命名工作流','重命名');await page.locator('#libraryName').fill('跑步');await confirm();await expect(page.locator('#flowLabel')).toHaveText('跑步');await expect(page.locator('.workflow-node')).toHaveCount(1);
  await page.locator('#flowButton').click();await dialog('新建工作流','跳跃');await confirm();await expect(page.locator('.workflow-node')).toHaveCount(0);
  await page.locator('.node-tool[data-node-type="reference-image"]').click();
  // 不等待120ms防抖，立即切换也必须保存。
  await page.locator('#flowButton').click();await page.locator('#flowList .navigation-select').filter({hasText:'跑步'}).click();await expect(page.locator('#flowLabel')).toHaveText('跑步');await expect(page.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();
  await manage('跳跃','复制工作流');await page.locator('#flowButton').click();await page.locator('#flowList .navigation-select').filter({hasText:'跳跃 副本'}).click();await expect(page.locator('.workflow-node[data-node-id="reference-image-1"]')).toBeVisible();
  await page.reload();await expect(page.locator('#flowLabel')).toHaveText('跳跃 副本');
  await page.locator('#flowButton').click();await page.screenshot({path:'output/acceptance/workflow-navigation-populated.png'});await page.keyboard.press('Escape');
  await manage('跳跃 副本','删除工作流');await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('#flowLabel')).toHaveText('跳跃 副本');
  await manage('跳跃 副本','删除工作流');await confirm();await expect(page.locator('#flowLabel')).toHaveText('跑步');
  await page.locator('#projectButton').click();await dialog('新建工程','怪物');await confirm();await expect(page.locator('.workflow-node')).toHaveCount(0);
  await page.locator('#projectButton').click();await page.locator('#projectList .navigation-select').filter({hasText:'浣熊战士'}).click();await expect(page.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();
  await page.locator('#flowButton').click();await page.locator('#flowSearch').fill('跳');await expect(page.locator('#flowList .navigation-select')).toHaveCount(1);await page.keyboard.press('Escape');
  await manageProject('浣熊战士','删除工程');await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('#projectLabel')).toHaveText('浣熊战士');
  await manageProject('浣熊战士','删除工程');await confirm();await expect(page.locator('#projectLabel')).toHaveText('怪物');
  await manageProject('怪物','删除工程');await confirm();await expect(page.locator('#projectLabel')).toHaveText('未命名工程');await expect(page.locator('.workflow-node')).toHaveCount(0);
  await page.screenshot({path:'output/acceptance/workflow-navigation.png'});expect(errors).toEqual([]);
});

test('工程行菜单：非当前工程改名与删除，右键不切换，取消与关闭不改数据',async({page})=>{
  await page.goto('/workflow');await page.locator('#projectButton').click();await page.locator('#newProject').click();await page.locator('#libraryName').fill('另一工程');await page.locator('#libraryConfirm').click();await expect(page.locator('#projectLabel')).toHaveText('另一工程');
  await page.locator('.node-tool[data-node-type="action-video"]').click();await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  async function menu(name,action,right=false){await page.locator('#projectButton').click();const row=page.locator('#projectList .navigation-row').filter({hasText:name});if(right)await row.click({button:'right'});else await row.getByRole('button',{name:`管理${name}`,exact:true}).click();await expect(page.locator('#projectLabel')).toHaveText('另一工程');await expect(page.locator('#projectMenu')).toBeInViewport({ratio:1});await page.locator('#projectMenu').getByRole('menuitem',{name:action,exact:true}).click();}
  await expect(page.locator('#renameProject,#deleteProject,.navigation-panel-footer')).toHaveCount(0);
  const before=await page.evaluate(()=>localStorage.getItem('action-forge.workflow-library.v1'));
  for(const cancel of ['取消','关闭工程操作']){await menu('未命名工程','重命名',true);await page.locator('#libraryName').fill('');await page.getByRole('button',{name:cancel,exact:true}).click();await expect(page.locator('#libraryDialog')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('action-forge.workflow-library.v1'))).toBe(before);}
  await menu('未命名工程','重命名');await page.locator('#libraryName').fill('待删除工程');await page.locator('#libraryConfirm').click();await expect(page.locator('#projectLabel')).toHaveText('另一工程');await expect(page.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();
  await menu('待删除工程','删除工程',true);await expect(page.locator('#libraryDialogMessage')).toContainText('待删除工程');await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.locator('#projectButton').click();await page.locator('#projectList .navigation-row').filter({hasText:'待删除工程'}).hover();await page.screenshot({path:'output/acceptance/workflow-project-row-menu.png'});await page.keyboard.press('Escape');
  await menu('待删除工程','删除工程');await page.locator('#libraryConfirm').click();await expect(page.locator('#projectLabel')).toHaveText('另一工程');await expect(page.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();await page.locator('#projectButton').click();await expect(page.locator('#projectList .navigation-row')).toHaveCount(1);
});

test('多工作流复制引用真实素材，刷新恢复且删除副本不损坏原图',async({page})=>{
  await page.goto('/workflow');await page.locator('.node-tool[data-node-type="reference-image"]').click();
  const encoded=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;const context=canvas.getContext('2d');context.fillStyle='#abc';context.fillRect(0,0,32,48);return canvas.toDataURL().split(',')[1];});const buffer=Buffer.from(encoded,'base64');
  const chooser=page.waitForEvent('filechooser');await page.locator('.workflow-node').getByRole('button',{name:'导入角色参考图',exact:true}).click();await (await chooser).setFiles({name:'参考.png',mimeType:'image/png',buffer});
  await expect(page.locator('.workflow-node img')).toBeVisible();await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  async function menu(name,action){await page.locator('#flowButton').click();await page.getByRole('button',{name:`管理${name}`,exact:true}).click();await page.locator('#flowMenu').getByRole('menuitem',{name:action,exact:true}).click();}
  await menu('未命名工作流','复制工作流');await page.locator('#flowButton').click();await page.locator('#flowList .navigation-select').filter({hasText:'未命名工作流 副本'}).click();
  await expect(page.locator('.workflow-node img')).toBeVisible();await page.reload();await expect(page.locator('.workflow-node img')).toBeVisible();
  await menu('未命名工作流 副本','删除工作流');await page.locator('#libraryConfirm').click();await expect(page.locator('#flowLabel')).toHaveText('未命名工作流');await expect(page.locator('.workflow-node img')).toBeVisible();
  await page.setViewportSize({width:700,height:600});await page.locator('#flowButton').click();await expect(page.locator('#flowPanel')).toBeInViewport({ratio:1});await expect(page.locator('#nodeToolbar .node-tool')).toHaveCount(8);
});

test('同一画布多页面写入冲突拒绝覆盖，保持先保存的数据',async({page,context})=>{
  await page.goto('/workflow');await page.locator('.node-tool[data-node-type="reference-image"]').click();await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const second=await context.newPage();await second.goto('/workflow');await expect(second.locator('.workflow-node')).toHaveCount(1);
  await page.locator('.node-tool[data-node-type="action-video"]').click();await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const before=await page.evaluate(()=>localStorage.getItem('action-forge.workflow.r6b.v1'));
  await second.locator('.node-tool[data-node-type="process-frames"]').click();await expect(second.locator('#toast')).toContainText('其他页面修改');expect(await page.evaluate(()=>localStorage.getItem('action-forge.workflow.r6b.v1'))).toBe(before);
  await second.reload();await expect(second.locator('.workflow-node')).toHaveCount(2);await expect(second.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();await second.close();
});

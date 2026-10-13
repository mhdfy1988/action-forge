import {test,expect} from '@playwright/test';
const key='action-forge.workflow.r6b.v1';
const fields={
  'reference-image':[],'action-video':['prompt','direction','durationSeconds','providerNote'],
  'process-frames':[],
  'remove-background':[],'build-action-clip':['name','loop','fps'],
  'assemble-character':['characterName'],'game-preview':['target'],
  'export-game-assets':['format','frameWidth','frameHeight'],
};
test('八类新建节点按用途展示：隐藏协议字段、源名称和编辑器参数',async({page})=>{
  await page.goto('/workflow');await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload();
  for(const [type,expected] of Object.entries(fields)){
    await page.locator(`.node-tool[data-node-type="${type}"]`).click();
    await expect(page.locator('.node-port span')).toHaveCount(0);
    for(const title of await page.locator('.port-dot').evaluateAll(elements=>elements.map(element=>element.title)))expect(title).toMatch(/^(输入|输出)：/);
    expect(await page.locator('#nodeInspector [data-parameter]').evaluateAll(elements=>elements.map(element=>element.dataset.parameter))).toEqual(expected);
    await expect(page.locator('#inspectId,#inspectMode,#portSummary')).toHaveCount(0);
    if(type==='reference-image'){
      await expect(page.locator('#nodeSettings')).toBeHidden();await expect(page.locator('#referenceImageSection img')).toHaveCount(0);
      await expect(page.locator('#referenceImageSection button')).toHaveCount(1);
    }else await expect(page.locator('#inspectStatus')).toHaveText(type==='action-video'?'等待导入':type==='process-frames'?'等待序列帧处理':type==='remove-background'?'等待序列帧':'尚未接通');
    if(type==='organize-frames')await expect(page.getByRole('button',{name:'打开整理工作台',exact:true})).toBeDisabled();
    if(type==='extract-frames'){
      await expect(page.locator('.extract-inspector-summary')).toContainText('抽取范围');
      await expect(page.locator('.extract-inspector-summary')).toContainText('12 帧/秒');
      await expect(page.getByRole('button',{name:'提取序列帧',exact:true})).toBeDisabled();
      await expect(page.getByRole('button',{name:'打开抽帧工作台',exact:true})).toBeEnabled();
    }
    if(type==='remove-background'){
      await expect(page.locator('[data-parameter="pipeline"]')).toHaveCount(0);
      await expect(page.locator('[data-parameter="despillStrength"]')).toHaveCount(0);
      await expect(page.getByRole('button',{name:'打开透明背景工作台',exact:true})).toBeVisible();
    }
  }
  await page.locator('[data-parameter="format"]').selectOption('sprite-sheet');await page.locator('[data-parameter="frameWidth"]').fill('512');
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  await page.reload();await page.locator('.workflow-node[data-node-id="export-game-assets-1"] .node-header').click();
  await expect(page.locator('[data-parameter="format"]')).toHaveValue('sprite-sheet');await expect(page.locator('[data-parameter="frameWidth"]')).toHaveValue('512');
  await page.screenshot({path:'output/acceptance/workflow-inspector-export.png'});
});

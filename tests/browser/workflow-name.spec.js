import {test,expect} from '@playwright/test';
const key='action-forge.workflow.r6b.v1';
test('当前节点外置名称：双击改名、取消、空白、刷新恢复与固定类型',async({page})=>{
  await page.goto('/workflow');
  const types=await page.locator('.node-tool').evaluateAll(buttons=>buttons.map(button=>button.dataset.nodeType));
  for(const [index,type] of types.entries()){
    await page.locator(`.node-tool[data-node-type="${type}"]`).click();
    // 节点身份可能为UUID，不依赖创建器内部的编号规则。
    const created=page.locator('.workflow-node').nth(index);
    const nodeId=await created.getAttribute('data-node-id');
    const node=page.locator(`.workflow-node[data-node-id="${nodeId}"]`);
    const original=await node.locator('.node-name').innerText();
    expect(original).toMatch(/ 1$/);
    const header=await node.locator('.node-header').boundingBox(),card=await node.boundingBox();
    expect(header.y+header.height).toBeLessThan(card.y);
    await node.locator('.node-name').dblclick();
    const input=node.getByRole('textbox',{name:'节点名称'});
    await expect(input).toBeFocused();await input.fill(`自定义动作 ${index+1}`);await input.press('Enter');
    await expect(node.locator('.node-name')).toHaveText(`自定义动作 ${index+1}`);
    await expect(page.locator('#inspectTitle')).toHaveText(`自定义动作 ${index+1}`);
    await expect(page.locator('#inspectType')).toHaveText(original.replace(/ 1$/,''));
    await node.locator('.node-name').dblclick();await input.fill('取消的名字');await input.press('Escape');
    await expect(node.locator('.node-name')).toHaveText(`自定义动作 ${index+1}`);
    await node.locator('.node-name').dblclick();await input.fill('   ');await input.press('Enter');
    await expect(node.locator('.node-name')).toHaveText(`自定义动作 ${index+1}`);
    const drag=await node.locator('.node-header').boundingBox(),view=await page.locator('#canvasViewport').boundingBox();
    await page.mouse.move(drag.x+18,drag.y+18);await page.mouse.down();await page.mouse.move(view.x+70+(index%3)*290,view.y+95+Math.floor(index/3)*300,{steps:6});await page.mouse.up();
  }
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  expect(before.nodes.map(node=>node.type)).toEqual(types);
  await page.reload();
  expect(await page.locator('.node-name').allTextContents()).toEqual(types.map((_,index)=>`自定义动作 ${index+1}`));
  await page.locator('#zoomFit').click();
  await page.screenshot({path:'output/acceptance/workflow-node-names.png'});
});

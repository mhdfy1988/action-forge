import {test,expect} from '@playwright/test';
import {addLegacyNode} from './workflow-legacy-fixture.js';

const storageKey='action-forge.workflow.r6b.v1';

async function addNode(page,type){
  if(['extract-frames','organize-frames'].includes(type))await addLegacyNode(page,type);else await page.locator(`.node-tool[data-node-type="${type}"]`).click();
  const node=page.locator(`.workflow-node[data-node-id^="${type}-"]`).last();
  // 连线测试通过真实拖动排开节点，不依赖生产入口的创建坐标。
  const index=await page.locator('.workflow-node').count()-1;
  const header=await node.locator('.node-header').boundingBox(),view=await page.locator('#canvasViewport').boundingBox();
  await page.mouse.move(header.x+18,header.y+18);await page.mouse.down();
  await page.mouse.move(view.x+68+(index%3)*290,view.y+198+Math.floor(index/3)*210,{steps:5});await page.mouse.up();
  return node;
}

async function dragPort(page,sourceNode,sourcePort,targetNode,targetPort){
  const source=page.locator(`.port-dot[data-direction="output"][data-node="${sourceNode}"][data-port="${sourcePort}"]`);
  const target=page.locator(`.port-dot[data-direction="input"][data-node="${targetNode}"][data-port="${targetPort}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
  await page.mouse.up();
}

async function clickVisibleConnection(page,button='left'){
  const point=await page.locator('#connectionLayer .connection-hit').evaluate(path=>{
    const length=path.getTotalLength();
    const matrix=path.getScreenCTM();
    for(let index=5;index<96;index+=5){
      const local=path.getPointAtLength(length*index/100);
      const screen=new DOMPoint(local.x,local.y).matrixTransform(matrix);
      if(document.elementFromPoint(screen.x,screen.y)===path)return{x:screen.x,y:screen.y};
    }
    return null;
  });
  expect(point,'连线必须至少有一段可直接点击').not.toBeNull();
  await page.mouse.click(point.x,point.y,{button});
}

async function nodeMenu(page,node,action){
  await node.locator('.node-header').click({button:'right',position:{x:18,y:18}});
  await page.getByRole('menuitem',{name:action}).click();
}

test.beforeEach(async({page})=>{
  await page.goto('/workflow');
  await page.evaluate(key=>localStorage.removeItem(key),storageKey);
  await page.reload();
  await expect(page.locator('.canvas-empty')).toBeVisible();
});

test('空白右键添加：缩放平移后仍在点击处创建，菜单避让不改变落点',async({page})=>{
  const view=await page.locator('#canvasViewport').boundingBox();
  for(const [index,point] of [{x:view.x+300,y:view.y+150},{x:view.x+view.width-20,y:view.y+view.height-20}].entries()){
    if(index){
      await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();
      await page.mouse.move(view.x+30,view.y+30);await page.mouse.down();await page.mouse.move(view.x+120,view.y+90,{steps:5});await page.mouse.up();
    }
    await page.mouse.click(point.x,point.y,{button:'right'});
    await expect(page.getByRole('menuitem',{name:'复制节点'})).toBeHidden();
    await expect(page.getByRole('menuitem',{name:'删除节点'})).toBeHidden();
    await page.getByRole('menuitem',{name:'添加节点'}).click();
    await expect(page.locator('#contextNodeCatalog [role="menuitem"]')).toHaveCount(8);
    await expect(page.getByRole('menu')).toBeInViewport({ratio:1});
    await page.getByRole('menuitem',{name:'角色参考图',exact:true}).click();
    await expect(page.getByRole('menu')).toBeHidden();
    const node=page.locator('.workflow-node').last(),box=await node.boundingBox();
    expect(box.x).toBeCloseTo(point.x,1);expect(box.y).toBeCloseTo(point.y,1);
  }
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const saved=await page.evaluate(key=>localStorage.getItem(key),storageKey);
  await page.mouse.click(view.x+230,view.y+100,{button:'right'});
  await page.getByRole('menuitem',{name:'添加节点'}).click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe(saved);
  await page.reload();
  await expect(page.locator('.workflow-node')).toHaveCount(2);
});

test('左侧节点工具栏：悬浮与聚焦展开名称、小窗口可滚到最后一项',async({page})=>{
  await expect(page.locator('#selectTool,#panTool,#fitView,#addNode,#nodePalette,#canvasStatus')).toHaveCount(0);
  await expect(page.locator('.node-tool')).toHaveCount(8);
  await expect(page.locator('.node-tool svg')).toHaveCount(8);
  const toolbar=page.locator('#nodeToolbar');
  await page.mouse.move(600,80);
  await expect(toolbar).toHaveCSS('width','56px');
  const collapsed=await toolbar.boundingBox();
  const iconBefore=await page.locator('.node-tool-icon').first().boundingBox();
  await toolbar.hover();
  await expect(toolbar).toHaveCSS('width','204px');
  const expanded=await toolbar.boundingBox();
  const iconAfter=await page.locator('.node-tool-icon').first().boundingBox();
  expect(expanded.height).toBeCloseTo(collapsed.height,1);
  expect(expanded.y).toBeCloseTo(collapsed.y,1);
  expect(iconAfter.y).toBeCloseTo(iconBefore.y,1);
  await expect(page.locator('.node-tool-label').first()).toHaveCSS('opacity','1');
  await page.mouse.move(600,80);
  await expect(toolbar).toHaveCSS('width','56px');
  await page.locator('.node-tool').first().focus();
  await expect(toolbar).toHaveCSS('width','204px');
  await page.keyboard.press('Enter');
  await expect(page.locator('.workflow-node')).toHaveCount(1);
  const nodeBox=await page.locator('.workflow-node').boundingBox(),viewBox=await page.locator('#canvasViewport').boundingBox();
  expect(Math.abs(nodeBox.x+nodeBox.width/2-viewBox.x-viewBox.width/2)).toBeLessThan(1);
  await expect(toolbar).toHaveCSS('width','56px');
  for(const size of [{width:1920,height:800},{width:1280,height:600},{width:980,height:500}]){
    await page.setViewportSize(size);
    const last=toolbar.locator('.node-tool').last();
    await toolbar.hover();
    await expect(toolbar).toHaveCSS('width','204px');
    await page.mouse.wheel(0,2500);
    await expect.poll(async()=>{
      const item=await last.boundingBox(),panel=await toolbar.boundingBox();
      return item.y>=panel.y&&item.y+item.height<=panel.y+panel.height;
    }).toBe(true);
    await expect(last).toBeInViewport({ratio:1});
    await last.click();
  }
  await expect(page.locator('.workflow-node')).toHaveCount(4);
});

test('正式画布：深灰基底、冰蓝选中与空状态图标',async({page})=>{
  await expect(page.locator('#inspectorEmpty [data-icon] svg')).toHaveCount(1);
  await expect(page.locator('#canvasViewport')).toHaveCSS('background-color','rgb(16, 16, 16)');
  const node=await addNode(page,'action-video');
  await node.click();
  await expect(node).toHaveCSS('border-top-color','rgb(134, 207, 255)');
});

test('正式画布：添加、移动、配置、复制、删除并刷新恢复',async({page})=>{
  await page.locator('#flowButton').click();await page.getByRole('button',{name:'管理未命名工作流',exact:true}).click();await page.locator('#flowMenu').getByRole('menuitem',{name:'重命名',exact:true}).click();await page.locator('#libraryName').fill('R6-B 验收工作流');await page.locator('#libraryConfirm').click();await expect(page.locator('#flowLabel')).toHaveText('R6-B 验收工作流');
  const video=await addNode(page,'action-video');
  await expect(video).toBeVisible();
  await video.click();
  await expect(page.locator('#inspectorEmpty')).toBeHidden();
  await expect(page.locator('#deleteNode,#duplicateNode,.node-delete')).toHaveCount(0);
  await expect(page.locator('[data-parameter="label"]')).toHaveCount(0);
  const before=await video.boundingBox();
  const header=video.locator('.node-header');
  const box=await header.boundingBox();
  await page.mouse.move(box.x+70,box.y+20);await page.mouse.down();await page.mouse.move(box.x-170,box.y-100,{steps:8});
  // 松手前就必须跟随鼠标，避免只在结束重绘时跳到目标位置。
  const during=await video.boundingBox();
  expect(during.x).toBeLessThan(before.x-150);
  await page.mouse.up();
  const after=await video.boundingBox();
  expect(after.x).toBeLessThan(before.x-150);

  // 拖动会把节点左侧移出可见范围；右键操作前先恢复可见，不点击被裁剪区域。
  await page.locator('#zoomFit').click();
  await nodeMenu(page,video,'复制节点');
  await expect(page.locator('.workflow-node[data-node-id^="action-video-"]')).toHaveCount(2);
  await nodeMenu(page,page.locator('.workflow-node[data-node-id="action-video-2"]'),'删除节点');
  await expect(page.locator('.workflow-node[data-node-id^="action-video-"]')).toHaveCount(1);

  await page.locator('#zoomIn').click();
  const viewportBox=await page.locator('#canvasViewport').boundingBox();
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const oldX=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).viewport.x,storageKey);
  await page.mouse.move(viewportBox.x+30,viewportBox.y+30);await page.mouse.down();await page.mouse.move(viewportBox.x+120,viewportBox.y+90,{steps:6});await page.mouse.up();
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');

  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  expect(saved.viewport.x).toBeGreaterThan(oldX);
  expect(saved.name).toBe('R6-B 验收工作流');expect(saved.nodes).toHaveLength(1);expect(saved.viewport.zoom).toBeGreaterThan(1);expect(saved.viewport.x).not.toBe(0);
  await page.reload();
  await expect(page.locator('.workflow-node[data-node-id="action-video-1"]')).toBeVisible();
  await page.locator('#zoomFit').click();
  await page.locator('.workflow-node[data-node-id="action-video-1"]').click();
  await expect(page.locator('#flowLabel')).toHaveText('R6-B 验收工作流');
  await expect(page.locator('[data-parameter="label"]')).toHaveCount(0);
  await expect(page.locator('#zoomLabel')).not.toHaveText('100%');
});

test('节点卡片内容与参考图预览可拖动，不必抓标题且不误触导入',async({page})=>{
  const node=await addNode(page,'extract-frames');
  const before=await node.boundingBox(),body=await node.locator('.node-param-preview').boundingBox();
  await page.mouse.move(body.x+30,body.y+10);await page.mouse.down();await page.mouse.move(body.x+110,body.y+60,{steps:8});
  expect((await node.boundingBox()).x).toBeGreaterThan(before.x+70);await page.mouse.up();
  const ref=await addNode(page,'reference-image');
  const encoded=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=120;return canvas.toDataURL().split(',')[1];});
  await ref.locator('input[type=file]').setInputFiles({name:'drag.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
  await expect(ref.locator('img')).toBeVisible();
  let choosers=0;page.on('filechooser',()=>choosers++);
  const image=await ref.locator('img').boundingBox(),start=await ref.boundingBox();
  await page.mouse.move(image.x+30,image.y+40);await page.mouse.down();await page.mouse.move(image.x+100,image.y+80,{steps:8});
  expect((await ref.boundingBox()).x).toBeGreaterThan(start.x+60);await page.mouse.up();
  expect(choosers).toBe(0);await expect(ref.locator('img')).toBeVisible();
});

test('连线吸附：屏幕容差、离开释放、取消、缩放及刷新恢复',async({page})=>{
  await addNode(page,'action-video');await addNode(page,'extract-frames');
  await page.locator('#zoomFit').click();
  const source=page.locator('[data-node="action-video-1"][data-direction="output"]');
  const target=page.locator('[data-node="extract-frames-1"][data-direction="input"]');
  async function approach(offset=24){
    const a=await source.boundingBox(),b=await target.boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2+offset,{steps:8});
  }
  await approach();await expect(target).toHaveClass(/is-snap-target/);
  await page.keyboard.press('Escape');await page.mouse.up();
  await expect(page.locator('.is-snap-target,.is-compatible,.is-incompatible')).toHaveCount(0);
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(0);
  await approach();await expect(target).toHaveClass(/is-snap-target/);
  const outside=await target.boundingBox();
  await page.mouse.move(outside.x+outside.width/2,outside.y+outside.height/2+48);
  await expect(target).not.toHaveClass(/is-snap-target/);await page.mouse.up();
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(0);
  for(let i=0;i<3;i++)await page.locator('#zoomOut').click();
  await approach();await expect(target).toHaveClass(/is-snap-target/);
  const draftError=await target.evaluate(input=>{
    const path=document.querySelector('#draftConnection path'),point=path.getPointAtLength(path.getTotalLength());
    const screen=new DOMPoint(point.x,point.y).matrixTransform(path.getScreenCTM()),rect=input.getBoundingClientRect();
    return Math.hypot(screen.x-rect.x-rect.width/2,screen.y-rect.y-rect.height/2);
  });
  expect(draftError).toBeLessThan(1);
  await page.screenshot({path:'output/acceptance/connection-snap.png'});
  await page.mouse.up();await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await assertConnectionEndpoints(page);
  // 已占用的端口即使仍在吸附距离内也不再成为候选。
  await approach();await expect(target).not.toHaveClass(/is-snap-target/);await page.mouse.up();
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  await page.reload();await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await assertConnectionEndpoints(page);
});

test('正式画布：强类型连线、数量限制、类型拒绝与断线',async({page})=>{
  await addNode(page,'action-video');
  await addNode(page,'extract-frames');
  await addNode(page,'reference-image');
  await page.locator('#zoomFit').click();

  await dragPort(page,'action-video-1','video','extract-frames-1','video');
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await assertConnectionEndpoints(page);

  await dragPort(page,'reference-image-1','image','extract-frames-1','video');
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await expect(page.locator('#toast')).toContainText('连接数量已满');

  await clickVisibleConnection(page);
  await expect(page.locator('#connectionInspector')).toBeVisible();
  await clickVisibleConnection(page,'right');
  await expect(page.getByRole('menuitem',{name:'复制节点'})).toBeHidden();
  await page.getByRole('menuitem',{name:'断开连接'}).click();
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(0);

  await dragPort(page,'reference-image-1','image','extract-frames-1','video');
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('类型不兼容');

  await dragPort(page,'action-video-1','video','extract-frames-1','video');
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  await page.reload();
  await expect(page.locator('#connectionLayer .connection-hit')).toHaveCount(1);
  await assertConnectionEndpoints(page);
});

test('连接点贴边垂直居中，多输入围绕中线且缩放后不偏移',async({page})=>{
  for(const type of ['reference-image','action-video','extract-frames','assemble-character'])await addNode(page,type);
  async function assertCentered(){
    const errors=await page.locator('.workflow-node').evaluateAll(nodes=>nodes.flatMap(node=>{
      const box=node.getBoundingClientRect();
      return [...node.querySelectorAll('.port-list')].filter(list=>list.children.length).flatMap(list=>{
        const dots=[...list.querySelectorAll('.port-dot')].map(dot=>dot.getBoundingClientRect());
        const center=dots.reduce((sum,rect)=>sum+rect.y+rect.height/2,0)/dots.length;
        const edge=list.classList.contains('output')?box.right:box.left;
        return [Math.abs(center-box.y-box.height/2),...dots.map(rect=>Math.abs(rect.x+rect.width/2-edge))];
      });
    }));
    for(const error of errors)expect(error).toBeLessThan(1);
  }
  await assertCentered();await page.locator('#zoomFit').click();await assertCentered();
  const encoded=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=120;return canvas.toDataURL().split(',')[1];});
  await page.locator('[data-node-id="reference-image-1"] input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
  await expect(page.locator('[data-node-id="reference-image-1"] img')).toBeVisible();await assertCentered();
});

async function assertConnectionEndpoints(page){
  const errors=await page.locator('.connection-line').evaluate(path=>{
    const matrix=path.getScreenCTM(),length=path.getTotalLength();
    const start=path.getPointAtLength(0),end=path.getPointAtLength(length);
    const a=new DOMPoint(start.x,start.y).matrixTransform(matrix);
    const b=new DOMPoint(end.x,end.y).matrixTransform(matrix);
    const output=document.querySelector('[data-node="action-video-1"][data-direction="output"]').getBoundingClientRect();
    const input=document.querySelector('[data-node="extract-frames-1"][data-direction="input"]').getBoundingClientRect();
    return [Math.hypot(a.x-output.x-output.width/2,a.y-output.y-output.height/2),Math.hypot(b.x-input.x-input.width/2,b.y-input.y-input.height/2)];
  });
  for(const error of errors)expect(error).toBeLessThan(1);
}

test('节点重叠后可提升选中层级，右键删除及键盘删除同步清理连线',async({page})=>{
  await addNode(page,'action-video');
  const video=page.locator('.workflow-node[data-node-id="action-video-1"]');
  await addNode(page,'extract-frames');
  await dragPort(page,'action-video-1','video','extract-frames-1','video');
  await expect(page.locator('.connection-line')).toHaveCount(1);
  await video.locator('.node-header').click({position:{x:24,y:20}});
  await nodeMenu(page,video,'复制节点');
  await video.locator('.node-header').click({position:{x:18,y:18}});
  await expect(video).toHaveCSS('z-index','10');
  await nodeMenu(page,video,'删除节点');
  await expect(page.locator('.workflow-node')).toHaveCount(2);
  await expect(page.locator('.connection-line')).toHaveCount(0);
  await page.locator('.workflow-node[data-node-id="action-video-2"]').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.workflow-node')).toHaveCount(1);
});

test('右键菜单取消不改草稿、键盘可操作、菜单不越界',async({page})=>{
  const node=await addNode(page,'reference-image');
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const original=await page.evaluate(key=>localStorage.getItem(key),storageKey);
  await node.click({button:'right'});
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(node).toHaveClass(/is-selected/);
  await node.click({button:'right'});
  await page.locator('#zoomLabel').click();
  await expect(page.getByRole('menu')).toBeHidden();
  expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe(original);
  await node.click({button:'right'});
  await expect(page.getByRole('menuitem',{name:'复制节点'})).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem',{name:'删除节点'})).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('.workflow-node')).toHaveCount(2);
  await page.locator('#zoomFit').click();
  const copy=page.locator('.workflow-node').last();
  const header=await copy.locator('.node-header').boundingBox();
  const viewport=page.viewportSize();
  await page.setViewportSize({width:viewport.width,height:Math.round(header.y+header.height+35)});
  await copy.locator('.node-header').click({button:'right'});
  await expect(page.getByRole('menu')).toBeInViewport({ratio:1});
  await page.keyboard.press('Escape');
});

test('正式画布：应用内清空弹窗取消、关闭、Escape不丢数据，确认后才清空',async({page})=>{
  const openReset=async()=>{
    await page.locator('#canvasViewport').click({button:'right',position:{x:25,y:25}});
    await page.getByRole('menuitem',{name:'清空当前画布',exact:true}).click();
  };
  await addNode(page,'reference-image');
  await expect(page.locator('.workflow-topbar #resetProject')).toHaveCount(0);
  page.on('dialog',()=>{throw new Error('画布不得出现浏览器原生弹窗');});
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  const original=await page.evaluate(key=>localStorage.getItem(key),storageKey);
  await openReset();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(page.locator('.workflow-node')).toHaveCount(1);
  await page.locator('#cancelReset').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await openReset();
  await page.getByRole('button',{name:'关闭清空确认'}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await openReset();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.workflow-node')).toHaveCount(1);
  expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe(original);

  await openReset();
  await page.locator('#confirmReset').click();
  await expect(page.locator('.workflow-node')).toHaveCount(0);
  await expect(page.locator('.canvas-empty')).toBeVisible();
  await page.locator('#canvasViewport').click({button:'right',position:{x:25,y:25}});
  await expect(page.getByRole('menuitem',{name:'清空当前画布',exact:true})).toBeDisabled();
  await page.keyboard.press('End');
  await expect(page.locator('#canvasContextMenu [data-action="add"]')).toBeFocused();
});

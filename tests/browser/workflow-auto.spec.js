import {test,expect} from '@playwright/test';
import path from 'node:path';
async function menu(page,type){const node=page.locator(`.workflow-node[data-node-id^="${type}-"]`);await node.locator('.node-header').click({button:'right',position:{x:18,y:18}});}
async function preset(page,type,change){await page.evaluate(async({type,change})=>{const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{nodeAutoPresetKey,defaultNodeAutoPreset}=await import('/assets/workflow-auto-core.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key)),node=graph.nodes.find(node=>node.type===type);localStorage.setItem(nodeAutoPresetKey(graph.id,node.id),JSON.stringify({...defaultNodeAutoPreset(node),...change}));},{type,change});}
async function setup(page,video=true){
  await page.goto('/workflow');await page.getByRole('button',{name:'添加动作视频',exact:true}).click();
  if(video){await page.locator('.workflow-node input[type=file]').setInputFiles(path.resolve('output/fixtures/loop-demo.mp4'));await expect(page.locator('.mode-mark')).toHaveAttribute('data-status','ready');}
  await page.getByRole('button',{name:'添加序列帧处理',exact:true}).click();await page.getByRole('button',{name:'添加移除背景',exact:true}).click();
  await expect(page.locator('#saveState')).toHaveText('本机草稿已保存');
  await page.evaluate(async()=>{
    const core=await import('/assets/workflow-core.js'),{openWorkflowLibrary}=await import('/assets/workflow-library.js'),key=openWorkflowLibrary().active().key,registry=await(await fetch('/assets/workflow-node-registry.json')).json();let graph=JSON.parse(localStorage.getItem(key));const id=type=>graph.nodes.find(node=>node.type===type).id;
    graph=core.connectNodes(graph,registry,id('action-video'),'video',id('process-frames'),'source');graph=core.connectNodes(graph,registry,id('process-frames'),'frames',id('remove-background'),'frames');graph.nodes.forEach((node,index)=>node.position={x:100+index*340,y:100});localStorage.setItem(key,JSON.stringify(graph));
  });await page.reload();await page.locator('#zoomFit').click();
}
test('无视频不能自动执行，预设仅右栏编辑且节点独立刷新保留',async({page},info)=>{
  await setup(page,false);await menu(page,'remove-background');const run=page.getByRole('menuitem',{name:'自动执行',exact:true});await expect(run).toBeDisabled();await expect(run).toHaveAttribute('title','请先上传动作视频');
  await expect(page.getByRole('menuitem',{name:'执行预设…',exact:true})).toHaveCount(0);await expect(page.locator('.auto-preset-dialog')).toHaveCount(0);await page.keyboard.press('Escape');
  const form=page.locator('.node-auto-preset');await expect(form.getByLabel('容差',{exact:true})).toHaveValue('80');await expect(form.getByLabel('采样（帧/秒）')).toBeHidden();await form.getByLabel('容差',{exact:true}).fill('90');
  await menu(page,'process-frames');await page.keyboard.press('Escape');await form.getByLabel('采样（帧/秒）').fill('15');await form.getByRole('button',{name:'保存预设',exact:true}).click();await page.reload();await menu(page,'process-frames');await page.keyboard.press('Escape');await expect(form.getByLabel('采样（帧/秒）')).toHaveValue('15');
  await menu(page,'remove-background');await page.keyboard.press('Escape');await expect(form.getByLabel('容差',{exact:true})).toHaveValue('80');await expect(form.getByLabel('循环选帧')).toBeHidden();await page.screenshot({path:info.outputPath('preset-inspector-only.png')});
  await page.getByRole('button',{name:'添加序列帧处理',exact:true}).click();await expect(form.getByLabel('采样（帧/秒）')).toHaveValue('12');await expect(form.getByLabel('容差',{exact:true})).toBeHidden();
});
test('序列帧与透明背景工作台入口位于右栏底部',async({page},info)=>{
  await setup(page,false);
  for(const type of ['process-frames','remove-background']){
    await menu(page,type);await page.keyboard.press('Escape');
    const footer=page.locator('#nodeWorkbenchActions');await expect(footer.getByRole('button')).toBeVisible();
    const positions=await page.evaluate(()=>{const footer=document.getElementById('nodeWorkbenchActions').getBoundingClientRect(),preset=document.querySelector('.node-auto-preset').getBoundingClientRect(),panel=document.getElementById('inspector'),box=panel.getBoundingClientRect();return {top:footer.top,presetBottom:preset.bottom,bottom:footer.bottom,panelBottom:box.bottom,padding:parseFloat(getComputedStyle(panel).paddingBottom)};});
    expect(positions.top).toBeGreaterThanOrEqual(positions.presetBottom);expect(Math.abs(positions.panelBottom-positions.padding-positions.bottom)).toBeLessThan(2);
    await page.screenshot({path:info.outputPath(`${type}-bottom-entry.png`)});
  }
});
test('抠图预设单列对齐，仅指定颜色显示色板',async({page},info)=>{
  await setup(page,false);await menu(page,'remove-background');await page.keyboard.press('Escape');
  const form=page.locator('.node-auto-preset');await expect(form.getByLabel('背景色',{exact:true})).toBeHidden();
  const source=await form.getByLabel('背景来源').boundingBox(),tolerance=await form.getByLabel('容差',{exact:true}).boundingBox();expect(source.x).toBe(tolerance.x);expect(tolerance.y).toBeGreaterThan(source.y+source.height);
  await page.screenshot({path:info.outputPath('matting-preset-aligned.png')});
  await form.getByLabel('背景来源').selectOption('color');await expect(form.getByLabel('背景色',{exact:true})).toBeVisible();
  await form.getByLabel('按背景色自动清理').uncheck();await expect(form.getByLabel('背景来源')).toBeHidden();await expect(form.getByLabel('容差',{exact:true})).toBeHidden();
  await form.getByRole('button',{name:'默认值',exact:true}).click();await expect(form.getByLabel('背景来源')).toBeVisible();await expect(form.getByLabel('背景色',{exact:true})).toBeHidden();
});
test('右键自动执行真实抽帧、最短循环及抠图清理，自动发布且允许后续精修',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await setup(page);
  // 自动清理需要与源主体位置一致的模型夹具；通用Shapes夹具只用于编辑器协议。
  // 此处仍是确定性测试处理器，不冒充真实模型质量。
  await page.route('**/api/workflow-matting/jobs/*/frames/*/*',async route=>{
    const frameId=new URL(route.request().url()).pathname.split('/').at(-2);
    const png=await page.evaluate(async frameId=>{
      const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{getImage}=await import('/assets/workflow-image-store.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key)),node=graph.nodes.find(n=>n.type==='process-frames'),ref=await getImage(`sequence-source:${graph.id}:${node.id}`),record=await getImage(ref.assetId),frame=record.frames.find(frame=>frame.id===frameId);
      const bitmap=await createImageBitmap(frame.blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const image=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<image.data.length;i+=4)if(image.data[i+1]>image.data[i]*1.4&&image.data[i+1]>image.data[i+2]*1.4)image.data[i+3]=0;ctx.putImageData(image,0,0);return canvas.toDataURL().split(',')[1];
    },frameId);await route.fulfill({contentType:'image/png',body:Buffer.from(png,'base64')});
  });
  await menu(page,'process-frames');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();
  await expect(page.locator('.auto-execution-progress [role=status]')).toHaveText('自动执行完成',{timeout:60000});
  await expect(page.locator('.workflow-node[data-node-id^="remove-background-"] .mode-mark')).toHaveAttribute('data-status','ready');
  await page.screenshot({path:info.outputPath('automatic-complete.png')});
  await page.locator('.workflow-node[data-node-id^="remove-background-"] .node-header').click();await page.screenshot({path:info.outputPath('node-matting-preset.png')});
  const result=await page.evaluate(async()=>{const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{getImage}=await import('/assets/workflow-image-store.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key)),matting=graph.results.find(result=>result.nodeId.startsWith('remove-background-')),record=await getImage(matting.outputs[0].asset.id),source=await getImage('sequence-source:'+graph.id+':'+graph.nodes.find(n=>n.type==='process-frames').id);return {confirmed:matting.confirmed,count:record.frames.length,total:(await getImage(source.assetId)).frames.length,allCleaned:record.frames.every(frame=>frame.revision>0),source:record.frames.every(frame=>frame.sourceBlob instanceof Blob&&frame.autoBlob instanceof Blob)};});
  expect(result.confirmed).toBe(true);expect(result.count).toBeLessThan(result.total);expect(result.allCleaned).toBe(true);expect(result.source).toBe(true);
  await page.reload();await menu(page,'remove-background');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();const confirmation=page.getByRole('dialog',{name:'覆盖已有编辑',exact:true});await expect(confirmation).toBeVisible();await confirmation.getByRole('button',{name:'取消',exact:true}).click();
  await page.locator('.workflow-node[data-node-id^="remove-background-"] .node-header').click();await page.getByRole('button',{name:'打开透明背景工作台',exact:true}).click();const work=page.locator('#mattingWorkbench');await expect(work.locator('[data-status]')).toHaveText('已确认');await work.locator('.matting-frame').first().dblclick();await expect(work.frameLocator('iframe').locator('#resultImage')).toBeVisible();await work.getByRole('button',{name:'关闭精修',exact:true}).click();expect(errors).toEqual([]);
});

test('执行逐节点读取预设：采样6帧每秒，抠图节点关闭清理不影响循环',async({page})=>{
  await setup(page);await preset(page,'process-frames',{fps:6});await preset(page,'remove-background',{cleanup:false});
  await menu(page,'process-frames');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();await expect(page.locator('.auto-execution-progress [role=status]')).toHaveText('自动执行完成',{timeout:60000});
  const result=await page.evaluate(async()=>{const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{getImage}=await import('/assets/workflow-image-store.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key)),source=await getImage(`sequence-source:${graph.id}:${graph.nodes.find(node=>node.type==='process-frames').id}`),raw=await getImage(source.assetId),matting=graph.results.find(result=>result.nodeId.startsWith('remove-background-')),output=await getImage(matting.outputs[0].asset.id);return {total:raw.frames.length,selected:output.frames.length,cleaned:output.frames.some(frame=>frame.revision>0)};});
  expect(result).toEqual({total:24,selected:6,cleaned:false});
});
test('自动清理保留封闭的同色主体区域，取消线程不发布',async({page})=>{
  await page.goto('/workflow');const result=await page.evaluate(async()=>{
    const {workerTask}=await import('/assets/workflow-auto.js'),{DEFAULT_AUTO_PRESET}=await import('/assets/workflow-auto-core.js');
    const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const ctx=canvas.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(0,0,40,40);ctx.fillStyle='#ff0000';ctx.fillRect(10,10,20,20);ctx.fillStyle='#00ff00';ctx.fillRect(16,16,8,8);const blob=await new Promise(resolve=>canvas.toBlob(resolve));
    const output=await workerTask('./workflow-auto-cleanup-worker.js',{sourceBlob:blob,blob,preset:{...DEFAULT_AUTO_PRESET,background:'color',tolerance:20}},new AbortController().signal);const bitmap=await createImageBitmap(output.blob);ctx.clearRect(0,0,40,40);ctx.drawImage(bitmap,0,0);bitmap.close();const pixels=ctx.getImageData(0,0,40,40).data;
    const controller=new AbortController();controller.abort();let cancelled=false;try{await workerTask('./workflow-auto-cleanup-worker.js',{},controller.signal);}catch{cancelled=true;}return {corner:pixels[3],center:pixels[(20*40+20)*4+3],cancelled};
  });expect(result).toEqual({corner:0,center:255,cancelled:true});
});

test('抽帧期间取消自动分支，不发布下游结果且解除画布锁',async({page})=>{
  await setup(page);await page.route('**/api/workflow-extraction/videos',async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.continue();});
  await menu(page,'process-frames');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();
  await expect(page.locator('.auto-execution-progress')).toBeVisible();expect(await page.locator('#canvasViewport').evaluate(element=>element.inert)).toBe(false);expect(await page.locator('#inspector').evaluate(element=>element.inert)).toBe(false);
  await page.locator('#zoomIn').click();await page.locator('.workflow-node[data-node-id^="action-video-"] .node-header').click();await expect(page.locator('#inspectTitle')).toContainText('动作视频');await page.locator('.auto-execution-progress').getByRole('button',{name:'取消执行',exact:true}).click();
  await expect(page.locator('.auto-execution-progress [role=status]')).toContainText('取消');
  expect(await page.locator('#canvasViewport').evaluate(element=>element.inert)).toBe(false);
  const confirmed=await page.evaluate(async()=>{const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key));return graph.results.some(result=>result.nodeId.startsWith('remove-background-')&&result.confirmed);});expect(confirmed).toBe(false);
});

test('预设损坏显式失败，不静默采用默认值；高容差全擦除被拒绝',async({page})=>{
  await setup(page);await preset(page,'process-frames',{fps:0});await menu(page,'process-frames');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();await expect(page.locator('#toast')).toContainText('预设参数无效');await expect(page.locator('.auto-execution-progress')).not.toBeVisible();
  const message=await page.evaluate(async()=>{const {workerTask}=await import('/assets/workflow-auto.js'),{DEFAULT_AUTO_PRESET}=await import('/assets/workflow-auto-core.js'),canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const ctx=canvas.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(0,0,20,20);const blob=await new Promise(resolve=>canvas.toBlob(resolve));try{await workerTask('./workflow-auto-cleanup-worker.js',{sourceBlob:blob,blob,preset:{...DEFAULT_AUTO_PRESET,tolerance:255}},new AbortController().signal);return '';}catch(error){return error.message;}});expect(message).toContain('擦除整帧');
});

test('清理中途写回失败保存已有修订，不发布残缺阶段',async({page})=>{
  await setup(page);await preset(page,'remove-background',{background:'color',color:'#ffffff',tolerance:0});
  let writes=0;await page.route('**/api/workflow-matting/jobs/*/frames/*?revision=*',async route=>{if(route.request().method()==='PUT'&&++writes===2)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'测试清理写回失败'})});else await route.continue();});
  await menu(page,'process-frames');await page.getByRole('menuitem',{name:'自动执行',exact:true}).click();await expect(page.locator('.auto-execution-progress [role=status]')).toHaveText('测试清理写回失败',{timeout:60000});
  const result=await page.evaluate(async()=>{const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{getImage}=await import('/assets/workflow-image-store.js'),graph=JSON.parse(localStorage.getItem(openWorkflowLibrary().active().key)),node=graph.nodes.find(node=>node.type==='remove-background'),draft=await getImage(`matting-draft:${graph.id}:${node.id}`);return {confirmed:graph.results.some(result=>result.nodeId===node.id&&result.confirmed),revisions:draft.record.frames.slice(0,2).map(frame=>frame.revision)};});expect(result).toEqual({confirmed:false,revisions:[1,0]});
});

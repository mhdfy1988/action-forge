import {test,expect} from '@playwright/test';
const key='action-forge.workflow.r6b.v1';
async function fixture(page,color='#999'){
  const encoded=await page.evaluate(color=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=480;const context=canvas.getContext('2d');context.fillStyle=color;context.fillRect(80,20,160,440);return canvas.toDataURL().split(',')[1];},color);
  return {name:'参考角色.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')};
}
test.beforeEach(async({page})=>{await page.goto('/workflow');await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload();await page.locator('.node-tool[data-node-type="reference-image"]').click();});
test('真实文件选择、取消、更换失败、刷新原文件恢复和复制',async({page})=>{
  const node=page.locator('.workflow-node').first();
  const chooser=page.waitForEvent('filechooser');await node.getByRole('button',{name:'导入角色参考图'}).click();await (await chooser).setFiles([]);
  await expect(node.locator('img')).toHaveCount(0);
  await node.locator('input[type=file]').setInputFiles(await fixture(page));
  await expect(node.locator('img')).toBeVisible();await expect(page.locator('#inspectStatus')).toHaveText('已就绪');
  await expect(node.locator('.reference-file-info')).toHaveText('参考角色.png · 320 × 480');
  await expect(page.locator('#referenceImageSection img')).toBeVisible();
  await expect(page.locator('.reference-card-name')).toHaveText('参考角色.png');
  await expect(page.locator('.reference-card-dimensions')).toHaveText('320 × 480 像素');
  await expect(page.locator('#referenceImageSection img')).toHaveCSS('object-fit','contain');
  await page.getByRole('button',{name:'查看原图',exact:true}).click();
  await expect(page.locator('#imageViewer')).toBeVisible();
  await page.keyboard.press('Delete');await expect(node).toBeVisible();
  await page.getByRole('button',{name:'关闭图片',exact:true}).click();await expect(page.locator('#imageViewer')).toBeHidden();
  await expect(page.locator('#inspectStatus')).toHaveText('已就绪');
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const storedBytes=await page.evaluate(async id=>new Promise((resolve,reject)=>{const request=indexedDB.open('action-forge.workflow-media.v1',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('images','readonly'),get=tx.objectStore('images').get(id);get.onsuccess=async()=>{resolve([...new Uint8Array(await get.result.blob.arrayBuffer())]);db.close();};get.onerror=reject;};}),original.assets[0].id);
  expect(Buffer.from(storedBytes)).toEqual((await fixture(page)).buffer);
  await node.locator('input[type=file]').setInputFiles({name:'损坏.png',mimeType:'image/png',buffer:Buffer.from('not a png')});
  await expect(page.locator('#toast')).toContainText('无法解码');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).results,key)).toEqual(original.results);
  await page.reload();await expect(node.locator('img')).toBeVisible();
  expect(await node.locator('img').evaluate(image=>[image.naturalWidth,image.naturalHeight])).toEqual([320,480]);
  await node.locator('input[type=file]').setInputFiles(await fixture(page,'#eee'));
  await expect(page.locator('#toast')).toHaveText('参考图已导入');
  await page.waitForFunction(({key,oldHash})=>JSON.parse(localStorage.getItem(key)).assets.at(-1).contentHash!==oldHash,{key,oldHash:original.assets[0].contentHash});
  await node.locator('.node-header').click({button:'right'});await page.getByRole('menuitem',{name:'复制节点'}).click();
  await expect(page.locator('.workflow-node img')).toHaveCount(2);
  await page.screenshot({path:'output/acceptance/workflow-reference-import.png'});
});
test('拖入图片，存储失败保留旧图，缺失素材显式提示',async({page})=>{
  const file=await fixture(page);
  const transfer=await page.evaluateHandle(({bytes,name,type})=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(bytes)],name,{type}));return transfer;},{bytes:[...file.buffer],name:file.name,type:file.mimeType});
  await page.locator('.workflow-node .reference-drop').dispatchEvent('drop',{dataTransfer:transfer});
  await expect(page.locator('.workflow-node img')).toBeVisible();
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};});
  await page.locator('.workflow-node input[type=file]').setInputFiles(await fixture(page,'#fff'));
  await expect(page.locator('#toast')).toContainText('草稿保存失败');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).results,key)).toEqual(original.results);
  await page.evaluate(async id=>{await new Promise((resolve,reject)=>{const request=indexedDB.open('action-forge.workflow-media.v1',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('images','readwrite');tx.objectStore('images').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};});},original.assets[0].id);
  await page.reload();await expect(page.locator('.workflow-node .reference-drop')).toContainText('本机图片缺失');
});

test('导入途中删除再创建同名节点，迟到结果不能绑定新节点',async({page})=>{
  const file=await fixture(page);
  await page.evaluate(()=>{const decode=window.createImageBitmap;window.createImageBitmap=async(...args)=>{await new Promise(resolve=>{window.resumeImport=resolve;});return decode(...args);};});
  await page.locator('.workflow-node input[type=file]').setInputFiles(file);
  await expect(page.locator('#inspectStatus')).toHaveText('正在导入…');
  await page.locator('.node-header').click({button:'right'});await page.getByRole('menuitem',{name:'删除节点'}).click();
  await page.locator('.node-tool[data-node-type="reference-image"]').click();
  await page.evaluate(()=>window.resumeImport());
  await expect(page.locator('#inspectStatus')).toHaveText('等待导入');
  await expect(page.locator('.workflow-node img')).toHaveCount(0);
  await page.waitForFunction(async key=>{const data=JSON.parse(localStorage.getItem(key));return data?.nodes.length===1&&data.results.length===0;},key);
});

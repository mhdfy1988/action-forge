// 仅构造已有拆分画布，验证兼容入口；不把旧节点重新塞进产品新建菜单。
import {expect} from '@playwright/test';
export async function addLegacyNode(page,type){
  await expect.poll(()=>page.evaluate(()=>{
    const library=JSON.parse(localStorage.getItem('action-forge.workflow-library.v1')),key=library.projects.find(item=>item.id===library.project).flows.find(item=>item.id===library.flow).key,graph=JSON.parse(localStorage.getItem(key));
    const elements=[...document.querySelectorAll('.workflow-node')];return (graph?.nodes.length??0)===elements.length&&elements.every(element=>{const node=graph?.nodes.find(item=>item.id===element.dataset.nodeId);return node&&node.position.x===parseFloat(element.style.left)&&node.position.y===parseFloat(element.style.top);});
  })).toBe(true);
  await page.evaluate(async type=>{
    const {openWorkflowLibrary}=await import('/assets/workflow-library.js'),{addNode,createWorkflowProject}=await import('/assets/workflow-core.js');
    const library=openWorkflowLibrary(),key=library.active().key,graph=JSON.parse(localStorage.getItem(key))||createWorkflowProject(),registry=await (await fetch('/assets/workflow-node-registry.json')).json();
    const {width,height}=document.getElementById('canvasViewport').getBoundingClientRect(),{x,y,zoom}=graph.viewport;
    const next=addNode(graph,registry.nodes.find(item=>item.type===type),{x:(width/2-x)/zoom,y:(height/2-y)/zoom});localStorage.setItem(key,JSON.stringify(next));
  },type);await page.reload();await expect(page.locator(`.workflow-node[data-node-id^="${type}-"]`).last()).toBeVisible();
}

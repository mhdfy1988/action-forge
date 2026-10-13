import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorkflowProject,addNode,connectNodes,updateNode,duplicateNode} from '../../web/workflow-core.js';
import {mattingInput,reusableFrame,MATTING_POLICY,attachTransparent,mattingFrameNumber} from '../../web/workflow-matting.js';
const registry=JSON.parse(fs.readFileSync(new URL('../../web/workflow-node-registry.json',import.meta.url)));
test('真实抽帧字段不含整理器内部sourceIndex，重排勾选后编号仍来自稳定帧ID',()=>{
  const frame={id:'a'.repeat(32)+'-000109',sourceFrameIndex:267,sourceTimeSeconds:'89/15'};
  assert.equal(mattingFrameNumber(frame),109);assert.equal(mattingFrameNumber({...frame,sourceIndex:0}),109);assert.throws(()=>mattingFrameNumber({...frame,id:'bad'}),/身份无效/);
});
function graph(){let value=createWorkflowProject();for(const type of ['extract-frames','remove-background','process-frames'])value=addNode(value,registry.nodes.find(item=>item.type===type),{},type);value.assets.push({id:'input',type:'frame-set/source',revision:1,path:'media/input',contentHash:'a'.repeat(64)});value.results.push({nodeId:'extract-frames',confirmed:true,resultSignature:'source',outputs:[{port:'frames',asset:{id:'input',revision:1}}]});value=connectNodes(value,registry,'extract-frames','frames','remove-background','frames');return connectNodes(value,registry,'remove-background','frames','process-frames','source');}
test('透明背景输入签名忽略名称位置，源修订与未知参数明确失效',()=>{
  const value=graph(),before=mattingInput(value,'remove-background').fingerprint;
  const renamed=updateNode(value,'remove-background',{name:'跑步透明帧',position:{x:100,y:200}});assert.equal(mattingInput(renamed,'remove-background').fingerprint,before);
  const changed=structuredClone(value);changed.results[0].resultSignature='changed';assert.notEqual(mattingInput(changed,'remove-background').fingerprint,before);
  changed.results[0].confirmed=false;assert.throws(()=>mattingInput(changed,'remove-background'),/已确认/);
  value.nodes.find(node=>node.type==='remove-background').parameters.despillStrength=.5;assert.throws(()=>mattingInput(value,'remove-background'),/未支持/);
});
test('补抠严格匹配帧身份和源像素；确认只发布完整透明集，复制不共享草稿身份',()=>{
  const frame={id:'frame',contentHash:'source'},cached={id:'frame',sourceHash:'source',autoBlob:new Blob(['auto']),blob:new Blob(['manual']),revision:3};
  assert.equal(reusableFrame(frame,{policy:MATTING_POLICY,frames:[cached]}),cached);assert.equal(reusableFrame({...frame,contentHash:'changed'},{policy:MATTING_POLICY,frames:[cached]}),undefined);assert.equal(reusableFrame(frame,{policy:'old',frames:[cached]}),false);
  const value=graph();assert.throws(()=>attachTransparent(value,'remove-background',{kind:'frame-set/transparent',frames:[frame]},'sig'),/不完整/);
  const next=attachTransparent(value,'remove-background',{id:'transparent',kind:'frame-set/transparent',contentHash:'b'.repeat(64),frames:[cached]},'sig');assert.equal(next.results.find(item=>item.nodeId==='remove-background').confirmed,true);
  const original=value.nodes.find(item=>item.type==='remove-background');assert.notEqual(duplicateNode(value,'remove-background').project.nodes.at(-1).id,original.id);
});

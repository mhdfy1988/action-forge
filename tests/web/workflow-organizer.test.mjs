import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorkflowProject,addNode,connectNodes,attachActionVideo,updateNode,removeNode,duplicateNode} from '../../web/workflow-core.js';
import {attachFrameSet} from '../../web/workflow-extraction.js';
import {organizerInput,createOrganizerEditor,organizerDraft,organizedRecord,attachOrganized,restoreOrganizerFrame,organizerOutputSignature,recordOrganizerSelection} from '../../web/workflow-organizer.js';
import {bindLoopCandidates,selectLoopCandidate} from '../../web/loop-core.js';
const registry=JSON.parse(fs.readFileSync(new URL('../../web/workflow-node-registry.json',import.meta.url)));
test('仅输出勾选帧；补勾、顺序、签名、历史和刷新相互一致',async()=>{
  const editor=createOrganizerEditor(record),before=editor.snapshot(),signature=organizerOutputSignature(editor);editor.clearSelection();editor.select('frame-2');recordOrganizerSelection(editor,before);
  assert.notEqual(organizerOutputSignature(editor),signature);assert.equal(editor.order.length,3);
  const output=await organizedRecord(record,editor);assert.deepEqual(output.frames.map(f=>f.id),['frame-2']);
  const restored=createOrganizerEditor(record,organizerDraft(editor));assert.deepEqual(restored.checkedFrames.map(f=>f.id),['frame-2']);restored.undo();assert.equal(restored.selected.size,3);restored.redo();assert.equal(restored.selected.size,1);
  restored.select('frame-3',{toggle:true});assert.deepEqual((await organizedRecord(record,restored)).frames.map(f=>f.id),['frame-2','frame-3']);restored.clearSelection();await assert.rejects(()=>organizedRecord(record,restored),/至少勾选/);
});
test('循环候选只选中，不删除；补勾帧和一步撤销均保留完整来源',()=>{
  const source={...record,frames:Array.from({length:8},(_,i)=>({...record.frames[0],id:`f${i}`}))},editor=createOrganizerEditor(source),before=editor.snapshot();
  const [candidate]=bindLoopCandidates(editor.order,editor.revision,[{start:2,endExclusive:6,count:4}]);selectLoopCandidate(editor,candidate);recordOrganizerSelection(editor,before);
  assert.equal(editor.order.length,8);assert.deepEqual([...editor.selected],['f2','f3','f4','f5']);editor.undo();assert.equal(editor.selected.size,8);editor.redo();assert.equal(editor.selected.size,4);
  assert.throws(()=>selectLoopCandidate(editor,candidate),/变化/);
});
test('合并节点直接整理透明帧集，不要求视频和抽帧记录',async()=>{
  let value=graph();value.assets.find(asset=>asset.id==='input').type='frame-set/transparent';
  value=addNode(value,registry.nodes.find(item=>item.type==='process-frames'),{},'direct');value=connectNodes(value,registry,'extract-frames','frames','direct','source');
  const source={...record,kind:'frame-set/transparent'},editor=createOrganizerEditor(source);editor.swap('frame-1','frame-3');
  const output=await organizedRecord(source,editor),next=attachOrganized(value,'direct',output,'direct-signature');
  assert.equal(organizerInput(next,'direct').asset.type,'frame-set/transparent');assert.equal(next.assets.at(-1).type,'frame-set/transparent');assert.equal(output.frames[0].id,'frame-3');
});
const record={id:'input',kind:'frame-set/source',name:'跑步',width:2,height:2,contentHash:'b'.repeat(64),sequence:{formatVersion:2,canvas:{width:2,height:2}},frames:[1,2,3].map(id=>({id:`frame-${id}`,durationSeconds:'1/12',sourceTimeSeconds:`${id}/12`,blob:new Blob(['png']),contentHash:`hash-${id}`}))};
function graph(){let value=createWorkflowProject();for(const type of ['action-video','extract-frames','organize-frames','remove-background'])value=addNode(value,registry.nodes.find(item=>item.type===type),{},type);value=attachActionVideo(value,'action-video',{id:'video',contentHash:'a'.repeat(64)});value=connectNodes(value,registry,'action-video','video','extract-frames','video');value=attachFrameSet(value,'extract-frames',record,'input-signature');value=connectNodes(value,registry,'extract-frames','frames','organize-frames','frames');return connectNodes(value,registry,'organize-frames','frames','remove-background','frames');}

test('合并节点抽帧原始集与整理输出分离，确认后仍以原始集编辑',async()=>{
  let value=graph();value=addNode(value,registry.nodes.find(item=>item.type==='process-frames'),{},'process');value=connectNodes(value,registry,'action-video','video','process','source');
  const input=organizerInput(value,'process',record),editor=createOrganizerEditor(record);editor.remove(['frame-2']);const output=await organizedRecord(record,editor);value=attachOrganized(value,'process',output,'signature',record);
  assert.equal(value.results.find(item=>item.nodeId==='process').confirmed,true);assert.equal(output.frames.length,2);assert.equal(record.frames.length,3);assert.equal(organizerInput(value,'process',record).fingerprint,input.fingerprint);
  assert.throws(()=>attachOrganized(value,'process',{...output,kind:'frame-set/transparent'},'bad',record),/类型/);
});
test('查看与勾选独立，交换删除恢复和历史可回读',()=>{const editor=createOrganizerEditor(record);editor.clearSelection();editor.select('frame-2');editor.view('frame-3');assert.deepEqual([...editor.selected],['frame-2']);editor.swap('frame-1','frame-3');assert.equal(editor.order[0],'frame-3');editor.remove(['frame-3']);assert.deepEqual(editor.order,['frame-2','frame-1']);const restored=createOrganizerEditor(record,organizerDraft(editor));restored.undo();assert.equal(restored.order[0],'frame-3');restored.redo();assert.deepEqual(restored.order,editor.order);assert.equal(record.frames.length,3);assert.throws(()=>createOrganizerEditor(record,{snapshot:{order:['bad'],selected:[]},undo:[],redo:[]}),/草稿无效/);});
test('恢复保留删除前手动顺序；重建和复制节点不复用草稿身份',()=>{const editor=createOrganizerEditor(record);editor.swap('frame-1','frame-3');editor.remove(['frame-1']);restoreOrganizerFrame(editor,'frame-1');assert.deepEqual(editor.order,['frame-3','frame-2','frame-1']);const definition=registry.nodes.find(item=>item.type==='organize-frames');const value=addNode(createWorkflowProject(),definition),id=value.nodes[0].id;assert.notEqual(addNode(removeNode(value,id),definition).nodes[0].id,id);assert.notEqual(duplicateNode(value,id).nodeId,id);});
test('确认输出保留身份来源与时长，输入不被覆盖，名称不影响签名',async()=>{const value=graph(),fingerprint=organizerInput(value,'organize-frames').fingerprint,editor=createOrganizerEditor(record);editor.swap('frame-1','frame-3');editor.remove(['frame-2']);const output=await organizedRecord(record,editor);assert.deepEqual(output.frames.map(frame=>frame.id),['frame-3','frame-1']);assert.equal(output.frames[0].sourceTimeSeconds,'3/12');assert.equal(output.frames[0].durationSeconds,'1/12');assert.equal(record.frames.length,3);const next=attachOrganized(value,'organize-frames',output,'signature');assert.equal(next.results.at(-1).confirmed,true);assert.equal(next.assets.at(-1).type,'frame-set/source');assert.equal(organizerInput(updateNode(value,'organize-frames',{name:'新名'}),'organize-frames').fingerprint,fingerprint);assert.throws(()=>organizerInput(updateNode(value,'extract-frames',{parameters:{fps:16}}),'organize-frames'),/就绪/);editor.remove(editor.order);await assert.rejects(()=>organizedRecord(record,editor),/至少勾选/);});
test('透明输入透传类型；确认新整理输出只失效相关下游',async()=>{const value=graph();value.assets.find(asset=>asset.id==='input').type='frame-set/transparent';value.results.push({nodeId:'remove-background',confirmed:true});const output=await organizedRecord({...record,kind:'frame-set/transparent'},createOrganizerEditor(record)),next=attachOrganized(value,'organize-frames',output,'signature');assert.equal(next.assets.at(-1).type,'frame-set/transparent');assert.equal(next.results.find(result=>result.nodeId==='remove-background').confirmed,false);assert.equal(next.results.find(result=>result.nodeId==='extract-frames').confirmed,true);});

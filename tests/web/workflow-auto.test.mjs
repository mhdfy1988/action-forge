import test from 'node:test';
import assert from 'node:assert/strict';
import {autoPlan,chooseAutoLoop,validateAutoPreset,DEFAULT_AUTO_PRESET,nodeAutoPresetKey,defaultNodeAutoPreset,validateNodeAutoPreset} from '../../web/workflow-auto-core.js';
import {selectAutomaticLoop} from '../../web/workflow-auto.js';
import {createOrganizerEditor} from '../../web/workflow-organizer.js';
test('自动预设严格校验数字、颜色及循环策略',()=>{
  assert.deepEqual(validateAutoPreset(DEFAULT_AUTO_PRESET),DEFAULT_AUTO_PRESET);
  for(const change of [{fps:0},{fps:1.5},{tolerance:256},{color:'green'},{loop:'guess'},{endSeconds:-1},{cleanup:'yes'}])assert.throws(()=>validateAutoPreset({...DEFAULT_AUTO_PRESET,...change}));
});
test('预设按工程与节点隔离，并仅接受当前节点字段',()=>{
  assert.notEqual(nodeAutoPresetKey('p','a'),nodeAutoPresetKey('p','b'));assert.notEqual(nodeAutoPresetKey('p','a'),nodeAutoPresetKey('q','a'));
  assert.deepEqual(defaultNodeAutoPreset({type:'process-frames',parameters:{fps:24,startSeconds:1,endSeconds:4}}),{startSeconds:1,endSeconds:4,fps:24,loop:'shortest'});
  const remove=defaultNodeAutoPreset({type:'remove-background',parameters:{}});assert.equal(remove.tolerance,80);assert.equal('fps' in remove,false);assert.throws(()=>validateNodeAutoPreset('remove-background',{...remove,fps:12}),/字段/);
});
test('只在可靠候选中选择最短循环，没有候选返回空供全选处理',()=>{
  const candidates=[{count:12,score:.1,start:0},{count:6,score:.4,start:12},{count:6,score:.2,start:6}];
  assert.equal(chooseAutoLoop(candidates,'shortest'),candidates[2]);assert.equal(chooseAutoLoop(candidates,'best'),candidates[0]);assert.equal(chooseAutoLoop([],'shortest'),null);assert.equal(chooseAutoLoop([],'best'),null);
});

test('无循环候选自动全选且保留撤销，检测错误不会转为全选',async()=>{
  const previousWorker=globalThis.Worker;
  let fail=false;
  globalThis.Worker=class{postMessage(){queueMicrotask(()=>this.onmessage({data:fail?{type:'error',message:'检测失败'}:{candidates:[]}}));}terminate(){}};
  try{
    const input={sequence:{formatVersion:2},frames:[1,2,3].map(n=>({id:`frame-${n}`,blob:new Blob(['png']),durationSeconds:'1/12'}))};
    for(const loop of ['shortest','best']){
      const editor=createOrganizerEditor(input);editor.clearSelection();editor.select('frame-2');const messages=[];
      const draft=await selectAutomaticLoop(input,editor,{...DEFAULT_AUTO_PRESET,loop},new AbortController().signal,message=>messages.push(message));
      assert.deepEqual(draft.snapshot.selected,['frame-1','frame-2','frame-3']);assert.match(messages.at(-1),/已全选/);assert.equal(editor.order.length,3);editor.undo();assert.deepEqual([...editor.selected],['frame-2']);
    }
    fail=true;const editor=createOrganizerEditor(input);editor.clearSelection();editor.select('frame-2');
    await assert.rejects(()=>selectAutomaticLoop(input,editor,DEFAULT_AUTO_PRESET,new AbortController().signal,()=>{}),/检测失败/);assert.deepEqual([...editor.selected],['frame-2']);
  }finally{globalThis.Worker=previousWorker;}
});
test('自动计划按依赖顺序执行并继续下游，不执行未接通节点',()=>{
  const graph={nodes:[{id:'v',type:'action-video'},{id:'s',type:'process-frames'},{id:'m',type:'remove-background'},{id:'clip',type:'build-action-clip'}],connections:[{fromNode:'v',toNode:'s',toPort:'source'},{fromNode:'s',toNode:'m',toPort:'frames'},{fromNode:'m',toNode:'clip',toPort:'frames'}],results:[]};
  for(const id of ['v','s','m'])assert.deepEqual(autoPlan(graph,id).nodes.map(n=>n.id),['v','s','m']);
  assert.deepEqual(autoPlan(graph,'s').boundary,['clip']);assert.throws(()=>autoPlan({...graph,connections:[]},'m'));assert.throws(()=>autoPlan(graph,'clip'));
});

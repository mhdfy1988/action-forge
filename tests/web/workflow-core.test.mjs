import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {addNode,canConnect,connectNodes,createWorkflowProject,duplicateNode,parseStoredProject,removeNode,updateNode,updateViewport} from '../../web/workflow-core.js';

const registry=JSON.parse(fs.readFileSync(new URL('../../web/workflow-node-registry.json',import.meta.url),'utf8'));
const definition=type=>registry.nodes.find(node=>node.type===type);

test('序列帧处理输入视频或已有帧，输出保持帧类型且只允许一个来源',()=>{
  let project=createWorkflowProject();for(const type of ['action-video','process-frames','remove-background','build-action-clip'])project=addNode(project,definition(type),{},type);
  project=connectNodes(project,registry,'action-video','video','process-frames','source');
  assert.equal(canConnect(project,registry,'process-frames','frames','remove-background','frames').ok,true);
  assert.equal(canConnect(project,registry,'process-frames','frames','build-action-clip','frames').ok,false);
  let frames=createWorkflowProject();for(const type of ['extract-frames','remove-background','process-frames','build-action-clip'])frames=addNode(frames,definition(type),{},type);
  frames=connectNodes(frames,registry,'extract-frames','frames','remove-background','frames');frames=connectNodes(frames,registry,'remove-background','frames','process-frames','source');
  assert.equal(canConnect(frames,registry,'process-frames','frames','build-action-clip','frames').ok,true);
  assert.equal(canConnect(frames,registry,'process-frames','frames','remove-background','frames').ok,false);
  assert.equal(canConnect(frames,registry,'extract-frames','frames','process-frames','source').ok,false);
});

test('空项目可添加、移动、复制和删除节点',()=>{
  let project=createWorkflowProject({id:'demo',name:'演示'});
  project=addNode(project,definition('action-video'),{x:10,y:20},'video');
  project=updateNode(project,'video',{position:{x:48,y:96},parameters:{label:'跑步视频'}});
  const duplicated=duplicateNode(project,'video');project=duplicated.project;
  assert.deepEqual(project.nodes[0].position,{x:48,y:96});
  assert.equal(project.nodes[0].parameters.label,'跑步视频');
  assert.equal(project.nodes[1].id,duplicated.nodeId);
  project=removeNode(project,'video');
  assert.equal(project.nodes.length,1);
});

test('连接遵守类型、数量和有向无环限制',()=>{
  let project=createWorkflowProject();
  for(const [id,type] of [['video','action-video'],['extract','extract-frames'],['organize-a','organize-frames'],['organize-b','organize-frames'],['reference','reference-image']])project=addNode(project,definition(type),{},id);
  assert.equal(canConnect(project,registry,'video','video','extract','video').ok,true);
  project=connectNodes(project,registry,'video','video','extract','video');
  assert.match(canConnect(project,registry,'reference','image','extract','video').reason,/连接数量已满/);
  assert.match(canConnect(project,registry,'reference','image','organize-a','frames').reason,/类型不兼容/);
  project=connectNodes(project,registry,'extract','frames','organize-a','frames');
  project=connectNodes(project,registry,'organize-a','frames','organize-b','frames');
  assert.match(canConnect(project,registry,'organize-b','frames','organize-a','frames').reason,/连接数量已满|依赖环/);

  let cycle=createWorkflowProject();
  cycle=addNode(cycle,definition('organize-frames'),{},'a');
  cycle=addNode(cycle,definition('organize-frames'),{},'b');
  cycle=connectNodes(cycle,registry,'a','frames','b','frames');
  assert.match(canConnect(cycle,registry,'b','frames','a','frames').reason,/依赖环/);
});

test('整理节点保持上游帧集类型',()=>{
  let project=createWorkflowProject();
  for(const [id,type] of [['video','action-video'],['extract','extract-frames'],['organize','organize-frames'],['clip','build-action-clip'],['matting','remove-background']])project=addNode(project,definition(type),{},id);
  project=connectNodes(project,registry,'video','video','extract','video');
  project=connectNodes(project,registry,'extract','frames','organize','frames');
  assert.match(canConnect(project,registry,'organize','frames','clip','frames').reason,/类型不兼容/);
  project={...project,connections:project.connections.filter(edge=>edge.toNode!=='organize')};
  project=connectNodes(project,registry,'extract','frames','matting','frames');
  project=connectNodes(project,registry,'matting','frames','organize','frames');
  assert.equal(canConnect(project,registry,'organize','frames','clip','frames').ok,true);
});

test('视口边界和浏览器草稿回读稳定',()=>{
  let project=createWorkflowProject({id:'draft',name:'草稿'});
  project=updateViewport(project,{x:125,y:-80,zoom:9});
  assert.deepEqual(project.viewport,{x:125,y:-80,zoom:2.2});
  assert.deepEqual(parseStoredProject(JSON.stringify(project)),project);
  assert.throws(()=>parseStoredProject('{"kind":"other"}'),/格式无效/);
});

test('节点名称独立于类型和参数；改名不失效结果，默认与复制名称避免重复',()=>{
  let project=createWorkflowProject();
  project=addNode(project,definition('action-video'),{},'a');
  project=addNode(project,definition('action-video'),{},'b');
  assert.deepEqual(project.nodes.map(node=>node.name),['动作视频 1','动作视频 2']);
  project.results=[{nodeId:'a',confirmed:true,outputs:[]}];
  project=updateNode(project,'a',{name:' 跑步·右 '});
  assert.equal(project.nodes[0].name,'跑步·右');assert.equal(project.nodes[0].type,'action-video');
  assert.deepEqual(project.nodes[0].parameters,{});assert.equal(project.results[0].confirmed,true);
  assert.throws(()=>updateNode(project,'a',{name:' '}),/名称/);
  assert.throws(()=>updateNode(project,'a',{name:'字'.repeat(81)}),/名称/);
  const copy=duplicateNode(project,'a');assert.equal(copy.project.nodes.at(-1).name,'跑步·右 副本 1');
  const old=structuredClone(project);delete old.nodes[0].name;
  assert.equal(parseStoredProject(JSON.stringify(old),registry).nodes[0].name,'动作视频 1');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {addNode,attachReferenceImage,attachActionVideo,referenceImageAsset,connectNodes,createWorkflowProject,duplicateNode,parseStoredProject,updateNode,removeConnection} from '../../web/workflow-core.js';
const registry=JSON.parse(fs.readFileSync(new URL('../../web/workflow-node-registry.json',import.meta.url),'utf8'));
const definition=type=>registry.nodes.find(node=>node.type===type);
test('参考图复用现有结果协议，换图仅失效可达下游；相同字节不失效',()=>{
  let project=createWorkflowProject();
  for(const [id,type] of [['source','reference-image'],['video','action-video'],['frames','extract-frames'],['other','reference-image']])project=addNode(project,definition(type),{},id);
  project=connectNodes(project,registry,'source','image','video','reference');
  project=connectNodes(project,registry,'video','video','frames','video');
  project=attachReferenceImage(project,'source',{id:'image-1',contentHash:'a'.repeat(64)});
  project.results.push(...['video','frames','other'].map(nodeId=>({nodeId,confirmed:true,outputs:[]})));
  const unchanged=attachReferenceImage(project,'source',{id:'image-2',contentHash:'a'.repeat(64)});
  assert.equal(unchanged.results.find(item=>item.nodeId==='frames').confirmed,true);
  project=attachReferenceImage(project,'source',{id:'image-3',contentHash:'b'.repeat(64)});
  assert.equal(project.results.find(item=>item.nodeId==='video').confirmed,false);
  assert.equal(project.results.find(item=>item.nodeId==='frames').confirmed,false);
  assert.equal(project.results.find(item=>item.nodeId==='other').confirmed,true);
  assert.equal(referenceImageAsset(project,'source').path,'media/image-3');
  const copy=duplicateNode(project,'source');
  assert.equal(referenceImageAsset(copy.project,copy.nodeId).id,'image-3');
  assert.throws(()=>attachReferenceImage(project,'video',{}),/不存在/);
});

test('视频素材可独立导入；参数与连接修改只失效相关结果，移动不失效',()=>{
  let project=createWorkflowProject();
  for(const [id,type] of [['ref','reference-image'],['video','action-video'],['frames','extract-frames'],['other','action-video']])project=addNode(project,definition(type),{},id);
  project=attachActionVideo(project,'video',{id:'v1',contentHash:'a'.repeat(64)});
  project=attachActionVideo(project,'other',{id:'v2',contentHash:'b'.repeat(64)});
  project=connectNodes(project,registry,'video','video','frames','video');
  project.results.push({nodeId:'frames',confirmed:true,outputs:[]});
  project=updateNode(project,'video',{position:{x:10,y:20}});
  assert.equal(project.results.find(item=>item.nodeId==='video').confirmed,true);
  project=connectNodes(project,registry,'ref','image','video','reference');
  assert.equal(project.results.find(item=>item.nodeId==='video').confirmed,false);
  assert.equal(project.results.find(item=>item.nodeId==='frames').confirmed,false);
  assert.equal(project.results.find(item=>item.nodeId==='other').confirmed,true);
  project=attachActionVideo(project,'video',{id:'v3',contentHash:'c'.repeat(64)});
  project=updateNode(project,'video',{parameters:{prompt:'跳跃'}});
  assert.equal(project.results.find(item=>item.nodeId==='video').confirmed,false);
  project=attachActionVideo(project,'video',{id:'v4',contentHash:'d'.repeat(64)});
  project=removeConnection(project,project.connections.find(edge=>edge.toNode==='video').id);
  assert.equal(project.results.find(item=>item.nodeId==='video').confirmed,false);
});

test('旧视频类型显式合并，保留ID、连接、备注和位置',()=>{
  let project=createWorkflowProject();
  project=addNode(project,definition('action-video'),{x:30,y:40},'video');
  project.nodes[0].type='generate-action-video';project.nodes[0].parameters={prompt:'跑步'};
  const migrated=parseStoredProject(JSON.stringify(project));
  assert.equal(migrated.nodes[0].type,'action-video');
  assert.equal(migrated.nodes[0].id,'video');
  assert.deepEqual(migrated.nodes[0].position,project.nodes[0].position);
  assert.deepEqual(migrated.nodes[0].parameters,{prompt:'跑步'});
});

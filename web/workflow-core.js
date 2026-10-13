const ID_PATTERN=/^[a-z0-9][a-z0-9._-]{0,63}$/;

export function createWorkflowProject({id='untitled-workflow',name='未命名工作流'}={}){
  return {formatVersion:1,kind:'action-forge-workflow',id,name,revision:0,
    viewport:{x:0,y:0,zoom:1},nodes:[],connections:[],assets:[],results:[]};
}

export function registryMap(registry){
  if(!registry||registry.formatVersion!==1||!Array.isArray(registry.nodes))throw new Error('节点目录格式无效');
  return new Map(registry.nodes.map(definition=>[definition.type,definition]));
}

function uniqueId(prefix,existing){
  let index=1;
  while(existing.has(`${prefix}-${index}`))index+=1;
  return `${prefix}-${index}`;
}

function uniqueName(base,nodes){
  const used=new Set(nodes.map(node=>node.name));let index=1;
  while(used.has(`${base} ${index}`))index+=1;
  return `${base} ${index}`;
}

export function addNode(project,definition,position={x:0,y:0},requestedId){
  const existing=new Set(project.nodes.map(node=>node.id));
  // 人工整理草稿绑定节点身份；删除后重建不能复用旧实例的草稿键。
  const id=requestedId||(['organize-frames','process-frames','remove-background'].includes(definition.type)?`${definition.type}-${crypto.randomUUID()}`:uniqueId(definition.type,existing));
  if(!ID_PATTERN.test(id)||existing.has(id))throw new Error('节点ID无效或已存在');
  const node={id,type:definition.type,name:uniqueName(definition.title,project.nodes),definitionVersion:definition.version,
    position:{x:Number(position.x)||0,y:Number(position.y)||0},collapsed:false,parameters:{}};
  return {...project,revision:project.revision+1,nodes:[...project.nodes,node]};
}

export function updateNode(project,nodeId,patch){
  if(!project.nodes.some(node=>node.id===nodeId))throw new Error('节点不存在');
  if(patch.name!==undefined&&(typeof patch.name!=='string'||!patch.name.trim()||patch.name.trim().length>80))throw new Error('节点名称须为1–80个字符');
  const next={...project,revision:project.revision+1,nodes:project.nodes.map(node=>node.id===nodeId?{
    ...node,
    ...(patch.name!==undefined?{name:patch.name.trim()}:{}),
    ...(patch.position?{position:{x:Number(patch.position.x)||0,y:Number(patch.position.y)||0}}:{}),
    ...(patch.parameters?{parameters:{...patch.parameters}}:{}),
    ...(typeof patch.collapsed==='boolean'?{collapsed:patch.collapsed}:{}),
  }:node)};
  return patch.parameters&&JSON.stringify(project.nodes.find(node=>node.id===nodeId).parameters)!==JSON.stringify(patch.parameters)?invalidateResults(next,nodeId):next;
}

export function invalidateResults(project,nodeId,{includeSelf=true}={}){
  const affected=new Set(includeSelf?[nodeId]:[]),visited=new Set(),pending=[nodeId];
  while(pending.length){const id=pending.pop();if(visited.has(id))continue;visited.add(id);for(const edge of project.connections){if(edge.fromNode===id){affected.add(edge.toNode);pending.push(edge.toNode);}}}
  return {...project,results:project.results.map(result=>affected.has(result.nodeId)?{...result,confirmed:false}:result)};
}

export function removeNode(project,nodeId){
  if(!project.nodes.some(node=>node.id===nodeId))return project;
  project=invalidateResults(project,nodeId);
  return {...project,revision:project.revision+1,
    nodes:project.nodes.filter(node=>node.id!==nodeId),
    connections:project.connections.filter(connection=>connection.fromNode!==nodeId&&connection.toNode!==nodeId),
    results:project.results.filter(result=>result.nodeId!==nodeId)};
}

export function duplicateNode(project,nodeId){
  const original=project.nodes.find(node=>node.id===nodeId);
  if(!original)throw new Error('节点不存在');
  const existing=new Set(project.nodes.map(node=>node.id));
  const id=['organize-frames','process-frames','remove-background'].includes(original.type)?`${original.type}-${crypto.randomUUID()}`:uniqueId(original.type,existing);
  const copy={...structuredClone(original),id,name:uniqueName(`${original.name||original.type} 副本`,project.nodes),position:{x:original.position.x+36,y:original.position.y+36}};
  let sourceResult=['reference-image','action-video'].includes(original.type)?project.results.find(result=>result.nodeId===nodeId):null;
  // 复制视频没有复制输入连线，关联过参考图的结果必须重新确认。
  if(sourceResult&&original.type==='action-video'&&project.connections.some(edge=>edge.toNode===nodeId))sourceResult={...sourceResult,confirmed:false};
  const results=sourceResult?[...project.results,{...structuredClone(sourceResult),nodeId:id}]:project.results;
  return {project:{...project,revision:project.revision+1,nodes:[...project.nodes,copy],results},nodeId:id};
}

export function referenceImageAsset(project,nodeId){
  return sourceAsset(project,nodeId,'image');
}

export function sourceAsset(project,nodeId,port='video'){
  const result=project.results.find(item=>item.nodeId===nodeId);
  const reference=result?.outputs.find(output=>output.port===port)?.asset;
  return reference?project.assets.find(asset=>asset.id===reference.id&&asset.revision===reference.revision):null;
}

export function attachActionVideo(project,nodeId,record){
  const node=project.nodes.find(item=>item.id===nodeId);
  if(node?.type!=='action-video')throw new Error('动作视频节点不存在');
  const next=invalidateResults(project,nodeId);
  const asset={id:record.id,type:'action-video',revision:1,path:`media/${record.id}`,contentHash:record.contentHash};
  const result={nodeId,definitionVersion:node.definitionVersion,resultSignature:record.contentHash,confirmed:true,outputs:[{port:'video',asset:{id:asset.id,revision:1}}]};
  return {...next,revision:project.revision+1,assets:[...project.assets,asset],results:[...next.results.filter(item=>item.nodeId!==nodeId),result]};
}

export function attachReferenceImage(project,nodeId,record){
  const node=project.nodes.find(item=>item.id===nodeId);
  if(node?.type!=='reference-image')throw new Error('角色参考图节点不存在');
  const asset={id:record.id,type:'reference-image',revision:1,path:`media/${record.id}`,contentHash:record.contentHash};
  const previous=referenceImageAsset(project,nodeId);
  const stale=new Set();
  if(previous?.contentHash!==asset.contentHash){
    const pending=[nodeId];
    while(pending.length){const id=pending.pop();for(const edge of project.connections){if(edge.fromNode===id&&!stale.has(edge.toNode)){stale.add(edge.toNode);pending.push(edge.toNode);}}}
  }
  const result={nodeId,definitionVersion:node.definitionVersion,resultSignature:record.contentHash,confirmed:true,outputs:[{port:'image',asset:{id:asset.id,revision:asset.revision}}]};
  return {...project,revision:project.revision+1,assets:[...project.assets,asset],results:[...project.results.filter(item=>item.nodeId!==nodeId).map(item=>stale.has(item.nodeId)?{...item,confirmed:false}:item),result]};
}

function findPort(definition,direction,name){
  return definition?.[direction]?.find(port=>port.name===name)||null;
}

function outputTypes(project,definitions,nodeId,portName,memo=new Map()){
  const key=`${nodeId}:${portName}`;
  if(memo.has(key))return memo.get(key);
  const node=project.nodes.find(item=>item.id===nodeId);
  const definition=definitions.get(node?.type);
  const port=findPort(definition,'outputs',portName);
  if(!port)throw new Error('输出端口不存在');
  if(node.type==='process-frames'){
    const source=project.connections.find(edge=>edge.toNode===nodeId&&edge.toPort==='source');
    if(source){const input=outputTypes(project,definitions,source.fromNode,source.fromPort,memo);const types=new Set(input.has('action-video')?['frame-set/source']:input);memo.set(key,types);return types;}
  }
  if(!port.passthroughInput){const types=new Set(port.assetTypes);memo.set(key,types);return types;}
  const source=project.connections.find(connection=>connection.toNode===nodeId&&connection.toPort===port.passthroughInput);
  if(!source){const types=new Set(port.assetTypes);memo.set(key,types);return types;}
  const types=outputTypes(project,definitions,source.fromNode,source.fromPort,memo);memo.set(key,types);return types;
}

function createsCycle(project,fromNode,toNode){
  const outgoing=new Map(project.nodes.map(node=>[node.id,[]]));
  for(const edge of project.connections)outgoing.get(edge.fromNode)?.push(edge.toNode);
  outgoing.get(fromNode)?.push(toNode);
  const pending=[toNode],visited=new Set();
  while(pending.length){const current=pending.pop();if(current===fromNode)return true;if(visited.has(current))continue;visited.add(current);pending.push(...(outgoing.get(current)||[]));}
  return false;
}

export function canConnect(project,registry,fromNode,fromPort,toNode,toPort){
  const definitions=registryMap(registry);
  const source=project.nodes.find(node=>node.id===fromNode);
  const target=project.nodes.find(node=>node.id===toNode);
  if(!source||!target)return {ok:false,reason:'节点不存在'};
  if(fromNode===toNode)return {ok:false,reason:'不能连接节点自身'};
  const sourcePort=findPort(definitions.get(source.type),'outputs',fromPort);
  const targetPort=findPort(definitions.get(target.type),'inputs',toPort);
  if(!sourcePort)return {ok:false,reason:'输出端口不存在'};
  if(!targetPort)return {ok:false,reason:'输入端口不存在'};
  if(project.connections.some(edge=>edge.fromNode===fromNode&&edge.fromPort===fromPort&&edge.toNode===toNode&&edge.toPort===toPort))return {ok:false,reason:'连接已经存在'};
  const count=project.connections.filter(edge=>edge.toNode===toNode&&edge.toPort===toPort).length;
  if(targetPort.maxConnections!==null&&count>=targetPort.maxConnections)return {ok:false,reason:'输入端口连接数量已满'};
  const actual=outputTypes(project,definitions,fromNode,fromPort);
  if(!targetPort.assetTypes.some(type=>actual.has(type)))return {ok:false,reason:`类型不兼容：需要 ${targetPort.assetTypes.join(' / ')}`};
  if(createsCycle(project,fromNode,toNode))return {ok:false,reason:'连接会形成依赖环'};
  return {ok:true,reason:''};
}

export function connectNodes(project,registry,fromNode,fromPort,toNode,toPort){
  const check=canConnect(project,registry,fromNode,fromPort,toNode,toPort);
  if(!check.ok)throw new Error(check.reason);
  const existing=new Set(project.connections.map(connection=>connection.id));
  const connection={id:uniqueId('connection',existing),fromNode,fromPort,toNode,toPort};
  return invalidateResults({...project,revision:project.revision+1,connections:[...project.connections,connection]},toNode);
}

export function removeConnection(project,connectionId){
  if(!project.connections.some(connection=>connection.id===connectionId))return project;
  const edge=project.connections.find(connection=>connection.id===connectionId);
  return invalidateResults({...project,revision:project.revision+1,connections:project.connections.filter(connection=>connection.id!==connectionId)},edge.toNode);
}

export function updateViewport(project,viewport){
  const zoom=Math.min(2.2,Math.max(.3,Number(viewport.zoom)||1));
  return {...project,viewport:{x:Number(viewport.x)||0,y:Number(viewport.y)||0,zoom}};
}

export function parseStoredProject(text,registry){
  const project=JSON.parse(text);
  if(project?.formatVersion!==1||project?.kind!=='action-forge-workflow'||!Array.isArray(project.nodes)||!Array.isArray(project.connections))throw new Error('工作流草稿格式无效');
  // 显式合并旧测试草稿的两类视频节点；保留节点ID、位置、连线和备注。
  project.nodes=project.nodes.map(node=>['import-action-video','generate-action-video'].includes(node.type)?{...node,type:'action-video',definitionVersion:1}:node);
  if(registry){const definitions=registryMap(registry);for(const node of project.nodes){if(!node.name)node.name=uniqueName(definitions.get(node.type)?.title||node.type,project.nodes);}}
  return project;
}

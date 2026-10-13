export const NODE_AUTO_PRESET_KEY='action-forge.node-auto-preset.v2';
export const NODE_AUTO_FIELDS=Object.freeze({
  'extract-frames':['startSeconds','endSeconds','fps'],
  'organize-frames':['loop'],
  'process-frames':['startSeconds','endSeconds','fps','loop'],
  'remove-background':['cleanup','background','color','tolerance','smooth'],
});
export function nodeAutoPresetKey(projectId,nodeId){return `${NODE_AUTO_PRESET_KEY}:${projectId}:${nodeId}`;}
export function validateNodeAutoPreset(type,value){
  const fields=NODE_AUTO_FIELDS[type];if(!fields)throw new Error('此节点没有执行预设');
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!fields.includes(key))||fields.some(key=>!(key in value)))throw new Error('节点预设字段无效');
  const checked=validateAutoPreset({...DEFAULT_AUTO_PRESET,...value});return Object.fromEntries(fields.map(key=>[key,checked[key]]));
}
export function defaultNodeAutoPreset(node){
  const fields=NODE_AUTO_FIELDS[node.type];if(!fields)throw new Error('此节点没有执行预设');
  return validateNodeAutoPreset(node.type,Object.fromEntries(fields.map(key=>[key,['startSeconds','endSeconds','fps'].includes(key)?node.parameters?.[key]??DEFAULT_AUTO_PRESET[key]:DEFAULT_AUTO_PRESET[key]])));
}
export const DEFAULT_AUTO_PRESET=Object.freeze({startSeconds:0,endSeconds:null,fps:12,loop:'shortest',cleanup:true,background:'auto',color:'#00ff00',tolerance:80,smooth:true});
export function validateAutoPreset(value){
  if(!value||typeof value!=='object')throw new Error('自动执行预设无效');
  const {startSeconds,endSeconds,fps,loop,cleanup,background,color,tolerance,smooth}=value;
  if(!Number.isFinite(startSeconds)||startSeconds<0||endSeconds!==null&&(!Number.isFinite(endSeconds)||endSeconds<=startSeconds)||!Number.isInteger(fps)||fps<1||fps>60||!['shortest','best','all'].includes(loop)||typeof cleanup!=='boolean'||!['auto','color'].includes(background)||!/^#[0-9a-f]{6}$/i.test(color)||!Number.isInteger(tolerance)||tolerance<0||tolerance>255||typeof smooth!=='boolean')throw new Error('预设参数无效，请检查时间、采样率与容差');
  return {startSeconds,endSeconds,fps,loop,cleanup,background,color,tolerance,smooth};
}
export function chooseAutoLoop(candidates,strategy){
  if(!candidates.length)return null;
  return [...candidates].sort(strategy==='shortest'?(a,b)=>a.count-b.count||a.score-b.score||a.start-b.start:(a,b)=>a.score-b.score||a.count-b.count||a.start-b.start)[0];
}
const runnable=new Set(['extract-frames','organize-frames','process-frames','remove-background']);
// 从点击节点追溯必要输入，再继续当前分支中已接通的帧处理节点。
export function autoPlan(project,startId){
  const nodes=new Map(project.nodes.map(node=>[node.id,node])),order=[],seen=new Set(),visiting=new Set(),boundary=new Set();
  function visit(id){
    if(seen.has(id))return;if(visiting.has(id))throw new Error('自动执行路径存在依赖环');
    const node=nodes.get(id);if(!node)throw new Error('节点不存在');
    if(!runnable.has(node.type)&&node.type!=='action-video'){boundary.add(id);return;}
    visiting.add(id);
    if(runnable.has(node.type)){
      const port=node.type==='process-frames'?'source':node.type==='extract-frames'?'video':'frames';
      const edges=project.connections.filter(edge=>edge.toNode===id&&edge.toPort===port);
      if(edges.length!==1)throw new Error(`${node.name||id}缺少唯一来源连接`);
      const upstream=nodes.get(edges[0].fromNode);
      if(runnable.has(upstream?.type)||upstream?.type==='action-video')visit(upstream.id);
      else if(!project.results.find(result=>result.nodeId===upstream?.id)?.confirmed)throw new Error('必要上游尚未接通或未确认输出');
    }
    visiting.delete(id);seen.add(id);order.push(node);
  }
  const start=nodes.get(startId);if(!start||!runnable.has(start.type)&&start.type!=='action-video')throw new Error('此节点尚不支持自动执行');
  visit(startId);
  function downstream(id,path=new Set()){
    if(path.has(id))throw new Error('自动执行路径存在依赖环');
    const nextPath=new Set([...path,id]);
    for(const edge of project.connections.filter(edge=>edge.fromNode===id)){
      const node=nodes.get(edge.toNode);if(!node)throw new Error('下游节点不存在');
      if(runnable.has(node.type)){visit(node.id);downstream(node.id,nextPath);}else boundary.add(node.id);
    }
  }
  downstream(startId);if(!order.some(node=>runnable.has(node.type)))throw new Error('请先连接序列帧处理或移除背景节点');return {nodes:order,boundary:[...boundary]};
}

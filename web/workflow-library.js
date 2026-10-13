import {createWorkflowProject} from './workflow-core.js';

const KEY='action-forge.workflow-library.v1';
const LEGACY='action-forge.workflow.r6b.v1';
const id=()=>crypto.randomUUID();
const nameOf=value=>{const name=value.trim();if(!name||name.length>80)throw new Error('名称需要1至80个字符');return name;};

// 目录只管理归属；每张画布仍由原工作流核心读写，不复制业务模型。
export function openWorkflowLibrary(storage=localStorage){
  let raw=storage.getItem(KEY),state;
  if(raw){
    state=JSON.parse(raw);
    if(state.version!==1||!Array.isArray(state.projects)||!state.projects.length)throw new Error('工程目录损坏，未覆盖原数据');
    const ids=new Set(),keys=new Set();
    for(const project of state.projects){
      nameOf(project.name);
      if(typeof project.id!=='string'||ids.has(project.id)||!Array.isArray(project.flows)||!project.flows.length)throw new Error('工程目录结构无效');
      ids.add(project.id);
      for(const flow of project.flows){nameOf(flow.name);if(typeof flow.id!=='string'||ids.has(flow.id)||typeof flow.key!=='string'||!flow.key.startsWith('action-forge.workflow.')||keys.has(flow.key))throw new Error('工作流目录结构无效');ids.add(flow.id);keys.add(flow.key);}
    }
    if(!state.projects.some(project=>project.id===state.project&&project.flows.some(flow=>flow.id===state.flow)))throw new Error('当前工作流引用无效');
  }else{
    const projectId=id(),flowId=id();let name='未命名工作流';
    const old=storage.getItem(LEGACY);if(old){try{name=nameOf(JSON.parse(old).name);}catch{/* 旧画布由原解析器检查，目录不删除原数据。 */}}
    state={version:1,project:projectId,flow:flowId,projects:[{id:projectId,name:'未命名工程',flows:[{id:flowId,name,key:LEGACY}]}]};
    storage.setItem(KEY,JSON.stringify(state));raw=storage.getItem(KEY);
  }
  function write(next){
    if(storage.getItem(KEY)!==raw)throw new Error('工程目录已在其他页面修改，请刷新后重试');
    const text=JSON.stringify(next);storage.setItem(KEY,text);state=next;raw=text;
  }
  function change(callback){const next=structuredClone(state);callback(next);write(next);}
  function fresh(name){const flow={id:id(),name:nameOf(name)};flow.key=`action-forge.workflow.flow.${flow.id}`;storage.setItem(flow.key,JSON.stringify(createWorkflowProject({id:flow.id,name:flow.name})));return flow;}
  const current=()=>state.projects.find(project=>project.id===state.project);
  const active=()=>current().flows.find(flow=>flow.id===state.flow);
  return {
    get state(){return structuredClone(state);},current,active,
    assertUnchanged(){if(storage.getItem(KEY)!==raw)throw new Error('工程目录已在其他页面修改，请刷新后重试');},
    select(projectId,flowId){change(next=>{const project=next.projects.find(item=>item.id===projectId);if(!project?.flows.some(flow=>flow.id===flowId))throw new Error('工作流不存在');next.project=projectId;next.flow=flowId;});},
    createProject(name){const project={id:id(),name:nameOf(name),flows:[fresh('未命名工作流')]};change(next=>{next.projects.push(project);next.project=project.id;next.flow=project.flows[0].id;});},
    createFlow(name){const flow=fresh(name);change(next=>{next.projects.find(item=>item.id===next.project).flows.push(flow);next.flow=flow.id;});},
    renameProject(name,projectId=state.project){change(next=>{const project=next.projects.find(item=>item.id===projectId);if(!project)throw new Error('工程不存在');project.name=nameOf(name);});},
    syncName(name){if(active().name===name)return;change(next=>{next.projects.find(item=>item.id===next.project).flows.find(flow=>flow.id===next.flow).name=nameOf(name);});},
    renameFlow(flowId,name){change(next=>{const flow=next.projects.find(item=>item.id===next.project).flows.find(flow=>flow.id===flowId);if(!flow)throw new Error('工作流不存在');flow.name=nameOf(name);});},
    copyFlow(flowId){const source=current().flows.find(flow=>flow.id===flowId);if(!source)throw new Error('工作流不存在');const flow=fresh(`${source.name.slice(0,74)} 副本`),graph=JSON.parse(storage.getItem(source.key));if(!graph)throw new Error('工作流尚未保存');graph.id=flow.id;graph.name=flow.name;storage.setItem(flow.key,JSON.stringify(graph));change(next=>next.projects.find(item=>item.id===next.project).flows.push(flow));},
    deleteFlow(flowId){const source=current().flows.find(flow=>flow.id===flowId);if(!source)throw new Error('工作流不存在');change(next=>{const project=next.projects.find(item=>item.id===next.project);project.flows=project.flows.filter(flow=>flow.id!==flowId);if(!project.flows.length)project.flows.push(fresh('未命名工作流'));if(next.flow===flowId)next.flow=project.flows[0].id;});storage.removeItem(source.key);},
    deleteProject(projectId=state.project){const source=state.projects.find(project=>project.id===projectId);if(!source)throw new Error('工程不存在');change(next=>{next.projects=next.projects.filter(project=>project.id!==source.id);if(!next.projects.length)next.projects.push({id:id(),name:'未命名工程',flows:[fresh('未命名工作流')]});if(next.project===source.id){next.project=next.projects[0].id;next.flow=next.projects[0].flows[0].id;}});for(const flow of source.flows)storage.removeItem(flow.key);},
  };
}

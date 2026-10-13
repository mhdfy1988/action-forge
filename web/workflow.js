import {icons} from './icons-data.js';
import {addNode,attachActionVideo,sourceAsset,attachReferenceImage,referenceImageAsset,canConnect,connectNodes,createWorkflowProject,duplicateNode as duplicateProjectNode,parseStoredProject,removeConnection,removeNode,updateNode,updateViewport,invalidateResults} from './workflow-core.js';
import {getImage,putImage,prepareImage,prepareVideo} from './workflow-image-store.js';
import {openWorkflowLibrary} from './workflow-library.js';
import {bindWorkflowNavigation} from './workflow-navigation.js';
import {attachFrameSet,createExtractionTask,extractionFingerprint,extractionInput,extractionParameters,hashBytes} from './workflow-extraction.js';
import {createExtractWorkbench,framePlayer} from './workflow-extract-workbench.js';
import {organizerInput,organizedRecord,attachOrganized,organizerOutputIds,organizerOutputSignature,createOrganizerEditor} from './workflow-organizer.js';
import {createOrganizeWorkbench} from './workflow-organize-workbench.js';
import {createSequenceWorkbench} from './workflow-sequence-workbench.js';
import {createMattingWorkbench} from './workflow-matting-workbench.js';
import {mattingInput,attachTransparent,createMattingTask,sealTransparent,mattingApi} from './workflow-matting.js';
import {autoPlan} from './workflow-auto-core.js';
import {createAutoControls,selectAutomaticLoop,workerTask} from './workflow-auto.js';

let library=null,navigation=null,STORAGE_KEY=null,savedGraph=null;
const modeLabels={source:'素材输入',automatic:'本地自动',interactive:'人工编辑',external:'外部处理'};
// 仅描述工具栏的视觉分组；节点协议和能力仍由生成目录提供。
const toolbarGroups=[{name:'素材输入',types:['reference-image','action-video']},{name:'帧处理',types:['process-frames','remove-background']},{name:'动作资产',types:['build-action-clip','assemble-character','game-preview','export-game-assets']}];
const nodeIcons={'reference-image':'image','action-video':'film','extract-frames':'layout-grid','organize-frames':'repeat-2','remove-background':'eraser','build-action-clip':'play','assemble-character':'layers','game-preview':'gamepad-2','export-game-assets':'download'};
nodeIcons['process-frames']='layout-grid';
const parameterLabels={label:'名称',prompt:'动作描述',direction:'方向',durationSeconds:'时长（秒）',providerNote:'外部工具备注',startSeconds:'开始（秒）',endSeconds:'结束（秒）',fps:'帧率',previewFps:'预览帧率',loopStart:'循环开始帧',loopEndExclusive:'循环结束帧',pipeline:'处理管线',despillStrength:'去绿强度',name:'动作名称',loop:'循环播放',characterName:'角色名称',defaultAction:'默认动作',target:'预览目标',format:'输出格式',frameWidth:'帧宽',frameHeight:'帧高'};
// 只定义展示取舍，不复制节点参数协议；复杂编辑器参数不在侧栏重复编辑。
const inspectorFields={
  'reference-image':[],'action-video':[],
  'extract-frames':[],'organize-frames':[],'process-frames':[],
  'remove-background':[],'build-action-clip':['name','loop','fps'],
  'assemble-character':['characterName'],'game-preview':['target'],
  'export-game-assets':['format','frameWidth','frameHeight'],
};
const assetLabels={'reference-image':'参考图','action-video':'动作视频','frame-set/source':'原始序列帧','frame-set/transparent':'透明序列帧','action-clip':'动作片段','character-asset':'角色资产','engine-package':'资产包'};

const get=id=>document.getElementById(id);
const elements={viewport:get('canvasViewport'),grid:get('canvasGrid'),world:get('canvasWorld'),nodes:get('nodeLayer'),connections:get('connectionLayer'),draft:get('draftConnection'),empty:get('emptyState'),inspectorEmpty:get('inspectorEmpty'),nodeInspector:get('nodeInspector'),connectionInspector:get('connectionInspector'),toolbar:get('nodeToolbar'),toast:get('toast'),saveState:get('saveState')};
let registry=null;
let definitions=new Map();
let project=createWorkflowProject();
let selectedNodeId=null;
let selectedConnectionId=null;
let connectionDrag=null;
let saveTimer=null;
let toastTimer=null;
let contextTarget=null;
const imageCache=new Map(),importing=new Map();
const importErrors=new Map();
let adoptTarget=null;
let canvasGeneration=0;
const extractionTasks=new Map(),extractionProgress=new Map();let workbench=null;let previewDisposers=[];
let organizeWorkbench=null;
let sequenceWorkbench=null;const sequenceSources=new Map();
let mattingWorkbench=null;const mattingDrafts=new Map();
let autoControls=null;
const mattingDraftKey=id=>`matting-draft:${project.id}:${id}`;
const sequenceSourceKey=id=>`sequence-source:${project.id}:${id}`;
function processSource(id){const saved=sequenceSources.get(id);if(!saved)return null;try{return extractionFingerprint(project,id)===saved.fingerprint?saved.record:null;}catch{return null;}}
function checkAutomatic(id){
  if(importing.size||extractionTasks.size||organizeWorkbench?.busy||sequenceWorkbench?.busy||mattingWorkbench?.busy)throw new Error('请先结束当前任务或关闭工作台');
  const plan=autoPlan(project,id);
  for(const node of plan.nodes){
    if(node.type==='action-video'){
      const asset=sourceAsset(project,node.id),video=asset&&imageCache.get(asset.id);
      if(!video?.blob)throw new Error('请先上传动作视频');
      if(nodeStatus(node).key!=='ready')throw new Error('动作视频尚未就绪，请确认输入');
    }
    const port=node.type==='process-frames'?'source':node.type==='extract-frames'?'video':'frames';
    const edge=project.connections.find(edge=>edge.toNode===node.id&&edge.toPort===port);
    if(edge&&!plan.nodes.some(item=>item.id===edge.fromNode)){
      const asset=sourceAsset(project,edge.fromNode,'frames'),record=asset&&imageCache.get(asset.id);
      if(!record?.frames?.length)throw new Error('本机上游帧集缺失，请重新导入');
    }
  }
  return {...plan,overwrite:plan.nodes.some(node=>project.results.some(result=>result.nodeId===node.id&&node.type!=='action-video')||mattingDrafts.has(node.id)||sequenceSources.has(node.id))};
}
async function executeAutomatic(id,presets,signal,status){
  const plan=checkAutomatic(id),generation=canvasGeneration;
  const ensure=()=>{if(signal.aborted)throw new Error('自动执行已取消');if(generation!==canvasGeneration)throw new Error('画布已变化，自动执行停止');};
  // 运行时锁定画布和目录切换，帧处理核心仍保留各自的输入签名保护。
  elements.toolbar.inert=true;
  try{
    for(const node of plan.nodes){
      ensure();if(node.type==='action-video')continue;
      const preset=presets.get(node.id);
      status(`${node.name||node.id} · 准备执行`,node.id);
      const edge=project.connections.find(edge=>edge.toNode===node.id&&edge.toPort===(node.type==='process-frames'?'source':'video'));
      const video=edge&&sourceAsset(project,edge.fromNode);
      if(node.type==='extract-frames'||node.type==='process-frames'&&video?.type==='action-video'){
        changeExtractParameters(node.id,{startSeconds:preset.startSeconds,endSeconds:preset.endSeconds,fps:preset.fps});
        const cancel=()=>cancelExtraction(node.id);signal.addEventListener('abort',cancel,{once:true});
        try{await runExtraction(node.id);}finally{signal.removeEventListener('abort',cancel);}
        ensure();if(importErrors.has(node.id))throw new Error(importErrors.get(node.id));
      }
      if(['process-frames','organize-frames'].includes(node.type)){
        const value=organizeContext(node.id);if(value.error)throw new Error(value.error);
        const old=await getImage(await draftKey(node.id,value.fingerprint)),editor=createOrganizerEditor(value.input,old);
        const draft=await selectAutomaticLoop(value.input,editor,preset,signal,message=>status(`${node.name} · ${message}`));ensure();
        await saveOrganizeDraft(node.id,value.fingerprint,draft,true);ensure();await publishOrganize(node.id,value.fingerprint,value.input,editor);
      }
      if(node.type==='remove-background'){
        const value=mattingContext(node.id);if(value.error)throw new Error(value.error);
        const cached=mattingDrafts.get(node.id),previous=cached?.fingerprint===value.fingerprint?cached.record:null,task=createMattingTask();
        const cancel=()=>task.cancel().catch(error=>notify(error.message));signal.addEventListener('abort',cancel,{once:true});
        let record;
        try{record=await task.execute(value.input,previous,progress=>status(`${node.name} · ${progress.stage}`));}
        finally{signal.removeEventListener('abort',cancel);}ensure();
        // 自动清理只改变当前像素；原始与模型基底保持独立，便于后续人工恢复。
        if(preset.cleanup){
          const frames=[...record.frames];
          try{
          for(const [index,frame] of record.frames.entries()){
            ensure();status(`${node.name} · 背景清理 ${index+1}/${record.frames.length}`);
            const result=await workerTask('./workflow-auto-cleanup-worker.js',{sourceBlob:frame.sourceBlob,blob:frame.blob,preset},signal);
            ensure();const saved=await (await mattingApi(`/${record.batchId}/frames/${frame.id}?revision=${frame.revision}`,{method:'PUT',headers:{'content-type':'image/png'},body:result.blob})).json();
            frames[index]={...frame,blob:result.blob,revision:saved.revision};
          }
          }finally{
            // 即使中途取消或失败，也保存已写入服务端的像素和修订；不自动发布。
            record=await sealTransparent({...record,frames});
            await saveMattingDraft(node.id,value.fingerprint,record);
          }
        }
        ensure();await saveMattingDraft(node.id,value.fingerprint,record);ensure();await publishMatting(node.id,value.fingerprint,record);
      }
    }
    return plan.boundary.length?'帧处理已完成；后续未接通节点未执行':'自动执行完成';
  }finally{elements.toolbar.inert=false;renderAll();}
}
function currentOrganizerInput(id){return organizerInput(project,id,processSource(id));}
const contextMenu=get('canvasContextMenu');

function decorateIcons(){
  document.querySelectorAll('[data-icon]').forEach(element=>{const icon=icons[element.dataset.icon];if(!icon)return;const label=element.textContent;element.innerHTML=icon;if(label){const span=document.createElement('span');span.textContent=label;element.append(span);}});
}

function notify(message){
  elements.toast.textContent=message;elements.toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>elements.toast.classList.remove('is-visible'),1800);
}

function scheduleSave(){
  elements.saveState.textContent='正在保存本机草稿…';elements.saveState.classList.add('is-saving');clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{try{persistProject(project);}catch(error){notify(error.message);}},120);
}

function persistProject(next){
  clearTimeout(saveTimer);saveTimer=null;
  try{library.assertUnchanged();if(localStorage.getItem(STORAGE_KEY)!==savedGraph)throw new Error('工作流已在其他页面修改，请刷新后重试');const text=JSON.stringify(next);localStorage.setItem(STORAGE_KEY,text);savedGraph=text;library.syncName(next.name);navigation?.render();}
  catch(error){elements.saveState.textContent='草稿保存失败';elements.saveState.classList.remove('is-saving');throw new Error(`草稿保存失败：${error.message}`);}
  elements.saveState.textContent='本机草稿已保存';elements.saveState.classList.remove('is-saving');
}

async function loadReferenceImages(){
  const used=new Set(project.results.flatMap(result=>result.outputs.map(output=>output.asset.id)));
  await Promise.all(project.assets.filter(asset=>['reference-image','action-video','frame-set/source','frame-set/transparent'].includes(asset.type)&&used.has(asset.id)&&!imageCache.has(asset.id)).map(async asset=>{
    try{const record=await getImage(asset.id);if(!record)throw new Error(asset.type==='frame-set/source'?'本机帧集缺失，请重新提取':asset.type==='action-video'?'本机视频缺失，请重新导入':'本机图片缺失，请重新导入');imageCache.set(asset.id,{...record,url:URL.createObjectURL(record.blob||record.frames[0].blob)});}
    catch(error){imageCache.set(asset.id,{error:error.message});}
  }));
  sequenceSources.clear();
  for(const node of project.nodes.filter(node=>node.type==='process-frames')){
    const reference=await getImage(sequenceSourceKey(node.id));if(!reference?.assetId)continue;
    const record=await getImage(reference.assetId);if(record?.frames)sequenceSources.set(node.id,{record,fingerprint:reference.fingerprint});
  }
  mattingDrafts.clear();
  for(const node of project.nodes.filter(node=>node.type==='remove-background')){const draft=await getImage(mattingDraftKey(node.id));if(draft?.record?.frames)mattingDrafts.set(node.id,draft);}
}

async function importReferenceImage(nodeId,file){
  if(autoControls?.busy){notify('自动执行中，暂不能更换输入素材');return;}
  if(!file)return;
  const isVideo=project.nodes.find(node=>node.id===nodeId)?.type==='action-video';
  const token=Symbol(),generation=canvasGeneration,before=sourceContext(nodeId);importErrors.delete(nodeId);importing.set(nodeId,token);renderAll();
  try{
    const record=await (isVideo?prepareVideo(file):prepareImage(file));await putImage(record);
    if(importing.get(nodeId)!==token||generation!==canvasGeneration||!project.nodes.some(node=>node.id===nodeId))return;
    const next=(isVideo?attachActionVideo:attachReferenceImage)(project,nodeId,record);
    if(isVideo&&(before!==sourceContext(nodeId)||!referenceAvailable(nodeId)))next.results.find(result=>result.nodeId===nodeId).confirmed=false;
    // 清单落盘成功才切换当前图；任何失败都保留旧引用与预览。
    clearTimeout(saveTimer);persistProject(next);
    imageCache.set(record.id,{...record,url:URL.createObjectURL(record.blob)});project=next;
    notify(isVideo?'动作视频已导入':'参考图已导入');
  }catch(error){if(importing.get(nodeId)===token){importErrors.set(nodeId,error.message);notify(error.message);}}
  finally{if(importing.get(nodeId)===token)importing.delete(nodeId);renderAll();}
}

function sourceContext(nodeId){const node=project.nodes.find(item=>item.id===nodeId);return JSON.stringify([node?.parameters,project.connections.filter(edge=>edge.toNode===nodeId).map(edge=>[edge.fromNode,project.results.find(result=>result.nodeId===edge.fromNode)])]);}
function referenceAvailable(nodeId){const edge=project.connections.find(item=>item.toNode===nodeId&&item.toPort==='reference');if(!edge)return true;const asset=referenceImageAsset(project,edge.fromNode);return Boolean(project.results.find(result=>result.nodeId===edge.fromNode)?.confirmed&&asset&&imageCache.get(asset.id)?.url);}

function nodeStatus(node){
  if(autoControls?.busy&&autoControls.activeNodeId===node.id)return {key:'running',label:autoControls.status||'自动执行中'};
  const asset=node.type==='reference-image'?referenceImageAsset(project,node.id):node.type==='action-video'?sourceAsset(project,node.id):['extract-frames','organize-frames','process-frames','remove-background'].includes(node.type)?sourceAsset(project,node.id,'frames'):null;
  const record=asset&&imageCache.get(asset.id),result=project.results.find(item=>item.nodeId===node.id);
  if(extractionTasks.has(node.id)){const progress=extractionProgress.get(node.id);return {key:'running',label:progress?`${progress.stage}${progress.progress===null?'':` · ${progress.progress}%`}`:'准备抽帧'};}
  if(importing.has(node.id))return {key:'running',label:'正在导入…'};
  if(importErrors.has(node.id)||record?.error)return {key:'failed',label:importErrors.get(node.id)||record.error};
  if(result&&!result.confirmed)return {key:'stale',label:'待更新'};
  if(node.type==='action-video'){
    const upstream=project.connections.find(edge=>edge.toNode===node.id&&edge.toPort==='reference');
    if(upstream){const sourceResult=project.results.find(item=>item.nodeId===upstream.fromNode),source=referenceImageAsset(project,upstream.fromNode);if(!sourceResult?.confirmed||!source||!imageCache.get(source.id)?.url)return {key:result?'stale':'idle',label:'参考图不可用'};}
  }
  if(result?.confirmed&&record?.url)return {key:'ready',label:'已就绪'};
  if(node.type==='extract-frames'){try{extractionInput(project,node.id);return {key:'idle',label:'等待提取'};}catch{return {key:'idle',label:'等待视频'};}}
  if(node.type==='organize-frames'){try{organizerInput(project,node.id);return {key:'idle',label:'等待整理确认'};}catch{return {key:'idle',label:'等待序列帧'};}}
  if(node.type==='process-frames'){return {key:'idle',label:processSource(node.id)?'等待确认输出':'等待序列帧处理'};}
  if(node.type==='remove-background'){try{const value=mattingInput(project,node.id);return {key:'idle',label:mattingDrafts.get(node.id)?.fingerprint===value.fingerprint?'等待确认输出':'等待去除背景'};}catch{return {key:'idle',label:'等待序列帧'};}}
  return {key:'idle',label:['reference-image','action-video'].includes(node.type)?'等待导入':'尚未接通'};
}

function extractContext(nodeId){const node=project.nodes.find(node=>node.id===nodeId);if(!node)return null;let video=null,videoReady=false;try{const input=extractionInput(project,nodeId);video=imageCache.get(input.asset.id);videoReady=Boolean(video?.blob);}catch{const edge=project.connections.find(edge=>edge.toNode===nodeId&&edge.toPort===(node.type==='process-frames'?'source':'video')),asset=edge&&sourceAsset(project,edge.fromNode);video=asset?.type==='action-video'&&imageCache.get(asset.id);}
  const asset=sourceAsset(project,nodeId,'frames'),record=asset&&imageCache.get(asset.id);return {node,video,videoReady,frames:record?.frames?record:null,hasExtractedFrames:sequenceSources.has(nodeId),status:nodeStatus(node),error:importErrors.get(nodeId)||record?.error||(!videoReady?'请连接已就绪的动作视频':'')};}
function changeExtractParameters(nodeId,parameters){const node=project.nodes.find(node=>node.id===nodeId);if(node&&!extractionTasks.has(nodeId))commit(updateNode(project,nodeId,{parameters:{...node.parameters,...parameters}}));}
async function cancelExtraction(nodeId){try{await extractionTasks.get(nodeId)?.cancel();}catch(error){notify(error.message);}}
async function runExtraction(nodeId){
  if(extractionTasks.size){notify('请先完成或取消当前抽帧任务');return;}
  let task=null;
  try{
    const input=extractionInput(project,nodeId),video=imageCache.get(input.asset.id);if(!video?.blob)throw new Error('本机视频缺失，请重新导入');
    const parameters=extractionParameters(input.node,video.duration);project=updateNode(project,nodeId,{parameters});clearTimeout(saveTimer);persistProject(project);
    const fingerprint=extractionFingerprint(project,nodeId),generation=canvasGeneration;
    task=createExtractionTask();extractionTasks.set(nodeId,task);importErrors.delete(nodeId);renderAll();
    const signature=await hashBytes(fingerprint),existing=project.results.find(result=>result.nodeId===nodeId),old=extractContext(nodeId).frames;
    if(task.cancelled)throw new Error('已取消');
    if(input.node.type==='process-frames'&&processSource(nodeId)){notify('输入未变化，复用已抽取帧集');return;}
    if(existing?.confirmed&&existing.resultSignature===signature&&old){notify('输入未变化，复用已有帧集');workbench?.refresh();return;}
    const record=await task.execute(video,parameters,progress=>{extractionProgress.set(nodeId,progress);updateStatusMarks();workbench?.refresh();sequenceWorkbench?.refresh();if(selectedNodeId===nodeId){get('inspectStatus').textContent=nodeStatus(project.nodes.find(node=>node.id===nodeId)||input.node).label;}});
    // 运行期间换源、改参数、删节点或清画布：迟到结果不得绑定新上下文。
    if(task.cancelled||generation!==canvasGeneration||extractionTasks.get(nodeId)!==task||extractionFingerprint(project,nodeId)!==fingerprint)throw new Error('输入已变化，本次结果未采用，请重新提取');
    await putImage(record);
    if(task.cancelled||generation!==canvasGeneration||extractionTasks.get(nodeId)!==task||extractionFingerprint(project,nodeId)!==fingerprint)throw new Error('输入已变化，本次结果未采用，请重新提取');
    if(input.node.type==='process-frames'){
      const referenceKey=sequenceSourceKey(nodeId),previousReference=await getImage(referenceKey);
      await putImage({id:referenceKey,kind:'sequence-source',assetId:record.id,fingerprint});
      try{
        if(task.cancelled||generation!==canvasGeneration||extractionTasks.get(nodeId)!==task||extractionFingerprint(project,nodeId)!==fingerprint)throw new Error('输入已变化，本次结果未采用');
        const next=invalidateResults(project,nodeId);next.revision++;persistProject(next);project=next;sequenceSources.set(nodeId,{record,fingerprint});
      }catch(error){
        // 引用写入期间取消或清单保存失败，恢复旧引用，刷新后也不得采用迟到结果。
        await putImage(previousReference||{id:referenceKey,kind:'sequence-source',assetId:null,fingerprint:''});throw error;
      }
    }else{const next=attachFrameSet(project,nodeId,record,signature);persistProject(next);project=next;imageCache.set(record.id,{...record,url:URL.createObjectURL(record.frames[0].blob)});}
    notify(`已提取 ${record.frames.length} 帧`);
  }catch(error){if(!task||extractionTasks.get(nodeId)===task){importErrors.set(nodeId,task?.cancelled?'已取消，未采用新结果':error.message);notify(importErrors.get(nodeId));}}
  finally{if(task&&extractionTasks.get(nodeId)===task){extractionTasks.delete(nodeId);extractionProgress.delete(nodeId);}renderAll();workbench?.refresh();}
}

function updateStatusMarks(){
  elements.nodes.querySelectorAll('.workflow-node').forEach(article=>{const node=project.nodes.find(item=>item.id===article.dataset.nodeId);if(!node)return;const state=nodeStatus(node),dot=article.querySelector('.mode-mark');dot.dataset.status=state.key;dot.title=state.label;dot.setAttribute('aria-label',state.label);});
}

function videoControl(node,{compact=false}={}){
  const asset=sourceAsset(project,node.id),record=asset&&imageCache.get(asset.id),busy=importing.has(node.id);
  const card=document.createElement('div');card.className=`reference-image-control${compact?' is-compact':''}`;
  const input=document.createElement('input');input.type='file';input.accept='.mp4,.webm,.mov';input.hidden=true;
  input.addEventListener('change',()=>importReferenceImage(node.id,input.files[0]));card.append(input);
  if(record?.url){
    const video=document.createElement('video');video.src=record.url;video.controls=true;video.preload='metadata';video.className='source-video-preview';video.setAttribute('aria-label','动作视频预览');card.append(video);
    const info=document.createElement('div');info.className='reference-file-info';const name=document.createElement('div'),meta=document.createElement('div');name.className='reference-card-name';meta.className='reference-card-dimensions';name.textContent=record.name;meta.textContent=`${record.width} × ${record.height} 像素 · ${record.duration.toFixed(2)} 秒`;info.append(name,meta);card.append(info);
  }
  const button=document.createElement('button');button.type='button';button.className=record?.url?'quiet-button':'reference-drop';button.textContent=busy?'正在导入…':asset?'更换视频':'选择或拖入视频';button.setAttribute('aria-label',asset?'更换动作视频':'导入动作视频');button.disabled=busy;button.addEventListener('click',()=>input.click());card.append(button);
  card.addEventListener('pointerdown',event=>{if(compact){event.stopPropagation();if(selectedNodeId!==node.id)selectNode(node.id);}});
  card.addEventListener('dragover',event=>{event.preventDefault();event.stopPropagation();});
  card.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();if(event.dataTransfer.files.length!==1){notify('请一次导入一个视频');return;}importReferenceImage(node.id,event.dataTransfer.files[0]);});
  if(compact&&record?.url&&nodeStatus(node).key==='stale'){
    const adopt=document.createElement('button');adopt.type='button';adopt.className='quiet-button';adopt.textContent='采用当前视频';adopt.disabled=!referenceAvailable(node.id)||busy;
    adopt.addEventListener('click',()=>{adoptTarget={nodeId:node.id,context:sourceContext(node.id),assetId:asset.id};get('adoptVideoDialog').returnValue='';get('adoptVideoDialog').showModal();});card.append(adopt);
  }
  return card;
}

function imageControl(node,{compact=false}={}){
  const container=document.createElement('div');container.className='reference-image-control';
  const asset=referenceImageAsset(project,node.id),record=asset&&imageCache.get(asset.id),busy=importing.has(node.id);
  const button=document.createElement('button');button.type='button';button.className='reference-drop';button.disabled=busy;
  button.setAttribute('aria-label',asset?'更换角色参考图':'导入角色参考图');
  if(compact){button.textContent=busy?'正在导入…':asset?'更换图片':'选择图片';button.className='quiet-button';}
  else if(record?.url){const image=document.createElement('img');image.src=record.url;image.alt=record.name;image.draggable=false;button.append(image);}
  else{const placeholder=document.createElement('span');placeholder.innerHTML=icons.image;const text=document.createElement('span');text.textContent=busy?'正在导入…':record?.error||'选择或拖入参考图';placeholder.append(text);button.append(placeholder);}
  const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.hidden=true;
  button.addEventListener('click',()=>input.click());input.addEventListener('change',()=>importReferenceImage(node.id,input.files[0]));
  const info=document.createElement('div');info.className='reference-file-info';
  info.textContent=busy?'正在导入…':record?.url?`${record.name} · ${record.width} × ${record.height}`:'PNG / JPG / WebP · 最大 20 MB';info.title=info.textContent;
  container.append(button,input,info);
  if(compact){
    container.classList.add('is-compact');container.prepend(info);
    if(record?.url){
      const view=document.createElement('button');view.type='button';view.className='reference-card-preview';view.setAttribute('aria-label','查看原图');view.title='点击查看原图';
      const image=document.createElement('img');image.src=record.url;image.alt=record.name;image.draggable=false;view.append(image);
      view.addEventListener('click',()=>{get('imageViewerImage').src=record.url;get('imageViewer').showModal();});container.prepend(view);
      const filename=document.createElement('div'),dimensions=document.createElement('div');filename.className='reference-card-name';dimensions.className='reference-card-dimensions';
      filename.textContent=record.name;dimensions.textContent=`${record.width} × ${record.height} 像素`;info.replaceChildren(filename,dimensions);
    }
    if(record?.error){const error=document.createElement('p');error.className='inspector-notice';error.textContent=record.error;container.append(error);}
  }
  container.addEventListener('pointerdown',event=>{if(compact){event.stopPropagation();if(selectedNodeId!==node.id)selectNode(node.id);}});
  container.addEventListener('dragover',event=>{event.preventDefault();event.stopPropagation();button.classList.add('is-drop-target');});
  container.addEventListener('dragleave',()=>button.classList.remove('is-drop-target'));
  container.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();button.classList.remove('is-drop-target');if(event.dataTransfer.files.length!==1){notify('请一次导入一张参考图');return;}importReferenceImage(node.id,event.dataTransfer.files[0]);});
  return container;
}

function commit(next,{render=true}={}){project=next;scheduleSave();if(render)renderAll();}

function organizeContext(nodeId){
  const node=project.nodes.find(item=>item.id===nodeId),output=sourceAsset(project,nodeId,'frames');
  try{const value=currentOrganizerInput(nodeId),input=processSource(nodeId)||imageCache.get(value.asset.id);if(!input?.frames)throw new Error(input?.error||'本机上游帧集缺失');return {...value,input,output:imageCache.get(output?.id),confirmed:!!project.results.find(item=>item.nodeId===nodeId)?.confirmed};}
  catch(error){return {node,error:error.message,output:imageCache.get(output?.id)};}
}
async function draftKey(nodeId,fingerprint){return `organizer-draft:${project.id}:${nodeId}:${await hashBytes(fingerprint)}`;}
async function saveOrganizeDraft(nodeId,fingerprint,draft,changed){
  if(currentOrganizerInput(nodeId).fingerprint!==fingerprint)throw new Error('上游已变化，未保存到新输入');
  // 先使旧输出失效；即使草稿保存失败，也不能让下游把旧结果误当新结果。
  if(changed){const next=invalidateResults(project,nodeId);next.revision++;persistProject(next);project=next;renderAll();}
  const id=await draftKey(nodeId,fingerprint);await putImage({id,kind:'organizer-draft',...draft});
  if(currentOrganizerInput(nodeId).fingerprint!==fingerprint)throw new Error('上游已变化，请重新打开');
}
async function publishOrganize(nodeId,fingerprint,input,editor){
  const generation=canvasGeneration,order=organizerOutputSignature(editor);
  const record=await organizedRecord(input,editor),signature=await hashBytes(JSON.stringify({fingerprint,order:organizerOutputIds(editor)}));
  if(project.results.find(item=>item.nodeId===nodeId)?.confirmed&&project.results.find(item=>item.nodeId===nodeId)?.resultSignature===signature&&organizeContext(nodeId).output?.frames)return;
  const valid=()=>generation===canvasGeneration&&currentOrganizerInput(nodeId).fingerprint===fingerprint&&organizerOutputSignature(editor)===order;
  if(!valid())throw new Error('输入已变化，未采用整理结果');await putImage(record);
  if(!valid())throw new Error('输入已变化，未采用整理结果');
  const next=attachOrganized(project,nodeId,record,signature,processSource(nodeId));persistProject(next);project=next;imageCache.set(record.id,{...record,url:URL.createObjectURL(record.frames[0].blob)});renderAll();
}

function mattingContext(nodeId){
  const node=project.nodes.find(item=>item.id===nodeId),output=imageCache.get(sourceAsset(project,nodeId,'frames')?.id);
  try{const value=mattingInput(project,nodeId),input=imageCache.get(value.asset.id);if(!input?.frames)throw new Error(input?.error||'本机上游帧集缺失');return {...value,input,output,confirmed:!!project.results.find(item=>item.nodeId===nodeId)?.confirmed};}catch(error){return {node,output,error:error.message};}
}
async function saveMattingDraft(nodeId,fingerprint,record){
  const generation=canvasGeneration,key=mattingDraftKey(nodeId),valid=()=>generation===canvasGeneration&&mattingInput(project,nodeId).fingerprint===fingerprint;
  if(!valid())throw new Error('上游已变化，未保存到新输入');
  const next=invalidateResults(project,nodeId);next.revision++;persistProject(next);project=next;
  const draft={id:key,kind:'matting-draft',fingerprint,record};await putImage(draft);
  if(!valid())throw new Error('上游已变化，请重新打开');mattingDrafts.set(nodeId,draft);renderAll();
}
async function publishMatting(nodeId,fingerprint,record){
  const generation=canvasGeneration,valid=()=>generation===canvasGeneration&&mattingInput(project,nodeId).fingerprint===fingerprint&&mattingDrafts.get(nodeId)?.record.id===record.id;
  if(!valid())throw new Error('透明结果与当前输入不一致，请重新处理');
  const signature=await hashBytes(JSON.stringify({fingerprint,hash:record.contentHash}));await putImage(record);
  if(!valid())throw new Error('输入已变化，未采用透明结果');
  const next=attachTransparent(project,nodeId,record,signature);persistProject(next);project=next;imageCache.set(record.id,{...record,url:URL.createObjectURL(record.frames[0].blob)});renderAll();
}

function applyViewport(){
  const {x,y,zoom}=project.viewport;elements.world.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;
  elements.grid.style.backgroundPosition=`${x}px ${y}px`;
  elements.grid.style.backgroundSize=`${24*zoom}px ${24*zoom}px`;
  get('zoomLabel').textContent=`${Math.round(zoom*100)}%`;
}

function worldPoint(clientX,clientY){const rect=elements.viewport.getBoundingClientRect();return{x:(clientX-rect.left-project.viewport.x)/project.viewport.zoom,y:(clientY-rect.top-project.viewport.y)/project.viewport.zoom};}

function summarizeParameters(node){
  const entries=Object.entries(node.parameters).filter(([,value])=>value!==null&&value!=='');
  return entries.length?entries.slice(0,2).map(([key,value])=>`${parameterLabels[key]||key} ${String(value)}`).join(' · '):'等待配置';
}

function editNodeName(nodeId){
  if(autoControls?.busy){notify('自动执行中，暂不能修改节点');return;}
  const node=project.nodes.find(item=>item.id===nodeId),article=elements.nodes.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
  const button=article?.querySelector('.node-name');if(!node||!button)return;
  const input=document.createElement('input');input.className='node-name-input';input.value=node.name;input.maxLength=80;input.setAttribute('aria-label','节点名称');
  let finished=false;
  function finish(cancel=false){if(finished)return;finished=true;const name=input.value.trim();if(!cancel&&name&&name!==node.name){commit(updateNode(project,nodeId,{name}));}else renderAll();}
  input.addEventListener('pointerdown',event=>event.stopPropagation());
  input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();finish();}else if(event.key==='Escape'){event.preventDefault();finish(true);}});
  input.addEventListener('blur',()=>finish());button.replaceWith(input);input.focus();input.select();
}

function renderNodes(){
  previewDisposers.forEach(dispose=>dispose());previewDisposers=[];
  elements.nodes.replaceChildren();
  project.nodes.forEach((node,index)=>{
    const definition=definitions.get(node.type);if(!definition)return;
    const article=document.createElement('article');article.className=`workflow-node mode-${definition.executionMode}${node.id===selectedNodeId?' is-selected':''}`;article.dataset.nodeId=node.id;article.style.left=`${node.position.x}px`;article.style.top=`${node.position.y}px`;
    const inputs=definition.inputs.map(port=>`<div class="node-port input"><i class="port-dot" data-direction="input" data-node="${node.id}" data-port="${port.name}" title="输入：${port.assetTypes.map(type=>assetLabels[type]).join(' / ')}${port.required?'':'（可选）'}"></i></div>`).join('');
    const outputs=definition.outputs.map(port=>`<div class="node-port output"><i class="port-dot" data-direction="output" data-node="${node.id}" data-port="${port.name}" title="输出：${port.assetTypes.map(type=>assetLabels[type]).join(' / ')}"></i></div>`).join('');
    article.innerHTML=`<div class="node-header"><span class="node-type-icon">${icons[nodeIcons[node.type]]||icons['layout-grid']}</span><button type="button" class="node-name" title="双击修改名称"><strong></strong></button><i class="mode-mark"></i></div><div class="node-body"></div><div class="node-ports"><div class="port-list input">${inputs}</div><div class="port-list output">${outputs}</div></div><div class="node-param-preview"></div>`;
    const nameButton=article.querySelector('.node-name');nameButton.querySelector('strong').textContent=node.name||definition.title;
    nameButton.addEventListener('dblclick',event=>{event.stopPropagation();editNodeName(node.id);});
    nameButton.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key==='F2'){event.preventDefault();event.stopPropagation();editNodeName(node.id);}});
    article.querySelector('.node-param-preview').textContent=summarizeParameters(node);
    if(node.type==='reference-image'){
      article.querySelector('.node-body').replaceWith(imageControl(node));
      article.querySelector('.node-param-preview').hidden=true;
    }
    if(node.type==='action-video'){article.querySelector('.node-body').replaceWith(videoControl(node));article.querySelector('.node-param-preview').hidden=true;}
    if(['extract-frames','organize-frames','process-frames'].includes(node.type)){
      const record=node.type==='extract-frames'?extractContext(node.id).frames:organizeContext(node.id).output||(node.type==='process-frames'?processSource(node.id):null);if(record?.frames){const player=framePlayer(record,{compact:true});article.querySelector('.node-body').replaceWith(player.root);previewDisposers.push(()=>player.dispose());article.querySelector('.node-param-preview').textContent=`${record.frames.length} 帧 · ${record.width} × ${record.height}`;}
      article.addEventListener('dblclick',event=>{if(autoControls?.busy){notify('请等待自动执行结束后编辑帧');return;}if(!event.target.closest('button,input,.port-dot'))(node.type==='process-frames'?sequenceWorkbench:node.type==='extract-frames'?workbench:organizeWorkbench).open(node.id);});
    }
    if(node.type==='remove-background'){
      const record=imageCache.get(sourceAsset(project,node.id,'frames')?.id)||mattingDrafts.get(node.id)?.record;
      if(record?.frames){const player=framePlayer(record,{compact:true});player.root.classList.add('transparent-preview');article.querySelector('.node-body').replaceWith(player.root);previewDisposers.push(()=>player.dispose());article.querySelector('.node-param-preview').textContent=`${record.frames.length} 帧 · 透明 PNG`;}
      else article.querySelector('.node-param-preview').textContent='等待序列帧';
      article.addEventListener('dblclick',event=>{if(autoControls?.busy){notify('请等待自动执行结束后精修');return;}if(!event.target.closest('button,input,.port-dot'))mattingWorkbench.open(node.id);});
    }
    article.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.port-dot,input,textarea,select,video,a'))return;
      const button=event.target.closest('button');
      if(button&&!button.matches('.node-name,.reference-drop')){selectNode(node.id);return;}
      beginNodeDrag(event,node.id,article);
    });
    article.querySelectorAll('.port-dot[data-direction="output"]').forEach(port=>port.addEventListener('pointerdown',beginConnection));
    elements.nodes.append(article);
  });
  elements.empty.hidden=project.nodes.length>0;
  updateStatusMarks();
}

function portCenter(nodeId,portName,direction){
  const selector=`.port-dot[data-node="${CSS.escape(nodeId)}"][data-port="${CSS.escape(portName)}"][data-direction="${direction}"]`;
  const dot=elements.nodes.querySelector(selector);if(!dot)return null;
  const rect=dot.getBoundingClientRect();return worldPoint(rect.left+rect.width/2,rect.top+rect.height/2);
}

function curve(a,b){const bend=Math.max(70,Math.abs(b.x-a.x)*.42),lift=Math.abs(b.y-a.y)<8?18:0;return `M ${a.x} ${a.y} C ${a.x+bend} ${a.y-lift}, ${b.x-bend} ${b.y-lift}, ${b.x} ${b.y}`;}

function renderConnections(){
  elements.connections.replaceChildren();
  for(const edge of project.connections){const start=portCenter(edge.fromNode,edge.fromPort,'output'),end=portCenter(edge.toNode,edge.toPort,'input');if(!start||!end)continue;const pathData=curve(start,end);const hitPath=document.createElementNS('http://www.w3.org/2000/svg','path');hitPath.setAttribute('d',pathData);hitPath.classList.add('connection-hit');hitPath.dataset.connectionId=edge.id;hitPath.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.stopPropagation();selectConnection(edge.id);});const visualPath=document.createElementNS('http://www.w3.org/2000/svg','path');visualPath.setAttribute('d',pathData);visualPath.classList.add('connection-line');if(edge.id===selectedConnectionId)visualPath.classList.add('is-selected');elements.connections.append(hitPath,visualPath);}
}

function renderAll(){
  const used=new Set(project.results.flatMap(result=>result.outputs.map(output=>output.asset.id)));
  for(const [id,record] of imageCache){if(!used.has(id)){if(record.url)URL.revokeObjectURL(record.url);imageCache.delete(id);}}
  applyViewport();renderNodes();renderConnections();renderInspector();
  workbench?.refresh();
  organizeWorkbench?.refresh();
  sequenceWorkbench?.refresh();
  mattingWorkbench?.refresh();
}

function renderSelection(){
  elements.nodes.querySelectorAll('.workflow-node').forEach(node=>node.classList.toggle('is-selected',node.dataset.nodeId===selectedNodeId));
  renderConnections();renderInspector();
}

function selectNode(nodeId){selectedNodeId=nodeId;selectedConnectionId=null;elements.viewport.focus({preventScroll:true});renderSelection();}
function selectConnection(connectionId){selectedNodeId=null;selectedConnectionId=connectionId;elements.viewport.focus({preventScroll:true});renderSelection();}
function clearSelection(){selectedNodeId=null;selectedConnectionId=null;renderSelection();}

function deleteNodeById(nodeId){
  if(extractionTasks.has(nodeId)){cancelExtraction(nodeId);extractionTasks.delete(nodeId);extractionProgress.delete(nodeId);}
  importing.delete(nodeId);
  importErrors.delete(nodeId);
  const next=removeNode(project,nodeId);if(next===project)return;
  if(selectedNodeId===nodeId)selectedNodeId=null;
  commit(next);notify('节点已删除');
}

function duplicateNodeById(nodeId){
  const duplicated=duplicateProjectNode(project,nodeId);selectedNodeId=duplicated.nodeId;selectedConnectionId=null;commit(duplicated.project);notify('节点已复制');
}

function deleteConnectionById(connectionId){
  selectedConnectionId=null;commit(removeConnection(project,connectionId));notify('连接已断开');
}

function closeContextMenu({focusCanvas=false}={}){
  contextMenu.hidden=true;contextTarget=null;
  if(focusCanvas)elements.viewport.focus({preventScroll:true});
}

function openContextMenu(event){
  const node=event.target.closest('.workflow-node'),edge=event.target.closest('.connection-hit');
  event.preventDefault();closeContextMenu();
  const id=node?node.dataset.nodeId:edge?.dataset.connectionId;
  if(node)selectNode(id);else if(edge)selectConnection(id);else clearSelection();
  contextTarget={kind:node?'node':edge?'connection':'canvas',id,position:worldPoint(event.clientX,event.clientY),screen:{x:event.clientX,y:event.clientY}};
  get('contextNodeCatalog').hidden=true;
  contextMenu.querySelector('[data-action="add"]').hidden=Boolean(node||edge);
  contextMenu.querySelector('[data-action="duplicate"]').hidden=!node;
  contextMenu.querySelector('[data-action="auto-run"]').hidden=!node||!['action-video','extract-frames','organize-frames','process-frames','remove-background'].includes(project.nodes.find(item=>item.id===id)?.type);
  for(const action of ['add','duplicate','delete'])contextMenu.querySelector(`[data-action="${action}"]`).disabled=!!autoControls?.busy;
  const autoButton=contextMenu.querySelector('[data-action="auto-run"]');let reason='';try{if(autoControls?.busy)throw new Error('自动执行正在运行');if(node)checkAutomatic(id);}catch(error){reason=error.message;}
  autoButton.disabled=!!reason;autoButton.title=reason||'按预设执行当前帧处理分支';
  contextMenu.querySelector('[data-action="delete"]').hidden=!node&&!edge;
  get('resetProject').hidden=Boolean(node||edge);
  get('contextResetSeparator').hidden=Boolean(node||edge);
  get('resetProject').disabled=project.nodes.length===0||!!autoControls?.busy;
  get('contextDeleteLabel').textContent=node?'删除节点':'断开连接';
  contextMenu.hidden=false;
  // 固定定位使用屏幕坐标，靠近窗口边缘时向内收，避免菜单被裁掉。
  positionContextMenu();
  visibleMenuItems()[0].focus();
}

function visibleMenuItems(){return [...contextMenu.querySelectorAll('[role="menuitem"]')].filter(item=>!item.disabled&&item.getClientRects().length>0);}

function positionContextMenu(){
  const rect=contextMenu.getBoundingClientRect(),{x,y}=contextTarget.screen;
  contextMenu.style.left=`${Math.max(8,Math.min(x,window.innerWidth-rect.width-8))}px`;
  contextMenu.style.top=`${Math.max(8,Math.min(y,window.innerHeight-rect.height-8))}px`;
}

function showContextNodeCatalog(){
  contextMenu.querySelector('[data-action="add"]').hidden=true;
  const catalog=get('contextNodeCatalog');catalog.replaceChildren();catalog.hidden=false;
  for(const {name,types} of toolbarGroups){
    const title=document.createElement('div');title.className='context-group-title';title.textContent=name;catalog.append(title);
    for(const type of types){
      const definition=definitions.get(type),button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.dataset.nodeType=type;
      button.innerHTML=`<span class="context-node-icon">${icons[nodeIcons[type]]}</span><span>${definition.title}</span>`;catalog.append(button);
    }
  }
  contextMenu.scrollTop=0;positionContextMenu();visibleMenuItems()[0].focus();
}

function schemaKind(schema){const variants=schema.anyOf||[];const concrete=variants.find(item=>item.type&&item.type!=='null');return concrete||schema;}
function fieldForParameter(key,schema,value){
  const kind=schemaKind(schema);const label=document.createElement('label');label.textContent=parameterLabels[key]||key;let input;
  if(key==='prompt'||key==='providerNote'){input=document.createElement('textarea');input.rows=key==='prompt'?4:2;input.value=value??'';input.maxLength=kind.maxLength;}
  else if(kind.enum){const labels={godot:'Godot',javascript:'JavaScript','png-sequence':'PNG 序列','sprite-sheet':'精灵图集'};input=document.createElement('select');input.innerHTML='<option value="">请选择</option>'+kind.enum.map(option=>`<option value="${option}">${labels[option]||option}</option>`).join('');input.value=value??'';}
  else if(kind.type==='boolean'){input=document.createElement('select');input.innerHTML='<option value="">未设置</option><option value="true">是</option><option value="false">否</option>';input.value=value===true?'true':value===false?'false':'';}
  else{input=document.createElement('input');input.type=kind.type==='integer'||kind.type==='number'?'number':'text';if(kind.minimum!==undefined)input.min=kind.minimum;if(kind.maximum!==undefined)input.max=kind.maximum;if(kind.exclusiveMinimum!==undefined)input.min=kind.exclusiveMinimum;input.value=value??'';}
  if(input.tagName==='INPUT'){input.placeholder=key==='frameWidth'||key==='frameHeight'?'可选':key==='fps'?'1–60':'';if(input.type==='number')input.step=kind.type==='integer'?'1':'any';}
  input.dataset.parameter=key;input.addEventListener('input',()=>{const node=project.nodes.find(item=>item.id===selectedNodeId);if(!node)return;const parameters={...node.parameters};if(input.value==='')delete parameters[key];else if(kind.type==='integer')parameters[key]=Number.parseInt(input.value,10);else if(kind.type==='number')parameters[key]=Number(input.value);else if(kind.type==='boolean')parameters[key]=input.value==='true';else parameters[key]=input.value;commit(updateNode(project,node.id,{parameters}),{render:false});updateStatusMarks();get('inspectStatus').textContent=nodeStatus(node).label;get('inspectStatus').dataset.status=nodeStatus(node).key;});input.addEventListener('change',()=>{if(project.nodes.find(item=>item.id===selectedNodeId)?.type==='action-video')renderInspector();});label.append(input);return label;
}

function renderInspector(){
  const node=project.nodes.find(item=>item.id===selectedNodeId);const edge=project.connections.find(item=>item.id===selectedConnectionId);
  elements.inspectorEmpty.hidden=Boolean(node||edge);elements.nodeInspector.hidden=!node;elements.connectionInspector.hidden=!edge;
  elements.nodeInspector.classList.toggle('is-reference',node?.type==='reference-image');
  const workbenchActions=get('nodeWorkbenchActions');workbenchActions.replaceChildren();workbenchActions.hidden=true;
  const media=get('referenceImageSection');media.replaceChildren();media.hidden=!['reference-image','action-video'].includes(node?.type);
  if(node){
    const state=nodeStatus(node);get('inspectStatus').textContent=state.label;get('inspectStatus').dataset.status=state.key;
    if(node.type==='reference-image')media.append(imageControl(node,{compact:true}));
    if(node.type==='action-video')media.append(videoControl(node,{compact:true}));
  }
  if(node){
    const definition=definitions.get(node.type);get('inspectTitle').textContent=node.name||definition.title;get('inspectType').textContent=definition.title;
    const fields=get('parameterFields');fields.replaceChildren();const properties=definition.parameterSchema?.properties||{};
    for(const key of inspectorFields[node.type]||[])fields.append(fieldForParameter(key,properties[key],node.parameters[key]));
    if(node.type==='action-video'){
      const notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='生成备注（可选）';notes.append(summary);
      for(const key of ['prompt','direction','durationSeconds','providerNote'])notes.append(fieldForParameter(key,properties[key],node.parameters[key]));fields.append(notes);
    }
    if(node.type==='remove-background'){
      const open=document.createElement('button');open.className='quiet-button';open.textContent='打开透明背景工作台';open.onclick=()=>mattingWorkbench.open(node.id);workbenchActions.append(open);workbenchActions.hidden=false;
      if(node.parameters.despillStrength!=null){const clear=document.createElement('button');clear.className='quiet-button';clear.textContent='清除未支持的去绿强度';clear.onclick=()=>{const parameters={...node.parameters};delete parameters.despillStrength;commit(updateNode(project,node.id,{parameters}));};fields.append(clear);}
    }
    get('nodeSettings').hidden=!fields.childElementCount;
    const notice=get('inspectNotice');
    const missing=definition.inputs.filter(port=>port.required&&!project.connections.some(edge=>edge.toNode===node.id&&edge.toPort===port.name));
    const hints=missing.map(port=>`请连接${port.assetTypes.map(type=>assetLabels[type]).join('或')}`);
    if(node.type==='extract-frames'){
      const value=extractContext(node.id),busy=extractionTasks.has(node.id),summary=document.createElement('dl');summary.className='extract-inspector-summary';
      const number=value=>Number.isFinite(value)?new Intl.NumberFormat('zh-CN',{maximumFractionDigits:3}).format(value):'未设置';
      const start=node.parameters.startSeconds??0,end=node.parameters.endSeconds??value.video?.duration,fps=node.parameters.fps??12;
      const rows=[['抽取范围',`${number(start)} — ${number(end)} 秒`],['采样率',`${number(fps)} 帧/秒`]];
      if(value.frames)rows.push([value.status.key==='ready'?'当前结果':'已有结果',`${value.frames.frames.length} 帧 · ${value.frames.width} × ${value.frames.height}`]);
      for(const [label,text] of rows){const row=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=text;row.append(term,description);summary.append(row);}fields.append(summary);
      const actions=document.createElement('div');actions.className='extract-inspector-actions';const open=document.createElement('button');open.className='solid-button';open.textContent='打开抽帧工作台';open.onclick=()=>workbench.open(node.id);const run=document.createElement('button');run.className='quiet-button';run.textContent=value.frames?'重新提取':'提取序列帧';run.disabled=busy||!value.videoReady;run.onclick=()=>runExtraction(node.id);actions.append(open,run);if(busy){const cancel=document.createElement('button');cancel.className='quiet-button';cancel.textContent='取消任务';cancel.onclick=()=>cancelExtraction(node.id);actions.append(cancel);}fields.append(actions);get('nodeSettings').hidden=false;
    }
    if(node.type==='organize-frames'){
      const value=organizeContext(node.id);if(value.error)hints.push(value.error);
      const open=document.createElement('button');open.className='solid-button';open.textContent='打开整理工作台';open.disabled=!value.input;open.onclick=()=>organizeWorkbench.open(node.id);fields.append(open);get('nodeSettings').hidden=false;
    }
    if(node.type==='process-frames'){
      const open=document.createElement('button');open.className='quiet-button';open.textContent='打开序列帧工作台';open.setAttribute('aria-label','打开序列帧工作台');open.onclick=()=>sequenceWorkbench.open(node.id);workbenchActions.append(open);workbenchActions.hidden=false;
    }
    if(!['reference-image','action-video','extract-frames','organize-frames','process-frames','remove-background'].includes(node.type)){
      hints.push('当前仅保存配置，尚未接通执行');
    }
    notice.textContent=hints.join('；');notice.hidden=!hints.length;
    autoControls?.inspector(node,fields);
    get('nodeSettings').hidden=!fields.childElementCount;
    if(autoControls?.busy){
      workbenchActions.querySelectorAll('button').forEach(button=>button.disabled=true);
      fields.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=true);
      media.querySelectorAll('input,button').forEach(input=>input.disabled=true);
    }
  }
  if(edge){
    const summary=get('connectionSummary');summary.replaceChildren();
    for(const [label,id] of [['上游',edge.fromNode],['下游',edge.toNode]]){
      const endpoint=document.createElement('div');endpoint.className='connection-end';const caption=document.createElement('span'),title=document.createElement('strong');caption.textContent=label;title.textContent=definitions.get(project.nodes.find(node=>node.id===id)?.type)?.title||'节点';endpoint.append(caption,title);summary.append(endpoint);
    }
  }
}

function beginNodeDrag(event,nodeId,article){
  if(event.button!==0||event.target.closest('input'))return;event.preventDefault();event.stopPropagation();selectNode(nodeId);const node=project.nodes.find(item=>item.id===nodeId);const start={x:event.clientX,y:event.clientY,nodeX:node.position.x,nodeY:node.position.y};let moved=false;
  const move=moveEvent=>{if(!moved&&Math.hypot(moveEvent.clientX-start.x,moveEvent.clientY-start.y)<3)return;moved=true;article.classList.add('is-dragging');const x=start.nodeX+(moveEvent.clientX-start.x)/project.viewport.zoom,y=start.nodeY+(moveEvent.clientY-start.y)/project.viewport.zoom;article.style.left=`${x}px`;article.style.top=`${y}px`;node.position={x,y};renderConnections();};
  const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);article.classList.remove('is-dragging');if(moved){project={...project,revision:project.revision+1};scheduleSave();renderAll();}};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});
}

function clearPortHints(){elements.nodes.querySelectorAll('.port-dot').forEach(dot=>dot.classList.remove('is-compatible','is-incompatible','is-snap-target'));}
function beginConnection(event){
  if(autoControls?.busy){notify('自动执行中，暂不能修改连线');return;}
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();const dot=event.currentTarget;const start=portCenter(dot.dataset.node,dot.dataset.port,'output');connectionDrag={fromNode:dot.dataset.node,fromPort:dot.dataset.port,start};elements.draft.classList.add('is-visible');
  elements.nodes.querySelectorAll('.port-dot[data-direction="input"]').forEach(input=>{const check=canConnect(project,registry,connectionDrag.fromNode,connectionDrag.fromPort,input.dataset.node,input.dataset.port);input.classList.add(check.ok?'is-compatible':'is-incompatible');});
  const inputs=[...elements.nodes.querySelectorAll('.port-dot[data-direction="input"].is-compatible')];let snapped=null;
  // 以屏幕像素定义吸附范围，缩放后仍保持相同的操作容差。
  function nearest(clientX,clientY){
    const view=elements.viewport.getBoundingClientRect();if(clientX<view.left||clientX>view.right||clientY<view.top||clientY>view.bottom)return null;
    let nearest=null,distance=32;
    for(const input of inputs){if(!input.isConnected)continue;const rect=input.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;if(x<view.left||x>view.right||y<view.top||y>view.bottom)continue;const delta=Math.hypot(clientX-x,clientY-y);if(delta<distance){distance=delta;nearest=input;}}
    return nearest;
  }
  const move=moveEvent=>{const target=nearest(moveEvent.clientX,moveEvent.clientY);if(target!==snapped){snapped?.classList.remove('is-snap-target');target?.classList.add('is-snap-target');snapped=target;}const point=target?portCenter(target.dataset.node,target.dataset.port,'input'):worldPoint(moveEvent.clientX,moveEvent.clientY);elements.draft.querySelector('path').setAttribute('d',curve(start,point));};
  const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);elements.draft.classList.remove('is-visible');clearPortHints();connectionDrag=null;};
  const cancel=()=>cleanup(),key=event=>{if(event.key==='Escape'){event.preventDefault();cleanup();}};
  const end=endEvent=>{const direct=document.elementFromPoint(endEvent.clientX,endEvent.clientY)?.closest('.port-dot[data-direction="input"]'),target=direct||nearest(endEvent.clientX,endEvent.clientY),source=connectionDrag;cleanup();if(target){try{commit(connectNodes(project,registry,source.fromNode,source.fromPort,target.dataset.node,target.dataset.port));notify('连接已建立');}catch(error){notify(error.message);}}};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key);move(event);
}

function beginPan(event){
  if(event.target!==elements.viewport&&event.target!==elements.grid&&event.target!==elements.world)return;if(event.button!==0&&event.button!==1)return;event.preventDefault();const start={x:event.clientX,y:event.clientY,viewX:project.viewport.x,viewY:project.viewport.y};elements.viewport.classList.add('is-panning');
  const move=moveEvent=>{project=updateViewport(project,{...project.viewport,x:start.viewX+moveEvent.clientX-start.x,y:start.viewY+moveEvent.clientY-start.y});applyViewport();};
  const end=()=>{window.removeEventListener('pointermove',move);elements.viewport.classList.remove('is-panning');scheduleSave();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});
}

function zoomAt(factor,clientX,clientY){const rect=elements.viewport.getBoundingClientRect();const before=worldPoint(clientX,clientY);const zoom=Math.min(2.2,Math.max(.3,project.viewport.zoom*factor));const x=clientX-rect.left-before.x*zoom,y=clientY-rect.top-before.y*zoom;project=updateViewport(project,{x,y,zoom});applyViewport();scheduleSave();}
function fitView(){
  if(!project.nodes.length){commit(updateViewport(project,{x:0,y:0,zoom:1}));return;}const rect=elements.viewport.getBoundingClientRect();const xs=project.nodes.map(node=>node.position.x),ys=project.nodes.map(node=>node.position.y);const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs)+248,maxY=Math.max(...project.nodes.map(node=>node.position.y+(elements.nodes.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`)?.offsetHeight||170)));const zoom=Math.min(1.25,Math.max(.3,Math.min((rect.width-120)/(maxX-minX),(rect.height-120)/(maxY-minY))));commit(updateViewport(project,{zoom,x:(rect.width-(maxX-minX)*zoom)/2-minX*zoom,y:(rect.height-(maxY-minY)*zoom)/2-minY*zoom}));
}

function addToolbarNode(definition){
  const rect=elements.viewport.getBoundingClientRect();
  const center=worldPoint(rect.left+rect.width/2,rect.top+rect.height/2);
  const position={x:center.x-124,y:center.y-85};
  // 中心附近有同位置节点时小幅错开，避免新节点完全盖住已有节点。
  while(project.nodes.some(node=>Math.abs(node.position.x-position.x)<24&&Math.abs(node.position.y-position.y)<24)){position.x+=28;position.y+=28;}
  createNodeAt(definition,position);
}

function createNodeAt(definition,position){
  const next=addNode(project,definition,position);selectedNodeId=next.nodes.at(-1).id;selectedConnectionId=null;commit(next);
  elements.viewport.focus({preventScroll:true});notify(`已添加“${definition.title}”`);
}

function renderToolbar(){
  elements.toolbar.replaceChildren();
  for(const {name,types} of toolbarGroups){
    const group=document.createElement('section');group.className='toolbar-group';group.setAttribute('aria-label',name);
    const title=document.createElement('h2');title.textContent=name;group.append(title);
    for(const type of types){
      const definition=definitions.get(type);if(!definition)throw new Error(`工具栏节点未定义：${type}`);
      const button=document.createElement('button');button.type='button';button.className='node-tool';button.dataset.nodeType=type;button.setAttribute('aria-label',`添加${definition.title}`);
      button.innerHTML=`<span class="node-tool-icon">${icons[nodeIcons[type]]}</span><span class="node-tool-label">${definition.title}</span>`;
      button.addEventListener('click',()=>addToolbarNode(definition));group.append(button);
    }
    elements.toolbar.append(group);
  }
}

function bindEvents(){
  get('adoptVideoDialog').addEventListener('close',()=>{
    const target=adoptTarget;adoptTarget=null;if(get('adoptVideoDialog').returnValue!=='confirm'||!target)return;
    if(sourceContext(target.nodeId)!==target.context||sourceAsset(project,target.nodeId)?.id!==target.assetId||!referenceAvailable(target.nodeId)){notify('输入已变化，请重新检查视频');return;}
    const record=imageCache.get(target.assetId);if(!record?.url){notify('视频不可用，请重新导入');return;}
    const next={...project,revision:project.revision+1,results:project.results.map(result=>result.nodeId===target.nodeId?{...result,confirmed:true}:result)};
    try{clearTimeout(saveTimer);persistProject(next);project=next;importErrors.delete(target.nodeId);renderAll();notify('已采用当前视频');}catch(error){notify(error.message);}
  });
  get('zoomFit').addEventListener('click',fitView);get('zoomIn').addEventListener('click',()=>{const r=elements.viewport.getBoundingClientRect();zoomAt(1.15,r.left+r.width/2,r.top+r.height/2);});get('zoomOut').addEventListener('click',()=>{const r=elements.viewport.getBoundingClientRect();zoomAt(1/1.15,r.left+r.width/2,r.top+r.height/2);});
  elements.viewport.addEventListener('pointerdown',event=>{if(event.target===elements.viewport||event.target===elements.grid||event.target===elements.world){if(event.button===0)clearSelection();beginPan(event);}});elements.viewport.addEventListener('wheel',event=>{event.preventDefault();zoomAt(event.deltaY<0?1.08:1/1.08,event.clientX,event.clientY);},{passive:false});
  get('closeInspector').addEventListener('click',clearSelection);get('closeConnectionInspector').addEventListener('click',clearSelection);
  elements.viewport.addEventListener('contextmenu',openContextMenu);
  document.addEventListener('pointerdown',event=>{if(!contextMenu.contains(event.target))closeContextMenu();});
  elements.viewport.addEventListener('wheel',()=>closeContextMenu(),{passive:true});
  window.addEventListener('resize',()=>closeContextMenu());
  window.addEventListener('blur',()=>closeContextMenu());
  contextMenu.addEventListener('click',event=>{
    const nodeButton=event.target.closest('[data-node-type]');
    if(nodeButton&&contextTarget?.kind==='canvas'){
      const {position}=contextTarget;closeContextMenu();createNodeAt(definitions.get(nodeButton.dataset.nodeType),position);return;
    }
    const button=event.target.closest('[data-action]');if(!button||button.disabled||!contextTarget)return;
    if(button.dataset.action==='add'){showContextNodeCatalog();return;}
    if(button.dataset.action==='reset'){closeContextMenu();return;}
    const {kind,id}=contextTarget;closeContextMenu({focusCanvas:true});
    if(button.dataset.action==='auto-run'){autoControls.run(id);return;}
    if(button.dataset.action==='duplicate')duplicateNodeById(id);
    else if(kind==='node')deleteNodeById(id);
    else deleteConnectionById(id);
  });
  contextMenu.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','Home','End','Tab'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Tab'){closeContextMenu({focusCanvas:true});return;}
    const items=visibleMenuItems(),index=items.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next].focus();
  });
  const resetDialog=get('resetDialog');
  get('resetProject').addEventListener('click',()=>{resetDialog.returnValue='';resetDialog.showModal();});
  resetDialog.addEventListener('close',()=>{
    if(resetDialog.returnValue!=='confirm')return;
    canvasGeneration+=1;importing.clear();importErrors.clear();
    for(const id of extractionTasks.keys())cancelExtraction(id);extractionTasks.clear();extractionProgress.clear();
    project=createWorkflowProject({id:project.id,name:project.name});selectedNodeId=null;selectedConnectionId=null;commit(project);notify('画布已清空');
  });
  window.addEventListener('keydown',event=>{
    if(autoControls?.busy||document.querySelector('[aria-label="覆盖已有编辑"][open]'))return;
    if(workbench?.active||organizeWorkbench?.active||sequenceWorkbench?.active||mattingWorkbench?.active||resetDialog.open||get('imageViewer').open||get('adoptVideoDialog').open||get('libraryDialog').open||event.target.closest?.('.navigation-panel'))return;
    if(event.key==='Escape'&&!contextMenu.hidden){event.preventDefault();closeContextMenu({focusCanvas:true});return;}
    const editing=event.target instanceof Element&&event.target.closest('input,select,textarea');
    if(event.key==='Escape'){elements.viewport.focus({preventScroll:true});clearSelection();}
    if((event.key==='Delete'||event.key==='Backspace')&&!editing){event.preventDefault();closeContextMenu({focusCanvas:true});if(selectedNodeId)deleteNodeById(selectedNodeId);else if(selectedConnectionId)deleteConnectionById(selectedConnectionId);}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'&&selectedNodeId&&!editing){event.preventDefault();closeContextMenu({focusCanvas:true});duplicateNodeById(selectedNodeId);}
  });
}

async function start(){
  decorateIcons();registry=await fetch('/assets/workflow-node-registry.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('节点目录加载失败');return response.json();});definitions=new Map(registry.nodes.map(definition=>[definition.type,definition]));
  library=openWorkflowLibrary();STORAGE_KEY=library.active().key;
  const stored=localStorage.getItem(STORAGE_KEY);savedGraph=stored;if(stored)project=parseStoredProject(stored,registry);
  project={...project,name:library.active().name};
  await loadReferenceImages();
  bindEvents();renderToolbar();renderAll();
  workbench=createExtractWorkbench({context:extractContext,changeParameters:changeExtractParameters,run:runExtraction,cancel:cancelExtraction});
  organizeWorkbench=createOrganizeWorkbench({context:organizeContext,load:async(id,fingerprint)=>{const draft=await getImage(await draftKey(id,fingerprint));if(draft)return draft;const value=organizeContext(id);if(value.confirmed&&value.output?.frames){const selected=value.output.frames.map(frame=>frame.id),order=value.input.frames.map(frame=>frame.id);return {snapshot:{order,selected,active:selected[0],anchor:null},undo:[],redo:[]};}return null;},save:saveOrganizeDraft,publish:publishOrganize,notify});
  sequenceWorkbench=createSequenceWorkbench({context:organizeContext,extractContext,changeParameters:changeExtractParameters,run:runExtraction,cancel:cancelExtraction,load:async(id,fingerprint)=>{const draft=await getImage(await draftKey(id,fingerprint));if(draft)return draft;const value=organizeContext(id);if(value.confirmed&&value.output?.frames){const selected=value.output.frames.map(frame=>frame.id),order=value.input.frames.map(frame=>frame.id);return {snapshot:{order,selected,active:selected[0],anchor:null},undo:[],redo:[]};}return null;},save:saveOrganizeDraft,publish:publishOrganize,notify});
  mattingWorkbench=createMattingWorkbench({context:mattingContext,load:async id=>mattingDrafts.get(id)?.record,save:saveMattingDraft,publish:publishMatting,notify});
  autoControls=createAutoControls({check:checkAutomatic,execute:executeAutomatic,notify,nodeContext:id=>{const node=project.nodes.find(node=>node.id===id);if(!node)throw new Error('节点不存在');return {projectId:project.id,node};},onChange:()=>{renderInspector();updateStatusMarks();}});
  renderInspector();
  navigation=bindWorkflowNavigation(library,{flush:()=>{clearTimeout(saveTimer);persistProject(project);},isBusy:()=>autoControls.busy||importing.size>0||extractionTasks.size>0||organizeWorkbench.busy||sequenceWorkbench.busy||mattingWorkbench.busy,notify});
  window.addEventListener('pagehide',()=>{if(saveTimer){clearTimeout(saveTimer);try{persistProject(project);}catch(error){console.error(error);}}});
}

start().catch(error=>{console.error(error);notify(error.message);});

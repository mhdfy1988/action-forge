import {actionPlacement,pointOnImage} from './project-geometry.js';
import {durationMs,enabledFrames as getEnabledFrames,eventOffsetMs,eventsAtFrame,fpsToRational,millisecondsToRational,nextFrameIndex,secondsToMilliseconds,totalDurationMs} from './project-playback.js';
const $=id=>document.getElementById(id);
const state={summaries:[],project:null,actionId:null,dirty:false,frame:0,timer:0,calibrationTimer:0,playbackElapsedMs:0,eventLog:[],batch:new URLSearchParams(location.search).get('batch'),calibration:null,preview:null,previewTimer:0,previewStatusTimer:0,previewQueue:Promise.resolve(),openRevision:0};
const calibrationImageCache=new Map();

async function api(url,options){
  const response=await fetch(url,options);
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(typeof body.detail==='string'?body.detail:'请求失败');}
  return response.json();
}
const json=value=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
const action=()=>state.project?.characters[0].actions.find(item=>item.id===state.actionId)||null;
function message(text,error=false){$('project-message').textContent=error?'':text;$('project-error').textContent=error?text:'';}
function setDirty(value=true){state.dirty=value;$('save-project').disabled=!value||!state.project;$('project-state').textContent=value?'有未保存修改':'已保存';if(value)schedulePreview();}
function stop(){const wasPlaying=!!state.timer||!!state.calibrationTimer;clearTimeout(state.timer);state.timer=0;$('project-play').textContent='▷ 播放';clearTimeout(state.calibrationTimer);state.calibrationTimer=0;if($('calibration-play'))$('calibration-play').textContent='▷ 播放当前动作';if(wasPlaying)schedulePreview();}
function safeSwitch(){if(!state.dirty)return true;return confirm('当前项目有未保存修改，放弃后切换吗？');}

async function refreshList(){
  const data=await api('/api/character-projects');state.summaries=data.projects;
  const fragment=document.createDocumentFragment();
  for(const project of state.summaries){
    const row=document.createElement('div');row.className='project-card-row';row.dataset.id=project.id;
    const button=document.createElement('button');button.type='button';button.className='project-card';button.dataset.id=project.id;
    const name=document.createElement('strong');name.textContent=project.name||project.id;
    const meta=document.createElement('span');meta.textContent=project.status==='ready'?`${project.actionCount} 个动作 · r${project.revision}`:'项目清单无效';
    button.append(name,meta);button.disabled=project.status!=='ready';button.onclick=()=>openProject(project.id);
    const remove=document.createElement('button');remove.type='button';remove.className='project-delete';remove.textContent='删除';remove.title=`删除项目“${project.name||project.id}”`;remove.setAttribute('aria-label',remove.title);remove.disabled=project.status!=='ready';remove.onclick=()=>deleteProject(project);
    row.append(button,remove);fragment.append(row);
  }
  $('project-list').replaceChildren(fragment);
  highlightProject();fillMigrationProjects();
}
function highlightProject(){for(const card of $('project-list').querySelectorAll('.project-card'))card.classList.toggle('is-active',card.dataset.id===state.project?.id);}
async function openProject(id){
  if(state.project?.id===id)return;if(!safeSwitch())return;
  const openRevision=++state.openRevision;stop();if(state.preview){clearInterval(state.previewStatusTimer);state.preview=null;}message('');
  try{const project=await api(`/api/character-projects/${encodeURIComponent(id)}`);if(openRevision!==state.openRevision)return;state.project=project;state.actionId=state.project.characters[0].actions[0]?.id||null;state.frame=0;setDirty(false);render();}
  catch(error){if(openRevision===state.openRevision)message(error.message,true);}
}
function render(){
  const project=state.project;$('project-empty').hidden=!!project;$('project-editor').hidden=!project;highlightProject();if(!project)return;
  const character=project.characters[0];$('godot-preview').disabled=!(character.canvas&&character.origin&&character.baseline&&character.actions.some(item=>item.frames.some(frame=>frame.enabled)));
  $('project-name').value=project.name;$('character-name').value=project.characters[0].name;$('project-revision').textContent=`修订 ${project.revision}`;
  renderActions();renderAction();
}
function renderActions(){
  const actions=state.project.characters[0].actions;$('action-count').textContent=`${actions.length}`;
  const fragment=document.createDocumentFragment();
  actions.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='action-card';button.dataset.id=item.id;
    const name=document.createElement('strong');name.textContent=item.name;const meta=document.createElement('span');meta.textContent=`${item.frames.filter(frame=>frame.enabled).length} 帧 · ${item.playback.mode==='constant-fps'?`${item.playback.fps} fps`:'逐帧时长'}`;
    button.append(name,meta);button.classList.toggle('is-active',item.id===state.actionId);button.onclick=()=>{stop();state.actionId=item.id;state.frame=0;state.playbackElapsedMs=0;clearEventLog();renderActions();renderAction();schedulePreview();};fragment.append(button);});
  $('action-list').replaceChildren(fragment);
}
function renderAction(){
  const current=action(),actions=state.project.characters[0].actions;$('action-empty').hidden=!!current;$('action-editor').hidden=!current;$('open-calibration').disabled=!current?.frames.some(frame=>frame.enabled);if(!current)return;
  const index=actions.indexOf(current),imported=state.project.migrations.some(record=>record.actionId===current.id);
  $('action-id').textContent=current.id;$('action-name').value=current.name;$('action-playback-mode').value=current.playback.mode;$('action-fps').value=current.playback.mode==='constant-fps'?current.playback.fps:current.source.declaredFps;$('action-fps-wrap').hidden=current.playback.mode!=='constant-fps';$('action-loop').checked=current.loop;
  $('action-source').textContent=imported?'旧结果迁入':'项目内动作';$('action-up').disabled=index===0;$('action-down').disabled=index===actions.length-1;
  $('delete-action').disabled=false;$('delete-action').title=imported?'删除动作时会同时移除迁入来源记录':'删除当前动作';
  $('action-total-duration').textContent=`总时长 ${formatDuration(totalDurationMs(current))}`;
  renderFrames();
}
function enabledFrames(){return getEnabledFrames(action());}
function formatDuration(milliseconds){return `${(milliseconds/1000).toFixed(3)} 秒`;}
function renderFrames(){
  const frames=enabledFrames();if(state.frame>=frames.length)state.frame=Math.max(0,frames.length-1);
  $('project-frame-empty').hidden=!!frames.length;$('project-frame').hidden=!frames.length;
  for(const id of ['project-prev','project-next','project-play'])$(id).disabled=!frames.length;
  if(frames.length){const frame=frames[state.frame];$('project-frame').src=`/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;$('project-position').textContent=`${state.frame+1} / ${frames.length}`;}
  else $('project-position').textContent='0 / 0';
  const current=action(),selected=frames[state.frame]||null,fragment=document.createDocumentFragment();
  current.frames.forEach((frame,index)=>{const card=document.createElement('article');card.className='project-frame-card';card.dataset.frameId=frame.id;card.classList.toggle('is-active',frame.id===selected?.id);card.classList.toggle('is-disabled',!frame.enabled);
    const select=document.createElement('button');select.type='button';select.className='project-frame-select';select.disabled=!frame.enabled;select.title=frame.enabled?'选择预览帧':'先启用此帧再预览';
    const image=document.createElement('img');image.src=`/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;image.alt=`第${index+1}帧`;image.loading='lazy';select.append(image);select.onclick=()=>{stop();state.frame=enabledFrames().findIndex(item=>item.id===frame.id);renderFrames();schedulePreview();};card.append(select);
    const label=document.createElement('div');label.className='project-frame-label';const number=document.createElement('span');number.textContent=String(index+1).padStart(3,'0');const count=document.createElement('small');count.textContent=`${eventsAtFrame(current,frame.id).length} 事件`;label.append(number,count);card.append(label);
    const enabled=document.createElement('label');enabled.className='project-frame-enabled';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=frame.enabled;checkbox.setAttribute('aria-label',`启用第${index+1}帧`);checkbox.onchange=()=>toggleFrameEnabled(frame,checkbox);enabled.append(checkbox,document.createTextNode('启用'));const order=document.createElement('div');order.className='project-frame-order';const up=document.createElement('button');up.type='button';up.textContent='←';up.title='向前移动';up.disabled=index===0;up.onclick=()=>moveFrame(index,-1);const down=document.createElement('button');down.type='button';down.textContent='→';down.title='向后移动';down.disabled=index===current.frames.length-1;down.onclick=()=>moveFrame(index,1);order.append(up,down);enabled.append(order);card.append(enabled);
    if(current.playback.mode==='per-frame'){const duration=document.createElement('label');duration.className='project-frame-duration';duration.append(document.createTextNode('时长 ms'));const input=document.createElement('input');input.type='number';input.min='1';input.max='60000';input.step='1';input.value=frame.duration?String(secondsToMilliseconds(frame.duration)):'';input.placeholder='100';input.disabled=!frame.enabled;input.setAttribute('aria-label',`第${index+1}帧时长毫秒`);input.oninput=()=>setFrameDuration(frame,input);input.onchange=()=>setFrameDuration(frame,input,true);duration.append(input);card.append(duration);}
    const eventNames=eventsAtFrame(current,frame.id).map(event=>event.type).join(' · ');const summary=document.createElement('div');summary.className='project-frame-events';summary.textContent=eventNames||'—';summary.title=eventNames;card.append(summary);fragment.append(card);});$('project-frames').replaceChildren(fragment);
  $('action-total-duration').textContent=`总时长 ${formatDuration(totalDurationMs(current))}`;
  renderFrameEvents(selected);
}
function renderFrameEvents(frame){
  const list=$('frame-event-list'),current=action();list.replaceChildren();
  $('add-frame-event').disabled=!frame;
  $('frame-event-context').textContent=frame?`帧 ${String(current.frames.findIndex(item=>item.id===frame.id)+1).padStart(3,'0')} · ${eventsAtFrame(current,frame.id).length} 个事件`:'选择一个启用帧';
  for(const event of current.events.filter(item=>item.frameId===frame?.id)){
    const item=document.createElement('div');item.className='frame-event-item';const type=document.createElement('span');type.textContent=event.type;const offset=document.createElement('small');offset.textContent=`+${((eventOffsetMs(current,frame.id)||0)/1000).toFixed(3)}s`;
    const edit=document.createElement('button');edit.type='button';edit.textContent='编辑';edit.onclick=()=>openEventEditor(frame,event);
    const remove=document.createElement('button');remove.type='button';remove.className='remove-event';remove.textContent='删除';remove.onclick=()=>{if(!confirm(`删除“${event.type}”事件？`))return;current.events=current.events.filter(value=>value.id!==event.id);setDirty();renderFrames();};item.append(type,offset,edit,remove);list.append(item);
  }
  if(!list.childElementCount){const empty=document.createElement('span');empty.className='matting-subtle';empty.textContent=frame?'该帧还没有事件':'—';list.append(empty);}
}
function activateFrame(index){const frames=enabledFrames();if(index<0||index>=frames.length)return;state.frame=index;const frame=frames[index];$('project-frame').src=`/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;$('project-position').textContent=`${index+1} / ${frames.length}`;for(const card of $('project-frames').children)card.classList.toggle('is-active',card.dataset.frameId===frame.id);renderFrameEvents(frame);schedulePreview();}
function clearEventLog(){state.eventLog=[];$('event-playback-log').textContent='播放触发记录';}
function recordFrameEvents(frame){const events=eventsAtFrame(action(),frame.id);if(!events.length)return;for(const event of events)state.eventLog.push(`${event.type} · ${(state.playbackElapsedMs/1000).toFixed(3)}s`);state.eventLog=state.eventLog.slice(-5);$('event-playback-log').textContent=`触发：${state.eventLog.join(' → ')}`;}
function schedulePlaybackStep(){
  const current=action(),frames=enabledFrames();if(!current||!frames.length)return;const frame=frames[state.frame];
  state.timer=setTimeout(()=>{const next=nextFrameIndex(current,state.frame);if(next.ended){stop();return;}state.playbackElapsedMs+=durationMs(current,frame);activateFrame(next.index);recordFrameEvents(frames[next.index]);schedulePlaybackStep();},durationMs(current,frame));
}
function togglePlayback(){
  if(state.timer){stop();return;}const frames=enabledFrames();if(!frames.length)return;state.playbackElapsedMs=0;clearEventLog();$('project-play').textContent='Ⅱ 暂停';recordFrameEvents(frames[state.frame]);schedulePlaybackStep();schedulePreview();
}
function toggleFrameEnabled(frame,checkbox){
  const current=action(),character=state.project.characters[0],events=eventsAtFrame(current,frame.id),isReference=current.anchor?.frameId===frame.id||character.baseline?.frameId===frame.id;
  if(!checkbox.checked){const details=[events.length?`${events.length}个事件`:null,isReference?'动作/角色基准引用':null].filter(Boolean).join('、');if(!confirm(`禁用此帧后播放将跳过它${details?`，并移除${details}`:''}。继续吗？`)){checkbox.checked=true;return;}
    if(events.length)current.events=current.events.filter(event=>event.frameId!==frame.id);if(current.anchor?.frameId===frame.id)current.anchor=null;if(character.baseline?.actionId===current.id&&character.baseline.frameId===frame.id)character.baseline=null;frame.enabled=false;
  }else{frame.enabled=true;if(current.playback.mode==='per-frame'&&!frame.duration)frame.duration=millisecondsToRational(100);}
  const activeId=enabledFrames()[state.frame]?.id;state.frame=Math.max(0,enabledFrames().findIndex(item=>item.id===activeId));setDirty();renderActions();renderAction();
}
function moveFrame(index,delta){const current=action(),next=index+delta;if(next<0||next>=current.frames.length)return;const activeId=enabledFrames()[state.frame]?.id;[current.frames[index],current.frames[next]]=[current.frames[next],current.frames[index]];state.frame=Math.max(0,enabledFrames().findIndex(frame=>frame.id===activeId));setDirty();renderFrames();}
function setFrameDuration(frame,input,final=false){
  try{if(input.value==='')throw new Error('帧时长不能为空。');frame.duration=millisecondsToRational(Number(input.value));setDirty();$('action-total-duration').textContent=`总时长 ${formatDuration(totalDurationMs(action()))}`;}
  catch(error){if(!final)return;message(error.message,true);input.value=frame.duration?String(secondsToMilliseconds(frame.duration)):'';}
}
function changePlaybackMode(){
  const current=action(),next=$('action-playback-mode').value;if(!current||next===current.playback.mode)return;
  if(next==='per-frame'){const fps=current.playback.fps;current.playback={mode:'per-frame'};for(const frame of current.frames)frame.duration=frame.enabled?fpsToRational(fps):null;}
  else{const total=totalDurationMs(current),frames=enabledFrames(current).length,estimate=Math.max(1,Math.min(60,Math.round(frames*1000/Math.max(1,total))));if(!confirm(`切换为固定帧率会把所有帧统一为约 ${estimate} fps，逐帧时长差异将丢失。继续吗？`)){$('action-playback-mode').value='per-frame';return;}current.playback={mode:'constant-fps',fps:estimate};for(const frame of current.frames)frame.duration=null;$('action-fps').value=estimate;}
  stop();setDirty();renderActions();renderAction();
}
function openEventEditor(frame,event=null){
  $('event-error').textContent='';$('frame-event-title').textContent=event?'编辑帧事件':'添加帧事件';$('event-type').value=event?.type||'';$('event-parameters').value=JSON.stringify(event?.parameters||{},null,2);$('event-frame-label').value=frame.id;$('frame-event-dialog').dataset.eventId=event?.id||'';$('frame-event-dialog').dataset.frameId=frame.id;$('frame-event-dialog').showModal();
}
function saveFrameEvent(){
  const current=action(),type=$('event-type').value.trim(),frameId=$('frame-event-dialog').dataset.frameId,id=$('frame-event-dialog').dataset.eventId;
  try{if(!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(type))throw new Error('事件类型需以小写字母或数字开头，只能包含小写字母、数字、点、下划线和短横线。');const parameters=JSON.parse($('event-parameters').value||'{}');if(!parameters||Array.isArray(parameters)||typeof parameters!=='object')throw new Error('事件参数必须是JSON对象。');
    if(id){const event=current.events.find(item=>item.id===id);event.type=type;event.parameters=parameters;event.frameId=frameId;}
    else current.events.push({id:`event-${crypto.randomUUID()}`,frameId,type,parameters});
    $('frame-event-dialog').close();setDirty();renderFrames();
  }catch(error){$('event-error').textContent=error instanceof SyntaxError?'事件参数JSON格式无效。':error.message;}
}
function mutateProject(){if(!state.project)return;state.project.name=$('project-name').value;state.project.characters[0].name=$('character-name').value;setDirty();}
function mutateAction(){const current=action();if(!current)return;const fps=Number($('action-fps').value);current.name=$('action-name').value;current.loop=$('action-loop').checked;if(current.playback.mode==='constant-fps'&&Number.isInteger(fps)&&fps>=1&&fps<=60)current.playback.fps=fps;setDirty();renderActions();$('action-total-duration').textContent=`总时长 ${formatDuration(totalDurationMs(current))}`;}
function newAction(){
  const form=$('action-dialog').querySelector('form');if(!form.reportValidity())return;
  const id=$('new-action-id').value.trim(),name=$('new-action-name').value.trim(),fps=Number($('new-action-fps').value);
  if(state.project.characters[0].actions.some(item=>item.id===id)){message('动作 ID 已存在',true);return;}
  state.project.characters[0].actions.push({id,name,revision:0,loop:true,playback:{mode:'constant-fps',fps},transform:{offset:{x:0,y:0},scale:{x:1,y:1},rotationDegrees:0},source:{kind:'image-sequence',sequenceId:id,declaredFps:fps},frames:[],events:[]});
  state.actionId=id;state.frame=0;setDirty();$('action-dialog').close();renderActions();renderAction();
}
async function save(){
  if(!state.project||!state.dirty)return;stop();message('正在保存…');$('save-project').disabled=true;
  try{state.project=await api(`/api/character-projects/${encodeURIComponent(state.project.id)}`,{method:'PUT',...json({expectedRevision:state.project.revision,project:state.project})});setDirty(false);message('已保存到本机项目');await refreshList();render();schedulePreview();return true;}
  catch(error){message(error.message,true);$('save-project').disabled=false;return false;}
}
async function exportCharacterProject(){
  if(!state.project)return;
  if(state.dirty&&!await save())return;
  const link=document.createElement('a');link.href=`/api/character-projects/${encodeURIComponent(state.project.id)}/export`;link.download=`${state.project.id}-character-assets.zip`;document.body.append(link);link.click();link.remove();
}

function calibrationCharacter(){return state.project?.characters[0]||null;}
function calibrationAction(id){return calibrationCharacter()?.actions.find(item=>item.id===id)||null;}
function frameById(owner,id){return owner?.frames.find(item=>item.id===id&&item.enabled)||null;}
function calibrationUrl(frame){return `/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;}
function setCalibrationStatus(text,error=false){$('calibration-status').textContent=text;$('calibration-status').dataset.error=String(error);}
function imageFor(frame){if(!frame)return Promise.resolve(null);const url=calibrationUrl(frame);if(calibrationImageCache.has(url))return calibrationImageCache.get(url);const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`帧 ${frame.id} 加载失败`));image.src=url;});calibrationImageCache.set(url,promise);return promise;}
function actionFrameOptions(owner,selectedId){const select=$('baseline-frame');select.replaceChildren();for(const frame of owner?.frames.filter(item=>item.enabled)||[])select.append(new Option(frame.id,frame.id));if(selectedId&&[...select.options].some(option=>option.value===selectedId))select.value=selectedId;}
function targetFrameOptions(selectedId){const select=$('target-frame');select.replaceChildren();for(const frame of action()?.frames.filter(item=>item.enabled)||[])select.append(new Option(frame.id,frame.id));if(selectedId&&[...select.options].some(option=>option.value===selectedId))select.value=selectedId;}
function selectedBaseFrame(){return frameById(calibrationAction(state.calibration?.baselineActionId),state.calibration?.baselineFrameId);}
function selectedTargetFrame(){return frameById(action(),state.calibration?.targetFrameId);}
function calibrationSize(){return {width:Number($('canvas-width').value)||512,height:Number($('canvas-height').value)||512};}
function openCalibration(){
  stop();const character=calibrationCharacter(),current=action();if(!current)return;
  if(!current.frames.some(frame=>frame.enabled)){setCalibrationStatus('当前动作没有可用帧，先加入动作帧。',true);return;}
  const baselineAction=calibrationAction(character.baseline?.actionId)||character.actions.find(item=>item.frames.some(frame=>frame.enabled))||current;
  const baselineFrame=frameById(baselineAction,character.baseline?.frameId)||baselineAction.frames.find(frame=>frame.enabled);
  const target=enabledFrames()[Math.min(state.frame,enabledFrames().length-1)];
  state.calibration={baselineActionId:baselineAction.id,baselineFrameId:baselineFrame?.id||'',targetFrameId:target?.id||'',mode:null,baseImage:null,targetImage:null};
  const actions=$('baseline-action');actions.replaceChildren(...character.actions.filter(item=>item.frames.some(frame=>frame.enabled)).map(item=>new Option(item.name,item.id)));actions.value=baselineAction.id;
  actionFrameOptions(baselineAction,baselineFrame?.id);targetFrameOptions(target?.id);
  const size=character.canvas||{width:512,height:512},origin=character.origin||{x:Math.round(size.width/2),y:Math.round(size.height*.86)};
  $('canvas-width').value=size.width;$('canvas-height').value=size.height;$('origin-x').value=origin.x;$('origin-y').value=origin.y;
  $('action-scale').value=current.transform.scale.x;$('action-offset-x').value=current.transform.offset.x;$('action-offset-y').value=current.transform.offset.y;
  $('calibration-context').textContent=`当前动作：${current.name} · 原点对齐后检查角色整体尺寸`;
  $('calibration-play').disabled=enabledFrames().length<2;
  $('calibration-dialog').showModal();setCalibrationStatus(character.baseline?'已载入角色基准。点击按钮后，在图上标记原点或锚点。':'先标记跑步基准帧的锚点，再设原点并建立角色基准。');
  loadCalibrationImages();
}
async function loadCalibrationImages(){const cal=state.calibration;if(!cal)return;const [base,target]=await Promise.all([imageFor(selectedBaseFrame()),imageFor(selectedTargetFrame())]).catch(error=>{setCalibrationStatus(error.message,true);return [null,null];});if(state.calibration!==cal)return;cal.baseImage=base;cal.targetImage=target;drawCalibration();}
function drawCalibration(){
  const cal=state.calibration;if(!cal||!$('calibration-dialog').open)return;
  const size=calibrationSize(),stage=$('calibration-stage'),canvas=$('calibration-canvas'),rect=stage.getBoundingClientRect(),fit=Math.min((rect.width-24)/size.width,(rect.height-24)/size.height);
  if(!(fit>0))return;canvas.width=size.width;canvas.height=size.height;canvas.style.width=`${size.width*fit}px`;canvas.style.height=`${size.height*fit}px`;
  const context=canvas.getContext('2d');context.clearRect(0,0,size.width,size.height);
  const character=calibrationCharacter(),origin=character.origin||{x:Math.round(size.width/2),y:Math.round(size.height*.86)};
  const baseAction=calibrationAction(cal.baselineActionId),targetAction=action();
  const draw=(image,owner,anchor,alpha)=>{if(!image||!owner)return null;const placement=actionPlacement({imageWidth:image.naturalWidth,imageHeight:image.naturalHeight,canvasWidth:size.width,canvasHeight:size.height,origin,characterScale:character.scale,transform:owner.transform,anchor:anchor||{x:.5,y:.9}});context.save();context.globalAlpha=alpha;context.translate(placement.pivotX,placement.pivotY);context.rotate(placement.rotationDegrees*Math.PI/180);context.drawImage(image,-placement.anchor.x*placement.width,-placement.anchor.y*placement.height,placement.width,placement.height);context.restore();return placement;};
  const baseFrame=selectedBaseFrame(),targetFrame=selectedTargetFrame();
  const baseAnchor=baseAction?.anchor?.frameId===baseFrame?.id?baseAction.anchor:null;
  const targetAnchor=targetAction?.anchor?.frameId===targetFrame?.id?targetAction.anchor:null;
  const basePlacement=draw(cal.baseImage,baseAction,baseAnchor,.34),targetPlacement=draw(cal.targetImage,targetAction,targetAnchor,1);
  context.save();context.strokeStyle='#ff6b52';context.lineWidth=Math.max(1,size.width/400);context.beginPath();context.moveTo(origin.x-12,origin.y);context.lineTo(origin.x+12,origin.y);context.moveTo(origin.x,origin.y-12);context.lineTo(origin.x,origin.y+12);context.stroke();context.restore();
  cal.basePlacement=basePlacement;cal.targetPlacement=targetPlacement;cal.canvasRect=canvas.getBoundingClientRect();
}
function markMode(mode){if(!state.calibration)return;state.calibration.mode=mode;setCalibrationStatus(({origin:'点击画布设置角色共享原点。',baseline:'点击绿色基准帧上的稳定身体点（如脚底中心）。',target:'点击当前动作帧上对应的身体点。'})[mode]);}
function handleCalibrationClick(event){const cal=state.calibration;if(!cal)return;const size=calibrationSize(),canvas=$('calibration-canvas'),rect=canvas.getBoundingClientRect(),cx=event.clientX,cy=event.clientY;
  if(cal.mode==='origin'){const point={x:Math.max(0,Math.min(size.width,Math.round((cx-rect.left)*size.width/rect.width))),y:Math.max(0,Math.min(size.height,Math.round((cy-rect.top)*size.height/rect.height)))};$('origin-x').value=point.x;$('origin-y').value=point.y;calibrationOriginChanged();cal.mode=null;drawCalibration();setCalibrationStatus(`共享原点：${point.x}, ${point.y}`);return;}
  const base=cal.basePlacement,target=cal.targetPlacement;
  if(cal.mode==='baseline'&&base){const point=pointOnImage({clientX:cx,clientY:cy,rect,placement:base,canvasWidth:size.width,canvasHeight:size.height});if(!point){setCalibrationStatus('请点在绿色基准角色图像上。',true);return;}const owner=calibrationAction(cal.baselineActionId);owner.anchor={frameId:cal.baselineFrameId,x:point.x,y:point.y};setDirty();cal.mode=null;drawCalibration();setCalibrationStatus('基准锚点已标记。');return;}
  if(cal.mode==='target'&&target){const point=pointOnImage({clientX:cx,clientY:cy,rect,placement:target,canvasWidth:size.width,canvasHeight:size.height});if(!point){setCalibrationStatus('请点在当前动作角色图像上。',true);return;}action().anchor={frameId:cal.targetFrameId,x:point.x,y:point.y};setDirty();cal.mode=null;drawCalibration();setCalibrationStatus('当前动作锚点已标记。');return;}
  if(cal.mode)setCalibrationStatus('所选帧还未加载，或点击位置不在图像内。',true);
}
function updateCalibrationTransform(){const current=action();if(!current)return;const scale=Number($('action-scale').value),x=Number($('action-offset-x').value),y=Number($('action-offset-y').value);if(!Number.isFinite(scale)||scale<=0||scale>20||![x,y].every(Number.isFinite)){setCalibrationStatus('比例需大于0且不超过20，偏移需为有效数字。',true);return;}current.transform.scale={x:scale,y:scale};current.transform.offset={x:Math.round(x),y:Math.round(y)};setDirty();drawCalibration();renderActions();}
function setBaseline(){const character=calibrationCharacter(),base=calibrationAction(state.calibration.baselineActionId),frame=selectedBaseFrame();if(!character.canvas||!character.origin){setCalibrationStatus('先设置共享画布和原点。',true);return;}if(!base?.anchor||base.anchor.frameId!==frame?.id){setCalibrationStatus('先在所选基准帧上标记锚点。',true);return;}character.baseline={actionId:base.id,frameId:frame.id};base.transform={...base.transform,offset:{x:0,y:0},scale:{x:1,y:1},rotationDegrees:0};setDirty();$('action-scale').value=action()?.transform.scale.x??1;$('action-offset-x').value=action()?.transform.offset.x??0;$('action-offset-y').value=action()?.transform.offset.y??0;drawCalibration();setCalibrationStatus(`“${base.name}”第 ${frame.id} 帧已设为角色基准。`);}
function scheduleCalibrationPlayback(){const current=action(),frames=enabledFrames();if(!state.calibrationTimer||!frames.length)return;const index=frames.findIndex(frame=>frame.id===state.calibration.targetFrameId),frame=frames[Math.max(0,index)];state.calibrationTimer=setTimeout(()=>{const next=nextFrameIndex(current,Math.max(0,index));if(next.ended){state.calibrationTimer=0;$('calibration-play').textContent='▷ 播放当前动作';schedulePreview();return;}state.calibration.targetFrameId=frames[next.index].id;$('target-frame').value=state.calibration.targetFrameId;loadCalibrationImages();scheduleCalibrationPlayback();},durationMs(current,frame));}
function toggleCalibrationPlayback(){if(state.calibrationTimer){clearTimeout(state.calibrationTimer);state.calibrationTimer=0;$('calibration-play').textContent='▷ 播放当前动作';schedulePreview();return;}const frames=enabledFrames();if(frames.length<2)return;$('calibration-play').textContent='Ⅱ 暂停';state.calibrationTimer=-1;scheduleCalibrationPlayback();schedulePreview();}
function calibrationCanvasChanged(){const character=calibrationCharacter(),width=Number($('canvas-width').value),height=Number($('canvas-height').value);if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>16000000){setCalibrationStatus('画布尺寸无效：单边不超过8192，面积不超过1600万像素。',true);return;}character.canvas={width,height};character.origin=character.origin||{x:Math.round(width/2),y:Math.round(height*.86)};character.origin.x=Math.min(width,character.origin.x);character.origin.y=Math.min(height,character.origin.y);$('origin-x').value=character.origin.x;$('origin-y').value=character.origin.y;setDirty();drawCalibration();}
function calibrationOriginChanged(){const size=calibrationSize(),x=Number($('origin-x').value),y=Number($('origin-y').value);if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>size.width||y>size.height){setCalibrationStatus('原点必须位于共享画布范围内。',true);return;}const character=calibrationCharacter();character.canvas=size;character.origin={x,y};setDirty();drawCalibration();}
async function createProject(){
  const form=$('create-project-dialog').querySelector('form');if(!form.reportValidity())return;
  const payload={id:$('create-project-id').value.trim(),name:$('create-project-name').value.trim(),characterId:$('create-character-id').value.trim(),characterName:$('create-character-name').value.trim()};
  try{state.project=await api('/api/character-projects',{method:'POST',...json(payload)});state.actionId=null;setDirty(false);$('create-project-dialog').close();await refreshList();render();}
  catch(error){message(error.message,true);}
}
function moveAction(delta){const actions=state.project.characters[0].actions,current=action(),index=actions.indexOf(current),next=index+delta;if(index<0||next<0||next>=actions.length)return;[actions[index],actions[next]]=[actions[next],actions[index]];setDirty();renderActions();renderAction();}
async function deleteProject(summary){
  const unsaved=state.project?.id===summary.id&&state.dirty?'\n当前未保存修改也会一起丢失。':'';
  if(!confirm(`确定删除项目“${summary.name||summary.id}”？\n项目中的全部动作和素材都会被永久删除。${unsaved}`))return;
  try{
    await api(`/api/character-projects/${encodeURIComponent(summary.id)}`,{method:'DELETE',...json({expectedRevision:summary.revision})});
    if(state.project?.id===summary.id){stop();clearInterval(state.previewStatusTimer);state.preview=null;state.project=null;state.actionId=null;state.frame=0;state.dirty=false;render();}
    await refreshList();message(`项目“${summary.name||summary.id}”已删除`);
  }catch(error){message(error.message,true);}
}
function deleteAction(){
  const current=action();if(!current)return;const migrations=state.project.migrations.filter(record=>record.actionId===current.id);
  const detail=migrations.length?'\n该动作的迁入来源记录也会一并移除。':'';
  if(!confirm(`确定删除动作“${current.name}”？\n动作中的全部帧和事件将从项目中移除。${detail}`))return;
  const character=state.project.characters[0],actions=character.actions,index=actions.indexOf(current);if(character.baseline?.actionId===current.id)character.baseline=null;actions.splice(index,1);state.project.migrations=state.project.migrations.filter(record=>record.actionId!==current.id);state.actionId=actions[Math.min(index,actions.length-1)]?.id||null;state.frame=0;setDirty();renderActions();renderAction();
}

function fillMigrationProjects(){const select=$('migration-project'),value=select.value;select.replaceChildren(new Option('新建项目',''));for(const item of state.summaries.filter(item=>item.status==='ready'))select.append(new Option(item.name,item.id));select.value=state.summaries.some(item=>item.id===value)?value:'';}
async function selectMigrationProject(){const id=$('migration-project').value;if(!id){for(const field of ['migration-project-id','migration-project-name'])$(field).disabled=false;return;}
  try{const project=await api(`/api/character-projects/${encodeURIComponent(id)}`),character=project.characters[0];$('migration-project-id').value=project.id;$('migration-project-name').value=project.name;$('migration-character-id').value=character.id;$('migration-character-name').value=character.name;for(const field of ['migration-project-id','migration-project-name','migration-character-id','migration-character-name'])$(field).disabled=true;}
  catch(error){$('migration-error').textContent=error.message;}
}
async function migrate(){
  const form=$('migration-dialog').querySelector('form');if(!form.reportValidity())return;$('migration-error').textContent='';$('confirm-migration').disabled=true;
  const payload={projectId:$('migration-project-id').value.trim(),projectName:$('migration-project-name').value.trim(),characterId:$('migration-character-id').value.trim(),characterName:$('migration-character-name').value.trim(),actionId:$('migration-action-id').value.trim(),actionName:$('migration-action-name').value.trim(),fps:Number($('migration-fps').value)};
  try{const result=await api(`/api/matting-batches/${encodeURIComponent(state.batch)}/migrate`,{method:'POST',...json(payload)});state.project=result.project;state.actionId=result.actionId;state.frame=0;setDirty(false);$('migration-dialog').close();history.replaceState(null,'','/projects');state.batch=null;await refreshList();render();message(result.status==='already-imported'?'这个动作已经在项目里':'动作已加入角色项目');}
  catch(error){$('migration-error').textContent=error.message;}
  finally{$('confirm-migration').disabled=false;}
}

$('new-project').onclick=$('empty-create').onclick=()=>{$('create-project-dialog').showModal();};$('confirm-create').onclick=event=>{event.preventDefault();createProject();};
$('add-action').onclick=$('empty-add-action').onclick=()=>{if(!state.project)return;$('new-action-id').value='';$('new-action-name').value='';$('new-action-fps').value='12';$('action-dialog').showModal();};$('confirm-action').onclick=event=>{event.preventDefault();newAction();};
$('project-name').oninput=$('character-name').oninput=mutateProject;$('action-name').oninput=$('action-fps').oninput=$('action-loop').oninput=mutateAction;
$('save-project').onclick=save;$('export-character-project').onclick=exportCharacterProject;$('action-up').onclick=()=>moveAction(-1);$('action-down').onclick=()=>moveAction(1);$('delete-action').onclick=deleteAction;
$('open-calibration').onclick=openCalibration;$('close-calibration').onclick=()=>$('calibration-dialog').close();$('calibration-dialog').addEventListener('click',event=>{if(event.target===$('calibration-dialog'))$('calibration-dialog').close();});
$('baseline-action').onchange=()=>{const owner=calibrationAction($('baseline-action').value);state.calibration.baselineActionId=owner.id;state.calibration.baselineFrameId=owner.frames.find(frame=>frame.enabled)?.id||'';actionFrameOptions(owner,state.calibration.baselineFrameId);loadCalibrationImages();};
$('baseline-frame').onchange=()=>{state.calibration.baselineFrameId=$('baseline-frame').value;loadCalibrationImages();};
$('target-frame').onchange=()=>{const frames=enabledFrames();state.calibration.targetFrameId=$('target-frame').value;state.frame=Math.max(0,frames.findIndex(frame=>frame.id===state.calibration.targetFrameId));renderFrames();loadCalibrationImages();schedulePreview();};
$('canvas-width').onchange=$('canvas-height').onchange=calibrationCanvasChanged;
$('origin-x').onchange=$('origin-y').onchange=calibrationOriginChanged;
$('set-origin-mode').onclick=()=>markMode('origin');$('set-baseline-anchor-mode').onclick=()=>markMode('baseline');$('set-target-anchor-mode').onclick=()=>markMode('target');$('confirm-baseline').onclick=setBaseline;
$('action-scale').onchange=$('action-offset-x').onchange=$('action-offset-y').onchange=updateCalibrationTransform;
$('calibration-play').onclick=toggleCalibrationPlayback;
$('calibration-canvas').onclick=handleCalibrationClick;$('save-calibration').onclick=async()=>{if(await save())$('calibration-dialog').close();};
$('calibration-dialog').addEventListener('close',()=>{stop();state.calibration=null;});
$('calibration-dialog').addEventListener('transitionend',drawCalibration);window.addEventListener('resize',drawCalibration);
$('project-prev').onclick=()=>{stop();const frames=enabledFrames();if(frames.length)activateFrame((state.frame-1+frames.length)%frames.length);};$('project-next').onclick=()=>{stop();const frames=enabledFrames();if(frames.length)activateFrame((state.frame+1)%frames.length);};$('project-play').onclick=togglePlayback;
$('action-playback-mode').onchange=changePlaybackMode;$('add-frame-event').onclick=()=>{const frame=enabledFrames()[state.frame];if(frame)openEventEditor(frame);};$('confirm-frame-event').onclick=event=>{event.preventDefault();saveFrameEvent();};
$('godot-preview').onclick=createGodotPreviewSession;
$('copy-preview-url').onclick=()=>copyValue('preview-websocket-url');$('copy-preview-token').onclick=()=>copyValue('preview-token');

async function createGodotPreviewSession(){
  if(!state.project)return;
  try{
    const session=await api(`/api/character-projects/${encodeURIComponent(state.project.id)}/preview-sessions`,{method:'POST'});
    state.preview={...session,revision:0};$('preview-websocket-url').value=session.websocketUrl;$('preview-token').value=session.token;
    $('godot-preview-dialog').showModal();startPreviewStatusPolling();schedulePreview();
  }catch(error){message(error.message,true);}
}
function copyValue(id){const input=$(id);input.focus();input.select();navigator.clipboard?.writeText(input.value).then(()=>message('已复制')).catch(()=>message('已选中内容，请复制'));}
function activePreviewFrame(){if(state.calibration?.targetFrameId)return state.calibration.targetFrameId;const frames=enabledFrames();return frames[state.frame]?.id||'';}
function schedulePreview(){if(!state.preview||!state.project)return;clearTimeout(state.previewTimer);state.previewTimer=setTimeout(()=>{state.previewQueue=state.previewQueue.then(publishPreview).catch(error=>message(`Godot 预览未同步：${error.message}`,true));},100);}
async function publishPreview(){
  const current=action(),frameId=activePreviewFrame();if(!current||!frameId)return;
  const response=await fetch(`/api/preview-sessions/${state.preview.sessionId}/snapshot`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${state.preview.token}`},body:JSON.stringify({project:state.project,activeCharacterId:state.project.characters[0].id,activeActionId:current.id,activeFrameId:frameId,playing:Boolean(state.timer||state.calibrationTimer)})});
  if(!response.ok){const body=await response.json().catch(()=>({}));const detail=typeof body.detail==='string'?body.detail:Array.isArray(body.detail)?body.detail.map(item=>item.msg).join('；'):'项目有未保存的动作或帧结构变化，请先保存';throw new Error(detail);}
  const result=await response.json();state.preview.revision=result.revision;
}
function startPreviewStatusPolling(){clearInterval(state.previewStatusTimer);state.previewStatusTimer=setInterval(async()=>{
  if(!state.preview)return;
  try{const response=await fetch(`/api/preview-sessions/${state.preview.sessionId}`,{headers:{'Authorization':`Bearer ${state.preview.token}`}});if(!response.ok)return;const info=await response.json();const labels={'waiting-connection':'等待 Godot 连接','waiting-snapshot':'等待同步','waiting-ack':'正在加载帧','synced':`已同步 · r${info.acknowledgedRevision}`};$('project-state').textContent=state.dirty?'有未保存修改':(labels[info.status]||'预览连接中');}
  catch{}
},700);}
$('migration-project').onchange=()=>{for(const field of ['migration-project-id','migration-project-name','migration-character-id','migration-character-name'])$(field).disabled=false;selectMigrationProject();};$('confirm-migration').onclick=event=>{event.preventDefault();migrate();};
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});

try{await refreshList();if(state.batch){fillMigrationProjects();$('migration-dialog').showModal();}else if(state.summaries.find(item=>item.status==='ready'))await openProject(state.summaries.find(item=>item.status==='ready').id);}catch(error){message(error.message,true);}

const $=id=>document.getElementById(id);
const state={summaries:[],project:null,actionId:null,dirty:false,frame:0,timer:0,batch:new URLSearchParams(location.search).get('batch')};

async function api(url,options){
  const response=await fetch(url,options);
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(typeof body.detail==='string'?body.detail:'请求失败');}
  return response.json();
}
const json=value=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
const action=()=>state.project?.characters[0].actions.find(item=>item.id===state.actionId)||null;
function message(text,error=false){$('project-message').textContent=error?'':text;$('project-error').textContent=error?text:'';}
function setDirty(value=true){state.dirty=value;$('save-project').disabled=!value||!state.project;$('project-state').textContent=value?'有未保存修改':'已保存';}
function stop(){clearInterval(state.timer);state.timer=0;$('project-play').textContent='▷ 播放';}
function safeSwitch(){if(!state.dirty)return true;return confirm('当前项目有未保存修改，放弃后切换吗？');}

async function refreshList(){
  const data=await api('/api/character-projects');state.summaries=data.projects;
  const fragment=document.createDocumentFragment();
  for(const project of state.summaries){
    const button=document.createElement('button');button.type='button';button.className='project-card';button.dataset.id=project.id;
    const name=document.createElement('strong');name.textContent=project.name||project.id;
    const meta=document.createElement('span');meta.textContent=project.status==='ready'?`${project.actionCount} 个动作 · r${project.revision}`:'项目清单无效';
    button.append(name,meta);button.disabled=project.status!=='ready';button.onclick=()=>openProject(project.id);fragment.append(button);
  }
  $('project-list').replaceChildren(fragment);
  highlightProject();fillMigrationProjects();
}
function highlightProject(){for(const card of $('project-list').children)card.classList.toggle('is-active',card.dataset.id===state.project?.id);}
async function openProject(id){
  if(state.project?.id===id)return;if(!safeSwitch())return;
  stop();message('');
  try{state.project=await api(`/api/character-projects/${encodeURIComponent(id)}`);state.actionId=state.project.characters[0].actions[0]?.id||null;state.frame=0;setDirty(false);render();}
  catch(error){message(error.message,true);}
}
function render(){
  const project=state.project;$('project-empty').hidden=!!project;$('project-editor').hidden=!project;highlightProject();if(!project)return;
  $('project-name').value=project.name;$('character-name').value=project.characters[0].name;$('project-revision').textContent=`修订 ${project.revision}`;
  renderActions();renderAction();
}
function renderActions(){
  const actions=state.project.characters[0].actions;$('action-count').textContent=`${actions.length}`;
  const fragment=document.createDocumentFragment();
  actions.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='action-card';button.dataset.id=item.id;
    const name=document.createElement('strong');name.textContent=item.name;const meta=document.createElement('span');meta.textContent=`${item.frames.filter(frame=>frame.enabled).length} 帧 · ${item.playback.fps} fps`;
    button.append(name,meta);button.classList.toggle('is-active',item.id===state.actionId);button.onclick=()=>{stop();state.actionId=item.id;state.frame=0;renderActions();renderAction();};fragment.append(button);});
  $('action-list').replaceChildren(fragment);
}
function renderAction(){
  const current=action(),actions=state.project.characters[0].actions;$('action-empty').hidden=!!current;$('action-editor').hidden=!current;if(!current)return;
  const index=actions.indexOf(current),imported=state.project.migrations.some(record=>record.actionId===current.id);
  $('action-id').textContent=current.id;$('action-name').value=current.name;$('action-fps').value=current.playback.fps;$('action-loop').checked=current.loop;
  $('action-source').textContent=imported?'旧结果迁入':'项目内动作';$('action-up').disabled=index===0;$('action-down').disabled=index===actions.length-1;
  $('delete-action').disabled=imported;$('delete-action').title=imported?'迁入动作需保留来源记录':'';
  renderFrames();
}
function enabledFrames(){return action()?.frames.filter(frame=>frame.enabled)||[];}
function renderFrames(){
  const frames=enabledFrames();if(state.frame>=frames.length)state.frame=Math.max(0,frames.length-1);
  $('project-frame-empty').hidden=!!frames.length;$('project-frame').hidden=!frames.length;
  for(const id of ['project-prev','project-next','project-play'])$(id).disabled=!frames.length;
  if(frames.length){const frame=frames[state.frame];$('project-frame').src=`/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;$('project-position').textContent=`${state.frame+1} / ${frames.length}`;}
  else $('project-position').textContent='0 / 0';
  const fragment=document.createDocumentFragment();frames.forEach((frame,index)=>{const button=document.createElement('button');button.type='button';button.className='project-frame-card';button.classList.toggle('is-active',index===state.frame);
    const image=document.createElement('img');image.src=`/api/character-projects/${encodeURIComponent(state.project.id)}/frames/${encodeURIComponent(frame.id)}?r=${frame.revision}`;image.alt=`第${index+1}帧`;image.loading='lazy';
    const label=document.createElement('span');label.textContent=String(index+1).padStart(3,'0');button.append(image,label);button.onclick=()=>{stop();state.frame=index;renderFrames();};fragment.append(button);});$('project-frames').replaceChildren(fragment);
}
function mutateProject(){if(!state.project)return;state.project.name=$('project-name').value;state.project.characters[0].name=$('character-name').value;setDirty();}
function mutateAction(){const current=action();if(!current)return;const fps=Number($('action-fps').value);current.name=$('action-name').value;current.loop=$('action-loop').checked;if(Number.isInteger(fps)&&fps>=1&&fps<=60){current.playback.fps=fps;if(current.source.kind==='image-sequence')current.source.declaredFps=fps;}setDirty();renderActions();}
function newAction(){
  const form=$('action-dialog').querySelector('form');if(!form.reportValidity())return;
  const id=$('new-action-id').value.trim(),name=$('new-action-name').value.trim(),fps=Number($('new-action-fps').value);
  if(state.project.characters[0].actions.some(item=>item.id===id)){message('动作 ID 已存在',true);return;}
  state.project.characters[0].actions.push({id,name,revision:0,loop:true,playback:{mode:'constant-fps',fps},transform:{offset:{x:0,y:0},scale:{x:1,y:1},rotationDegrees:0},source:{kind:'image-sequence',sequenceId:id,declaredFps:fps},frames:[],events:[]});
  state.actionId=id;state.frame=0;setDirty();$('action-dialog').close();renderActions();renderAction();
}
async function save(){
  if(!state.project||!state.dirty)return;stop();message('正在保存…');$('save-project').disabled=true;
  try{state.project=await api(`/api/character-projects/${encodeURIComponent(state.project.id)}`,{method:'PUT',...json({expectedRevision:state.project.revision,project:state.project})});setDirty(false);message('已保存到本机项目');await refreshList();render();}
  catch(error){message(error.message,true);$('save-project').disabled=false;}
}
async function createProject(){
  const form=$('create-project-dialog').querySelector('form');if(!form.reportValidity())return;
  const payload={id:$('create-project-id').value.trim(),name:$('create-project-name').value.trim(),characterId:$('create-character-id').value.trim(),characterName:$('create-character-name').value.trim()};
  try{state.project=await api('/api/character-projects',{method:'POST',...json(payload)});state.actionId=null;setDirty(false);$('create-project-dialog').close();await refreshList();render();}
  catch(error){message(error.message,true);}
}
function moveAction(delta){const actions=state.project.characters[0].actions,current=action(),index=actions.indexOf(current),next=index+delta;if(index<0||next<0||next>=actions.length)return;[actions[index],actions[next]]=[actions[next],actions[index]];setDirty();renderActions();renderAction();}
function deleteAction(){const current=action();if(!current||state.project.migrations.some(record=>record.actionId===current.id)||!confirm(`删除动作“${current.name}”？`))return;const actions=state.project.characters[0].actions,index=actions.indexOf(current);actions.splice(index,1);state.actionId=actions[Math.min(index,actions.length-1)]?.id||null;setDirty();renderActions();renderAction();}

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
$('save-project').onclick=save;$('action-up').onclick=()=>moveAction(-1);$('action-down').onclick=()=>moveAction(1);$('delete-action').onclick=deleteAction;
$('project-prev').onclick=()=>{stop();const frames=enabledFrames();if(frames.length){state.frame=(state.frame-1+frames.length)%frames.length;renderFrames();}};$('project-next').onclick=()=>{stop();const frames=enabledFrames();if(frames.length){state.frame=(state.frame+1)%frames.length;renderFrames();}};
$('project-play').onclick=()=>{if(state.timer){stop();return;}const frames=enabledFrames();if(!frames.length)return;$('project-play').textContent='Ⅱ 暂停';state.timer=setInterval(()=>{state.frame=(state.frame+1)%frames.length;renderFrames();},1000/action().playback.fps);};
$('migration-project').onchange=()=>{for(const field of ['migration-project-id','migration-project-name','migration-character-id','migration-character-name'])$(field).disabled=false;selectMigrationProject();};$('confirm-migration').onclick=event=>{event.preventDefault();migrate();};
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});

try{await refreshList();if(state.batch){fillMigrationProjects();$('migration-dialog').showModal();}else if(state.summaries.find(item=>item.status==='ready'))await openProject(state.summaries.find(item=>item.status==='ready').id);}catch(error){message(error.message,true);}

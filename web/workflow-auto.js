import {NODE_AUTO_FIELDS,nodeAutoPresetKey,defaultNodeAutoPreset,validateNodeAutoPreset,chooseAutoLoop} from './workflow-auto-core.js';
import {bindLoopCandidates,selectLoopCandidate} from './loop-core.js';
import {organizerDraft,recordOrganizerSelection} from './workflow-organizer.js';
export function workerTask(url,payload,signal,onProgress=()=>{}){
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('已取消'));return;}
    const worker=new Worker(new URL(url,import.meta.url),{type:'module'});
    const finish=(error,value)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
    const abort=()=>finish(new Error('已取消')),timer=setTimeout(()=>finish(new Error('分析或清理超过45秒')),45000);
    signal.addEventListener('abort',abort,{once:true});worker.onerror=event=>{event.preventDefault();finish(new Error('自动处理线程失败'));};
    worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data.message);else if(data.error||data.type==='error')finish(new Error(data.error||data.message));else finish(null,data);};
    worker.postMessage(payload);
  });
}
export async function selectAutomaticLoop(input,editor,preset,signal,onProgress){
  if(preset.loop!=='all'){
    const byId=new Map(input.frames.map(frame=>[frame.id,frame]));
    const result=await workerTask('./loop-worker.js',{blobs:editor.order.map(id=>byId.get(id).blob)},signal,onProgress);
    const candidate=chooseAutoLoop(bindLoopCandidates(editor.order,editor.revision,result.candidates),preset.loop),before=editor.snapshot();
    if(candidate)selectLoopCandidate(editor,candidate);
    else{editor.selectAll();onProgress('未找到可靠循环，已全选所有帧，继续处理');}
    recordOrganizerSelection(editor,before);
  }else{const before=editor.snapshot();editor.selectAll();recordOrganizerSelection(editor,before);}
  return organizerDraft(editor);
}
export function createAutoControls({check,execute,notify,nodeContext,onChange=()=>{}}){
  // 表单仅作为右栏模板，不创建第二个预设弹窗。
  const presetTemplate=document.createElement('div');
presetTemplate.innerHTML='<form><header class="workflow-dialog-head"><h2>自动执行预设</h2></header><div class="auto-fields"><label>开始（秒）<input name="startSeconds" type="number" min="0" step="any" required></label><label>结束（秒）<input name="endSeconds" type="number" min="0" step="any" placeholder="视频末尾"></label><label>采样（帧/秒）<input name="fps" type="number" min="1" max="60" required></label><label>循环选帧<select name="loop"><option value="shortest">最少帧可靠循环</option><option value="best">匹配最佳循环</option><option value="all">全部帧</option></select></label><label class="auto-check"><input name="cleanup" type="checkbox">按背景色自动清理</label><label>背景来源<select name="background"><option value="auto">自动识别边缘</option><option value="color">指定颜色</option></select></label><label>背景色<input name="color" type="color"></label><label>容差<input name="tolerance" type="number" min="0" max="255" required></label><label class="auto-check"><input name="smooth" type="checkbox">边缘平滑</label></div><p data-error role="alert"></p><footer class="workflow-dialog-actions"><button type="button" class="quiet-button" data-reset>默认值</button><button class="solid-button" type="submit">保存预设</button></footer></form>';
  const progress=document.createElement('section');progress.className='auto-execution-progress';progress.hidden=true;progress.innerHTML='<span role="status"></span><button class="quiet-button">取消执行</button>';
  const confirmation=document.createElement('dialog');confirmation.className='workflow-dialog';confirmation.setAttribute('aria-label','覆盖已有编辑');confirmation.innerHTML='<form method="dialog"><header class="workflow-dialog-head"><h2>覆盖已有编辑？</h2></header><p>自动执行将重新勾选循环，并更新透明背景结果；已有人工整理或精修可能被替换。</p><footer class="workflow-dialog-actions"><button class="quiet-button" value="cancel" autofocus>取消</button><button class="solid-button" value="confirm">继续执行</button></footer></form>';
  document.body.append(confirmation);document.getElementById('inspector').append(progress);let controller=null,activeNodeId=null,statusText='';
  const formTemplate=presetTemplate.querySelector('form').cloneNode(true);
  function load(id){const {projectId,node}=nodeContext(id),raw=localStorage.getItem(nodeAutoPresetKey(projectId,id));return raw===null?defaultNodeAutoPreset(node):validateNodeAutoPreset(node.type,JSON.parse(raw));}
  function fill(form,value){for(const [key,v] of Object.entries(value)){const field=form.elements.namedItem(key);if(field.type==='checkbox')field.checked=v;else field.value=v??'';}}
  function prepare(form,id){
    const {node}=nodeContext(id),keys=NODE_AUTO_FIELDS[node.type];
    if(!keys)throw new Error('此节点没有执行预设');
    for(const key of Object.keys(NODE_AUTO_FIELDS).flatMap(type=>NODE_AUTO_FIELDS[type])){const input=form.elements.namedItem(key);input.disabled=!!controller||!keys.includes(key);input.closest('label').style.display=keys.includes(key)?'':'none';}
    form.querySelector('h2').textContent='自动执行预设';
    const error=form.querySelector('[data-error]');error.textContent='';
    try{fill(form,load(id));}catch(reason){error.textContent=reason.message;}
    form.classList.toggle('is-matting-preset',node.type==='remove-background');
    // 清理选项按使用顺序单列展示；自动识别无需手动背景色。
    const updateCleanupFields=()=>{
      if(node.type!=='remove-background')return;
      for(const key of ['background','color','tolerance','smooth']){
        const visible=form.elements.cleanup.checked&&(key!=='color'||form.elements.background.value==='color');
        form.elements.namedItem(key).closest('label').style.display=visible?'':'none';
      }
    };
    form.elements.cleanup.onchange=updateCleanupFields;form.elements.background.onchange=updateCleanupFields;updateCleanupFields();
    form.querySelector('[data-reset]').disabled=!!controller;
    form.querySelector('[data-reset]').onclick=()=>{error.textContent='';fill(form,defaultNodeAutoPreset(node));updateCleanupFields();};
    form.querySelector('[type=submit]').disabled=!!controller;
    form.onsubmit=event=>{event.preventDefault();if(controller)return;try{
      const {projectId,node:current}=nodeContext(id),value={};
      for(const key of keys){const field=form.elements.namedItem(key);value[key]=field.type==='checkbox'?field.checked:field.type==='number'?(field.value===''?null:field.valueAsNumber):field.value;}
      localStorage.setItem(nodeAutoPresetKey(projectId,id),JSON.stringify(validateNodeAutoPreset(current.type,value)));
      notify('当前节点预设已保存');onChange();
    }catch(reason){error.textContent=reason.message;}};
  }
  progress.querySelector('button').onclick=()=>controller?.abort();
  return {get busy(){return !!controller;},get activeNodeId(){return activeNodeId;},get status(){return statusText;},
    inspector(node,parent){if(!NODE_AUTO_FIELDS[node.type])return;const form=formTemplate.cloneNode(true);form.className='node-auto-preset';prepare(form,node.id);parent.append(form);},
    async run(id){
    if(controller)return;let presets,info;
    const snapshot=plan=>new Map(plan.nodes.filter(node=>NODE_AUTO_FIELDS[node.type]).map(node=>[node.id,load(node.id)]));
    try{info=check(id);presets=snapshot(info);}catch(reason){notify(reason.message);return;}
    if(info.overwrite){confirmation.returnValue='';confirmation.showModal();await new Promise(resolve=>confirmation.addEventListener('close',resolve,{once:true}));if(confirmation.returnValue!=='confirm')return;}
    if(controller)return;controller=new AbortController();activeNodeId=id;progress.hidden=false;progress.querySelector('button').textContent='取消执行';progress.querySelector('button').onclick=()=>controller?.abort();onChange();
    const status=(message,currentId)=>{statusText=message;if(currentId)activeNodeId=currentId;progress.querySelector('span').textContent=message;onChange();};
    try{info=check(id);presets=snapshot(info);const message=await execute(id,presets,controller.signal,status);status(message);notify(message);}
    catch(reason){status(reason.message);notify(reason.message);}
    finally{controller=null;activeNodeId=null;onChange();progress.querySelector('button').textContent='关闭';progress.querySelector('button').onclick=()=>{progress.hidden=true;};}
  }};
}

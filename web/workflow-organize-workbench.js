import {icons} from './icons-data.js';
import {framePlayer} from './workflow-extract-workbench.js';
import {createOrganizerEditor,organizerDraft,restoreOrganizerFrame,organizerOutputSignature,recordOrganizerSelection} from './workflow-organizer.js';
import {createWorkflowLoopDialog} from './workflow-loop-dialog.js';
import {createTimelineThumbnails} from './workflow-timeline-thumbnails.js';

export function createOrganizeWorkbench({context,load,save,publish,notify,processing=null}){
  const root=document.createElement('section');root.className='extract-workbench organize-workbench';root.id='organizeWorkbench';root.hidden=true;
  root.innerHTML=`<header class="extract-workbench-header"><button class="quiet-button" data-action="back">返回画布</button><strong data-title></strong><span data-status role="status"></span></header><div class="extract-workbench-content"><section class="organize-preview"><header><span data-summary></span><span data-view></span></header><div class="organize-stage"><img alt="当前查看帧" draggable="false"><span data-empty hidden>暂无保留帧</span></div><div data-player></div></section><aside class="extract-source"><h2>整理序列帧</h2><div class="organize-history"><button class="quiet-button" data-action="undo" aria-label="撤销"></button><button class="quiet-button" data-action="redo" aria-label="恢复"></button></div><div class="organize-selection"><span data-checked></span><button class="quiet-button" data-action="all">全选</button><button class="quiet-button" data-action="none">取消勾选</button></div><button class="quiet-button" data-action="remove">删除勾选帧</button><details><summary data-deleted-summary>已删除</summary><div data-deleted></div></details><div class="extract-actions"><span data-duration></span><button class="solid-button" data-action="publish">确认整理</button></div><p data-error role="alert"></p></aside><section class="extract-timeline organize-timeline"><header class="extract-timeline-toolbar"><span>时间轴</span><span class="organize-hint">拖动交换 · 勾选用于播放</span><label>缩略图<select aria-label="整理缩略图大小"><option value="72">小</option><option value="104" selected>中</option><option value="144">大</option></select></label></header><div class="organize-strip" tabindex="0" aria-label="整理帧列表"></div></section></div>`;
  document.body.append(root);
  root.querySelector('.organize-preview').insertAdjacentHTML('beforeend',`<div class="organize-view-tools"><button class="quiet-button" data-action="fit">适配</button><button class="quiet-button" data-action="native">100%</button><span data-zoom></span><label>预览帧率<input data-preview-fps type="number" min="1" max="60" step="1" value="12" aria-label="整理预览帧率"></label></div>`);
  root.querySelector('.organize-history').insertAdjacentHTML('beforeend','<button class="quiet-button" data-action="reset">重置</button>');
  root.querySelector('.organize-history').insertAdjacentHTML('afterend','<button class="quiet-button" data-action="find-loop">寻找动作循环</button>');
  root.querySelector('.organize-view-tools').insertAdjacentHTML('beforeend','<button class="quiet-button" data-action="play-mode" aria-pressed="false" title="切换播放模式">单次</button>');
  root.insertAdjacentHTML('beforeend',`<dialog class="organize-reset-dialog"><h2>重置？</h2><p>恢复全部原帧及原始顺序，此操作可以撤销。</p><div><button class="quiet-button" data-action="cancel-reset">取消</button><button class="solid-button" data-action="confirm-reset">重置</button></div></dialog>`);
  const $=selector=>root.querySelector(selector),button=name=>$(`[data-action="${name}"]`),app=document.querySelector('.workflow-app');
  $('.extract-workbench-header').append(button('back'));
  button('undo').innerHTML=icons['undo-2'];button('redo').innerHTML=icons['redo-2'];button('back').insertAdjacentHTML('afterbegin',icons['chevron-left']);
  let activeId=null,editor=null,input=null,fingerprint=null,player=null,urls=new Map(),busy=false,dragged=null,epoch=0;
  let zoom=1,panX=0,panY=0,pointer=null,fitMode=true,previewFps=12,loopPlayback=false,thumbnails=null;
  const loopDialog=createWorkflowLoopDialog({root,getEditor:()=>editor,getInput:()=>input,isValid:()=>!!activeId&&!busy&&context(activeId).fingerprint===fingerprint,apply:action=>act(action),getFps:()=>previewFps});
  button('find-loop').onclick=()=>{player?.pause();loopDialog.open();};
  const decorate=(name,label,icon)=>{const control=button(name);control.innerHTML=icons[icon];control.setAttribute('aria-label',label);control.title=label;control.classList.add('work-icon-button');};
  for(const [name,label,icon] of [['back','返回画布','chevron-left'],['undo','撤销','undo-2'],['redo','恢复','redo-2'],['reset','重置','rotate-ccw'],['find-loop','寻找动作循环','repeat-2'],['all','全选','check'],['none','取消勾选','minus'],['remove','删除勾选帧','trash-2'],['publish','确认整理','check'],['fit','适配','maximize'],['native','100%','scan']])decorate(name,label,icon);
  // 工具栏用图标，导航和业务主操作保留文字，避免依赖猜测符号含义。
  for(const [name,label] of [['back','返回画布'],['publish','确认整理'],['fit','适配'],['native','100%'],['all','全选'],['none','全不选']]){const control=button(name);control.classList.remove('work-icon-button');control.textContent=label;control.setAttribute('aria-label',label);control.title=label;if(name==='back')control.insertAdjacentHTML('afterbegin',icons['chevron-left']);}
  function modeIcon(){const control=button('play-mode'),label=loopPlayback?'循环':'单次';control.textContent=label;control.setAttribute('aria-label',label);control.title='切换播放模式';control.setAttribute('aria-pressed',String(loopPlayback));}
  modeIcon();button('play-mode').onclick=()=>{loopPlayback=!loopPlayback;modeIcon();};
  const stage=$('.organize-stage'),stageImage=$('.organize-stage img');
  function pose(){stageImage.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;const percent=Math.round(zoom*100);$('[data-zoom]').textContent=`${percent}%`;$('[data-zoom]').hidden=percent===100;}
  function fit(){if(!input)return;fitMode=true;zoom=Math.min(1,(stage.clientWidth-32)/input.width,(stage.clientHeight-32)/input.height);zoom=Math.max(.05,zoom);panX=panY=0;pose();}
  new ResizeObserver(()=>{if(activeId&&fitMode)fit();}).observe(stage);
  button('fit').onclick=fit;button('native').onclick=()=>{fitMode=false;zoom=1;panX=panY=0;pose();};
  stage.addEventListener('wheel',event=>{if(!activeId)return;event.preventDefault();fitMode=false;zoom=Math.max(.05,Math.min(8,zoom*(event.deltaY<0?1.12:1/1.12)));pose();},{passive:false});
  stage.onpointerdown=event=>{if(event.button!==0)return;pointer={x:event.clientX,y:event.clientY,panX,panY};stage.setPointerCapture(event.pointerId);};
  stage.onpointermove=event=>{if(pointer){fitMode=false;panX=pointer.panX+event.clientX-pointer.x;panY=pointer.panY+event.clientY-pointer.y;pose();}};
  stage.onpointerup=stage.onpointercancel=()=>{pointer=null;};
  $('[data-preview-fps]').onchange=event=>{const control=event.target;if(control.value&&control.validity.valid){previewFps=control.valueAsNumber;}else control.value=previewFps;};
  function navigate(step){if(!editor.order.length)return;player?.pause();const index=Math.max(0,Math.min(editor.order.length-1,editor.order.indexOf(editor.active)+step));editor.view(editor.order[index]);view();root.querySelector(`[data-frame="${CSS.escape(editor.active)}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});}
  const resetDialog=$('.organize-reset-dialog');button('reset').onclick=()=>resetDialog.showModal();button('cancel-reset').onclick=()=>resetDialog.close();button('confirm-reset').onclick=()=>{resetDialog.close();act(()=>editor.reset());};
  const strip=$('.organize-strip');
  const hint=$('.organize-hint');
  function clearDrag(){dragged=null;strip.classList.remove('drop-end');for(const card of strip.children)card.classList.remove('drop-swap','is-dragging');hint.textContent='拖动交换 · 勾选用于播放';}
  strip.addEventListener('dragover',event=>{if(!dragged||busy||event.target.closest('[data-frame]'))return;event.preventDefault();strip.classList.add('drop-end');for(const card of strip.children)card.classList.remove('drop-swap');hint.textContent='松开移到末尾';});
  strip.addEventListener('drop',event=>{strip.classList.remove('drop-end');if(!dragged||event.target.closest('[data-frame]'))return;event.preventDefault();const id=dragged;clearDrag();act(()=>editor.append(id));});
  strip.addEventListener('dragleave',()=>strip.classList.remove('drop-end'));strip.addEventListener('dragend',clearDrag);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player?.pause();});
  const url=id=>{if(!urls.has(id)){for(const value of urls.values())URL.revokeObjectURL(value);urls.clear();urls.set(id,URL.createObjectURL(input.frames.find(frame=>frame.id===id).blob));}return urls.get(id);};
  function bounds(){root.style.top=`${app.querySelector('.workflow-topbar').getBoundingClientRect().bottom}px`;}
  new ResizeObserver(()=>{if(activeId)bounds();}).observe(app.querySelector('.workflow-topbar'));
  function visible(value){app.classList.toggle('is-workbench-open',value);for(const id of ['canvasViewport','nodeToolbar','inspector'])document.getElementById(id)?.toggleAttribute('inert',value);if(value){document.getElementById('canvasContextMenu').hidden=true;bounds();}}
  function dispose(){loopDialog.close();thumbnails?.dispose();thumbnails=null;player?.dispose();player=null;for(const value of urls.values())URL.revokeObjectURL(value);urls.clear();clearDrag();}
  function view(){const frame=editor.byId.get(editor.active);$('.organize-stage img').hidden=!frame;$('[data-empty]').hidden=!!frame;if(frame)$('.organize-stage img').src=url(frame.id);$('[data-view]').textContent=frame?`原帧 ${String(frame.sourceIndex+1).padStart(3,'0')}`:'';if(player){const index=editor.checkedFrames.findIndex(item=>item.id===editor.active);player.root.querySelector('.frame-player-controls span').textContent=`${index>=0?index+1:'—'} / ${editor.selected.size}`;}for(const card of root.querySelectorAll('[data-frame]'))card.classList.toggle('is-active',card.dataset.frame===editor.active);}
  function playback(){
    player?.dispose();$('[data-player]').replaceChildren();
    const checked=editor.checkedFrames.map(frame=>input.frames.find(item=>item.id===frame.id));
    // 未勾选时仍可逐帧查看；播放只使用勾选集合，不修改输出时长。
    const frames=checked.length?checked:editor.frames.map(frame=>input.frames.find(item=>item.id===frame.id));
    if(!frames.length){player=null;return;}
    player=framePlayer({...input,frames},{loop:()=>loopPlayback,previewFps:()=>previewFps,navigate});
    player.root.querySelector('.frame-player-stage').hidden=true;
    player.root.addEventListener('framechange',event=>{editor.view(frames[event.detail].id);view();root.querySelector(`[data-frame="${CSS.escape(editor.active)}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});});
    const toggle=player.root.querySelector('.frame-play-toggle');toggle.title='播放勾选帧';toggle.disabled=!checked.length;
    $('[data-player]').append(player.root);const index=frames.findIndex(frame=>frame.id===editor.active);if(index>=0)player.seek(index);
  }
  function render(oldRects=null){
    if(!editor)return;
    stageImage.style.width=`${input.width}px`;stageImage.style.height=`${input.height}px`;
    $('[data-title]').textContent=context(activeId).node.name;$('[data-summary]').textContent=`输出 ${editor.selected.size} / ${editor.order.length} 帧`;$('[data-checked]').textContent=`勾选 ${editor.selected.size} 帧`;$('[data-duration]').textContent=`${editor.checkedFrames.reduce((sum,frame)=>{const [n,d=1]=frame.durationSeconds.split('/').map(Number);return sum+n/d;},0).toFixed(2)} 秒`;
    const strip=$('.organize-strip'),scroll=strip.scrollLeft;thumbnails?.dispose();strip.replaceChildren();
    const frameBlobs=new Map(input.frames.map(frame=>[frame.id,frame.blob]));thumbnails=createTimelineThumbnails(strip,id=>frameBlobs.get(id));
    for(const frame of editor.frames){
      const card=document.createElement('div');card.className='organize-frame';card.classList.toggle('is-checked',editor.selected.has(frame.id));card.dataset.frame=frame.id;card.draggable=true;
      const check=document.createElement('input');check.type='checkbox';check.checked=editor.selected.has(frame.id);check.setAttribute('aria-label',`勾选原帧${frame.sourceIndex+1}`);check.onclick=event=>act(()=>editor.select(frame.id,{toggle:!event.shiftKey,range:event.shiftKey}),false);
      const preview=document.createElement('button');preview.className='organize-thumbnail';preview.setAttribute('aria-label',`查看原帧${frame.sourceIndex+1}`);const image=document.createElement('img');image.dataset.frameId=frame.id;image.draggable=false;image.alt='';const label=document.createElement('span');label.textContent=String(frame.sourceIndex+1).padStart(3,'0');preview.append(image,label);preview.onclick=()=>{player?.pause();editor.view(frame.id);view();};
      const remove=document.createElement('button');remove.className='organize-trash';remove.innerHTML=icons['trash-2'];remove.setAttribute('aria-label',`删除原帧${frame.sourceIndex+1}`);remove.onclick=()=>act(()=>editor.remove([frame.id]));
      if(processing&&frame.sourceTimeSeconds!=null){const time=document.createElement('span');time.className='frame-time';const [n,d=1]=String(frame.sourceTimeSeconds).split('/').map(Number);time.textContent=`${(n/d).toFixed(2)} s`;card.append(time);}
      card.append(check,preview,remove);
      card.ondragstart=event=>{if(busy||event.target.closest('input,.organize-trash')){event.preventDefault();return;}dragged=frame.id;card.classList.add('is-dragging');player?.pause();event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',frame.id);};card.ondragover=event=>{if(dragged&&!busy){event.preventDefault();strip.classList.remove('drop-end');for(const item of strip.children)item.classList.toggle('drop-swap',item===card&&dragged!==frame.id);hint.textContent=dragged===frame.id?'保持原位置':`松开交换原帧 ${editor.byId.get(dragged).sourceIndex+1} 与 ${frame.sourceIndex+1}`;}};card.ondragleave=()=>card.classList.remove('drop-swap');card.ondragend=clearDrag;card.ondrop=event=>{event.preventDefault();event.stopPropagation();const id=dragged;clearDrag();if(id)act(()=>editor.swap(id,frame.id));};strip.append(card);thumbnails.observe(image);
    }
    strip.scrollLeft=scroll;
    if(oldRects&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const area=strip.getBoundingClientRect();for(const card of strip.children){const old=oldRects.get(card.dataset.frame),next=card.getBoundingClientRect();if(!old||next.right<area.left||next.left>area.right)continue;const dx=old.left-next.left;if(dx){card.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:240,easing:'ease-out'});}}}
    const deleted=editor.original.filter(id=>!editor.order.includes(id));$('[data-deleted-summary]').textContent=`已删除 ${deleted.length} 帧`;$('[data-deleted]').replaceChildren();for(const id of processing?[]:deleted){const restore=document.createElement('button');restore.className='quiet-button';restore.textContent=`恢复原帧 ${editor.byId.get(id).sourceIndex+1}`;restore.onclick=()=>act(()=>restoreOrganizerFrame(editor,id));if(!processing)$('[data-deleted]').append(restore);}
    playback();view();refresh();if(fitMode)fit();
    const toggle=player?.root.querySelector('.frame-play-toggle');if(toggle&&!editor.selected.size)toggle.disabled=true;
  }
  function refresh(){
    if(!activeId)return;
    processing?.refresh(activeId,{editor,input});
    if(!editor){for(const name of ['undo','redo','reset','all','none','remove','find-loop','publish'])button(name).disabled=true;return;}
    const value=context(activeId),valid=value.fingerprint===fingerprint&&!value.processingBusy;
    $('[data-status]').textContent=valid?(value.confirmed?'已确认':'未确认整理'):'上游已变化，请返回重新打开';
    for(const control of root.querySelectorAll('button,input,select'))control.disabled=busy||!valid;
    button('back').disabled=busy;button('undo').disabled=busy||!valid||!editor.undoStack.length;button('redo').disabled=busy||!valid||!editor.redoStack.length;
    button('remove').disabled=busy||!valid||!editor.selected.size;button('publish').disabled=busy||!valid||!editor.selected.size;
    button('find-loop').disabled=busy||!valid||editor.order.length<7;
    const toggle=player?.root.querySelector('.frame-play-toggle');if(toggle)toggle.disabled=busy||!valid||!editor.selected.size;
    if(!valid){player?.pause();loopDialog.refresh();}
    // 上游失效时仍能关闭循环弹窗，不把用户锁在失效窗口里。
    for(const control of root.querySelectorAll('.workflow-loop-dialog [data-close],.workflow-loop-dialog [data-cancel]'))control.disabled=busy;
    processing?.refresh(activeId,{editor,input});
  }
  async function act(action,change=true){if(!editor||busy||context(activeId).processingBusy||context(activeId).fingerprint!==fingerprint)return;player?.pause();const before=organizerDraft(editor),beforeRevision=editor.revision,beforeOutput=organizerOutputSignature(editor),oldRects=new Map([...strip.children].map(card=>[card.dataset.frame,card.getBoundingClientRect()]));busy=true;$('[data-error]').textContent='';try{action();if(editor.revision===beforeRevision)recordOrganizerSelection(editor,before.snapshot);await save(activeId,fingerprint,organizerDraft(editor),organizerOutputSignature(editor)!==beforeOutput);}catch(error){editor=createOrganizerEditor(input,before);$('[data-error]').textContent=error.message;}finally{busy=false;render(change?oldRects:null);}}
  button('all').onclick=()=>act(()=>editor.selectAll(),false);button('none').onclick=()=>act(()=>editor.clearSelection(),false);button('remove').onclick=()=>act(()=>editor.remove());button('undo').onclick=()=>act(()=>editor.undo());button('redo').onclick=()=>act(()=>editor.redo());
  button('publish').onclick=async()=>{if(busy)return;busy=true;refresh();$('[data-error]').textContent='';try{await publish(activeId,fingerprint,input,editor);notify('整理结果已确认');}catch(error){$('[data-error]').textContent=error.message;}finally{busy=false;refresh();}};
  function close(){if(busy)return;epoch++;resetDialog.close();dispose();processing?.close();root.hidden=true;activeId=null;editor=null;visible(false);document.getElementById('canvasViewport').focus({preventScroll:true});}
  button('back').onclick=close;$('select').onchange=event=>$('.organize-strip').style.setProperty('--frame-width',`${event.target.value}px`);
  root.addEventListener('keydown',event=>{if(!editor||busy||resetDialog.open||loopDialog.active||processing?.modalOpen||event.target.matches('input:not([type=checkbox]),select'))return;const ctrl=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();if(ctrl&&key==='a'){event.preventDefault();act(()=>editor.selectAll(),false);}else if(event.key==='Escape'){event.preventDefault();act(()=>editor.clearSelection(),false);}else if(ctrl&&key==='z'){event.preventDefault();act(()=>event.shiftKey?editor.redo():editor.undo());}else if(ctrl&&key==='y'){event.preventDefault();act(()=>editor.redo());}else if(event.key==='Delete'){event.preventDefault();act(()=>editor.remove());}});
  return {root,pause:()=>player?.pause(),get active(){return activeId;},get busy(){return busy;},refresh,close,async open(id){if(busy)return;const token=++epoch;try{const value=context(id);if((!value.input||!value.fingerprint)&&!processing)throw new Error(value.error||'上游帧集未就绪');const draft=value.input?await load(id,value.fingerprint):null;if(token!==epoch)return;if(value.input&&context(id).fingerprint!==value.fingerprint)throw new Error('上游已变化，请重试');dispose();activeId=id;input=value.input;fingerprint=value.fingerprint;editor=input?createOrganizerEditor(input,draft):null;root.hidden=false;visible(true);$('[data-error]').textContent='';processing?.open(id);if(editor)render();else{strip.replaceChildren();$('[data-player]').replaceChildren();stageImage.removeAttribute('src');stageImage.hidden=true;$('[data-empty]').hidden=false;$('[data-empty]').textContent='设置范围后抽取序列帧';$('[data-title]').textContent=value.node.name;$('[data-summary]').textContent='';$('[data-view]').textContent='';$('[data-duration]').textContent='';refresh();}button('back').focus();}catch(error){notify(error.message);}}};
}

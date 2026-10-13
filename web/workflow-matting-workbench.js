import {icons} from './icons-data.js';
import {framePlayer} from './workflow-extract-workbench.js';
import {createTimelineThumbnails} from './workflow-timeline-thumbnails.js';
import {createMattingTask,reusableFrame,mattingApi,sealTransparent,MATTING_POLICY,mattingFrameNumber} from './workflow-matting.js';

export function createMattingWorkbench({context,load,save,publish,notify}){
  const root=document.createElement('section');root.id='mattingWorkbench';root.className='extract-workbench matting-workbench';root.hidden=true;
  root.innerHTML=`<header class="extract-workbench-header"><button class="quiet-button" data-back>返回画布</button><strong data-title></strong><span data-status role="status"></span></header><div class="matting-layout"><section class="matting-preview"><header><span data-summary></span></header><div class="matting-stage"><img alt="当前帧" draggable="false"></div><div class="matting-preview-controls"><div data-player></div><button class="quiet-button" data-fit>适配</button><button class="quiet-button" data-native>100%</button><label>预览帧率<input type="number" min="1" max="60" value="12" aria-label="透明预览帧率"></label><button class="quiet-button" data-loop aria-pressed="true">循环</button></div></section><aside class="matting-settings"><h2>透明背景</h2><dl><div><dt>序列帧</dt><dd data-count></dd></div><div><dt>图片尺寸</dt><dd data-size></dd></div><div><dt>已处理</dt><dd data-completed></dd></div><div><dt>已精修</dt><dd data-modified></dd></div></dl><label class="matting-background">检查背景<select aria-label="检查背景"><option value="checker">透明网格</option><option value="dark">深色</option><option value="light">浅色</option></select></label><button class="quiet-button" data-repair>精修当前帧</button><div class="matting-progress" role="status"><span data-progress></span><progress max="1" value="0" hidden></progress></div><p data-error role="alert"></p><div class="matting-actions"><button class="quiet-button" data-run>去除背景</button><button class="quiet-button" data-cancel hidden>取消任务</button><button class="solid-button" data-publish>确认输出</button></div></aside><section class="matting-timeline"><header><span>时间轴</span><span data-frame-status></span><label>缩略图<select aria-label="透明缩略图大小"><option value="72">小</option><option value="104" selected>中</option><option value="144">大</option></select></label></header><div class="matting-strip" tabindex="0" aria-label="透明背景帧列表"></div></section></div><dialog class="matting-reprocess"><h2>重新去除背景？</h2><p>将重新处理全部帧，替换当前自动结果和精修结果。</p><div><button class="quiet-button" data-rerun-cancel>取消</button><button class="solid-button" data-rerun-confirm>重新处理</button></div></dialog><dialog class="workflow-repair-dialog" aria-label="精修当前帧"><header><strong data-repair-title></strong><span data-repair-state role="status"></span><button class="quiet-button" data-repair-close>完成精修</button></header><iframe title="帧精修编辑器"></iframe><p data-repair-error role="alert"></p></dialog>`;
  document.body.append(root);
  const $=selector=>root.querySelector(selector),app=document.querySelector('.workflow-app'),stage=$('.matting-stage'),image=stage.querySelector('img'),strip=$('.matting-strip'),repairDialog=$('.workflow-repair-dialog'),iframe=$('iframe'),rerun=$('.matting-reprocess');
  $('[data-back]').insertAdjacentHTML('afterbegin',icons['chevron-left']);
  $('.extract-workbench-header').append($('[data-back]'));
  const closeButton=$('[data-repair-close]');closeButton.innerHTML=icons.x;closeButton.setAttribute('aria-label','关闭精修');closeButton.title='关闭精修';
  // 检查背景属于画面工具；精修仅由当前画面或时间轴帧双击进入。
  const background=document.createElement('div');background.className='matting-background';background.setAttribute('role','group');background.setAttribute('aria-label','检查背景');background.innerHTML='<span>检查背景</span>';
  for(const [value,name] of [['checker','透明网格'],['light','浅色'],['dark','深色'],['violet','紫色']]){
    const button=document.createElement('button');button.type='button';button.className='matting-swatch';button.dataset.background=value;button.setAttribute('aria-label',`${name}背景`);button.title=name;button.setAttribute('aria-pressed',String(value==='checker'));
    button.onclick=()=>{stage.dataset.background=value;for(const swatch of background.querySelectorAll('button'))swatch.setAttribute('aria-pressed',String(swatch===button));};background.append(button);
  }
  $('.matting-background').replaceWith(background);$('[data-repair]').remove();
  const controls=$('.matting-preview-controls'),zoomTools=document.createElement('div'),playTools=document.createElement('div');zoomTools.className='matting-zoom-tools';playTools.className='matting-play-tools';
  zoomTools.append($('[data-fit]'),$('[data-native]'));playTools.append($('[data-player]'),controls.querySelector('label'),$('[data-loop]'));controls.replaceChildren(zoomTools,playTools,background);$('.matting-preview>header').remove();
  const comparison=document.createElement('div');comparison.className='matting-comparison';image.replaceWith(comparison);comparison.append(image);
  const sourceImage=document.createElement('img');sourceImage.className='matting-source-overlay';sourceImage.alt='原始帧对比';sourceImage.draggable=false;
  const divider=document.createElement('div');divider.className='matting-divider';divider.innerHTML='<span>原始</span><span>处理后</span>';
  const grip=document.createElement('b');grip.className='matting-compare-grip';grip.innerHTML=icons['chevron-left']+icons['chevron-right'];divider.append(grip);
  const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value='50';slider.className='matting-compare-slider';slider.setAttribute('aria-label','原始帧与处理帧对比');
  comparison.append(sourceImage,divider,slider);
  function split(){comparison.style.setProperty('--split',`${slider.value}%`);slider.setAttribute('aria-valuetext',`原始帧 ${slider.value}%`);}
  slider.oninput=()=>{player?.pause();split();};slider.onpointerdown=event=>event.stopPropagation();slider.ondblclick=event=>{event.stopPropagation();openRepair(active);};split();
  let activeId=null,input=null,fingerprint=null,record=null,previous=null,active=0,player=null,thumbnails=null,urls=[],task=null,working=false,epoch=0,fps=12,loop=true,fitMode=true,zoom=1,panX=0,panY=0,pointer=null;
  let repair=null,repairQueue=Promise.resolve(),repairFailure=null,flushTimer=null;
  const setError=value=>$('[data-error]').textContent=value||'';
  function valid(){try{return !!activeId&&context(activeId).fingerprint===fingerprint;}catch{return false;}}
  function url(blob){const value=URL.createObjectURL(blob);urls.push(value);return value;}
  function release(){for(const value of urls)URL.revokeObjectURL(value);urls=[];}
  function bounds(){root.style.top=`${app.querySelector('.workflow-topbar').getBoundingClientRect().bottom}px`;}
  new ResizeObserver(()=>{if(activeId)bounds();}).observe(app.querySelector('.workflow-topbar'));
  function visible(value){app.classList.toggle('is-workbench-open',value);for(const id of ['canvasViewport','nodeToolbar','inspector'])document.getElementById(id)?.toggleAttribute('inert',value);if(value){document.getElementById('canvasContextMenu').hidden=true;bounds();}}
  function pose(){comparison.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;comparison.style.setProperty('--inverse-zoom',1/zoom);}
  function fit(){if(!input)return;fitMode=true;zoom=Math.max(.03,Math.min(1,(stage.clientWidth-24)/input.width,(stage.clientHeight-24)/input.height));panX=panY=0;pose();}
  new ResizeObserver(()=>{if(activeId&&fitMode)fit();}).observe(stage);
  $('[data-fit]').onclick=fit;$('[data-native]').onclick=()=>{fitMode=false;zoom=1;panX=panY=0;pose();};
  stage.onwheel=event=>{event.preventDefault();fitMode=false;zoom=Math.max(.03,Math.min(8,zoom*(event.deltaY<0?1.12:1/1.12)));pose();};
  stage.onpointerdown=event=>{if(event.button!==0)return;pointer={x:event.clientX,y:event.clientY,panX,panY};stage.setPointerCapture(event.pointerId);};stage.onpointermove=event=>{if(pointer){fitMode=false;panX=pointer.panX+event.clientX-pointer.x;panY=pointer.panY+event.clientY-pointer.y;pose();}};stage.onpointerup=stage.onpointercancel=()=>{pointer=null;};
  function show(index){
    active=index;release();const frame=record.frames[active];image.hidden=false;image.src=url(frame.autoBlob?frame.blob:input.frames[active].blob);image.style.width=`${input.width}px`;image.style.height=`${input.height}px`;
    comparison.style.width=`${input.width}px`;comparison.style.height=`${input.height}px`;comparison.hidden=false;
    const comparing=!!frame.autoBlob;comparison.classList.toggle('is-comparing',comparing);sourceImage.hidden=divider.hidden=slider.hidden=!comparing;
    if(comparing)sourceImage.src=url(input.frames[active].blob);else sourceImage.removeAttribute('src');
    for(const card of strip.children)card.classList.toggle('is-active',Number(card.dataset.index)===index);
    const current=strip.children[index];if(current){const rect=current.getBoundingClientRect(),area=strip.getBoundingClientRect();if(rect.left<area.left+4)strip.scrollLeft-=area.left+4-rect.left;else if(rect.right>area.right-4)strip.scrollLeft+=rect.right-area.right+4;}
    $('[data-frame-status]').textContent=`原帧 ${String(mattingFrameNumber(frame)).padStart(3,'0')} · ${frame.autoBlob?(frame.revision?'已精修':'已去背景'):'未处理'}`;
    refresh();
  }
  function render(){
    player?.dispose();thumbnails?.dispose();strip.replaceChildren();$('[data-player]').replaceChildren();
    thumbnails=createTimelineThumbnails(strip,id=>record.frames.find(frame=>frame.id===id)?.blob);
    record.frames.forEach((frame,index)=>{
      const card=document.createElement('button');card.type='button';card.className=`matting-frame${frame.autoBlob?'':' is-pending'}`;card.dataset.index=index;card.setAttribute('aria-label',`查看原帧${mattingFrameNumber(frame)}`);card.title=frame.autoBlob?'双击精修':'尚未去除背景';
      const top=document.createElement('span');const [n,d=1]=String(frame.sourceTimeSeconds??'0').split('/').map(Number);top.textContent=frame.sourceTimeSeconds==null?'—':`${(n/d).toFixed(2)} s`;
      const img=document.createElement('img');img.alt='';img.draggable=false;img.dataset.frameId=frame.id;
      const bottom=document.createElement('span');bottom.textContent=String(mattingFrameNumber(frame)).padStart(3,'0');
      const badge=document.createElement('i');badge.className='matting-frame-badge';badge.textContent=frame.autoBlob?(frame.revision?'精修':'透明'):'待处理';card.append(top,img,bottom,badge);
      card.onclick=()=>{player.pause();player.seek(index);};card.ondblclick=()=>openRepair(index);strip.append(card);thumbnails.observe(img);
    });
    player=framePlayer(record,{loop:()=>loop,previewFps:()=>fps});player.root.querySelector('.frame-player-stage').hidden=true;player.root.addEventListener('framechange',event=>show(event.detail));$('[data-player]').append(player.root);player.seek(Math.min(active,record.frames.length-1));if(fitMode)fit();
  }
  function refresh(){
    if(!activeId||!record)return;
    const count=record.frames.filter(frame=>frame.autoBlob).length,ready=count===input.frames.length,isValid=valid();
    $('[data-title]').textContent=context(activeId).node?.name||'透明背景';$('[data-status]').textContent=!isValid?'上游已变化，请返回重新打开':working?'处理中':context(activeId).confirmed?'已确认':ready?'待确认输出':'等待去除背景';
    $('[data-count]').textContent=`${record.frames.length} 帧`;$('[data-size]').textContent=`${input.width} × ${input.height}`;$('[data-completed]').textContent=`${count} 帧`;$('[data-modified]').textContent=`${record.frames.filter(frame=>frame.revision>0).length} 帧`;
    $('[data-run]').textContent=count===record.frames.length?'重新去除背景':count?`补抠 ${record.frames.length-count} 帧`:'去除背景';
    $('[data-run]').disabled=working||!isValid;$('[data-publish]').hidden=!ready||!!task;$('[data-publish]').disabled=working||!isValid||!ready;$('[data-cancel]').hidden=!task;$('[data-back]').disabled=working||repairDialog.open;
    background.hidden=!record.frames[active]?.autoBlob;
    if(!isValid)player?.pause();
  }
  $('[aria-label="透明预览帧率"]').onchange=event=>{if(event.target.validity.valid&&event.target.value)fps=event.target.valueAsNumber;else event.target.value=fps;};
  $('[data-loop]').onclick=()=>{loop=!loop;$('[data-loop]').textContent=loop?'循环':'单次';$('[data-loop]').setAttribute('aria-pressed',String(loop));};
  $('[aria-label="透明缩略图大小"]').onchange=event=>strip.style.setProperty('--frame-width',`${event.target.value}px`);
  strip.onkeydown=event=>{if(!working&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();player.seek(Math.max(0,Math.min(record.frames.length-1,active+(event.key==='ArrowRight'?1:-1))));}};
  async function process(reprocess=false){
    if(working||!valid())return;working=true;player?.pause();setError('');task=createMattingTask();const mine=task,token=epoch;refresh();
    try{
      const next=await task.execute(input,reprocess?null:previous,progress=>{$('[data-progress]').textContent=progress.stage;const bar=$('progress');bar.hidden=false;bar.max=progress.total||1;bar.value=progress.completed||0;});
      if(!valid()||epoch!==token||mine.cancelled)throw new Error('输入已变化，本次结果未采用');
      await save(activeId,fingerprint,next);record=previous=next;render();notify('透明背景处理完成');
    }catch(error){setError(error.message);}finally{task=null;working=false;$('progress').hidden=true;$('[data-progress]').textContent='';refresh();}
  }
  $('[data-run]').onclick=()=>{if(record.frames.every(frame=>frame.autoBlob))rerun.showModal();else process();};$('[data-rerun-cancel]').onclick=()=>rerun.close();$('[data-rerun-confirm]').onclick=()=>{rerun.close();process(true);};
  $('[data-cancel]').onclick=()=>task?.cancel().catch(error=>setError(error.message));
  $('[data-publish]').onclick=async()=>{if(working||!valid())return;working=true;player.pause();refresh();try{const next=await sealTransparent({...record,kind:'frame-set/transparent'});await save(activeId,fingerprint,next);record=previous=next;await publish(activeId,fingerprint,next);notify('透明序列帧已确认');}catch(error){setError(error.message);}finally{working=false;refresh();}};
  function repairError(message){$('[data-repair-error]').textContent=message||'';}
  async function openRepair(index){
    if(working||!valid()||!record.frames[index]?.autoBlob)return;working=true;player.pause();refresh();setError('');const token=epoch;
    try{
      // 单帧显式恢复：服务器重启后也从本机真值恢复，不依赖旧批次。
      const source={...input,frames:[input.frames[index]]},restore=createMattingTask();task=restore;
      const restored=await restore.execute(source,record,progress=>$('[data-progress]').textContent=progress.stage);
      if(!valid()||epoch!==token||restore.cancelled)throw new Error('输入已变化，未打开精修');
        repair={batch:restored.batchId,frame:record.frames[index].id,index,ready:false,dirty:false,busy:true,revision:record.frames[index].revision};repairQueue=Promise.resolve();repairFailure=null;repairError('');$('[data-repair-title]').textContent=`精修 · 原帧 ${mattingFrameNumber(record.frames[index])}`;iframe.src=`/assets/matting/repair.html?workflow=1&batch=${repair.batch}&frame=${repair.frame}&revision=${repair.revision}`;repairDialog.showModal();clearTimeout(flushTimer);flushTimer=setTimeout(()=>{repairFailure=new Error('精修编辑器加载超时');repairError('精修编辑器加载超时，可关闭后重试');},15000);
    }catch(error){setError(error.message);}finally{working=false;task=null;$('[data-progress]').textContent='';refresh();}
  }
  comparison.ondblclick=()=>openRepair(active);
  async function syncRepair(){
    if(!repair||!valid())throw new Error('上游已变化，精修结果未绑定新输入');
    const frame=repair.frame,revision=repair.revision,index=repair.index,blob=await (await mattingApi(`/${repair.batch}/frames/${frame}/current`)).blob();
    const frames=record.frames.map((item,i)=>i===index?{...item,blob,revision}:item),next=await sealTransparent({...record,frames});
    await save(activeId,fingerprint,next);record=previous=next;repairFailure=null;render();
  }
  function finishRepair(){clearTimeout(flushTimer);repairDialog.close();iframe.src='about:blank';repair=null;repairError('');refresh();}
  async function closeRepair(){
    if(!repair)return;if(!repair.ready){if(repairFailure)finishRepair();return;}
    try{await repairQueue;if(repairFailure)await syncRepair();repairError('');iframe.contentWindow.postMessage({kind:'repair-flush',batch:repair.batch,frame:repair.frame},location.origin);clearTimeout(flushTimer);flushTimer=setTimeout(()=>repairError('保存确认超时，窗口已保留，请重试关闭'),15000);}catch(error){repairFailure=error;repairError(`本机保存失败：${error.message}，请重试关闭`);}
  }
  $('[data-repair-close]').onclick=closeRepair;repairDialog.addEventListener('cancel',event=>{event.preventDefault();closeRepair();});
  window.addEventListener('message',event=>{
    const data=event.data;if(!repair||event.origin!==location.origin||event.source!==iframe.contentWindow||data?.batch!==repair.batch||data.frame!==repair.frame)return;
    if(data.kind==='repair-ready'){clearTimeout(flushTimer);repair.ready=true;repair.busy=false;}
    if(data.kind==='repair-state'){repair.dirty=data.dirty;repair.busy=data.busy;$('[data-repair-state]').textContent=data.dirty||data.busy?'正在同步…':'已同步';}
    if(data.kind==='repair-error'){repairFailure=new Error(data.message);repairError(data.message);}
    if(data.kind==='repair-saved'){repair.revision=data.revision;repairQueue=repairQueue.then(syncRepair).catch(error=>{repairFailure=error;repairError(`本机保存失败：${error.message}，请重试关闭`);});}
    if(data.kind==='repair-flushed')repairQueue.then(()=>{if(!repairFailure)finishRepair();});
  });
  function close(){if(working||repairDialog.open)return;epoch++;player?.dispose();thumbnails?.dispose();release();root.hidden=true;activeId=null;visible(false);document.getElementById('canvasViewport').focus({preventScroll:true});}
  $('[data-back]').onclick=close;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player?.pause();});
  window.addEventListener('beforeunload',event=>{if(task||repairDialog.open){event.preventDefault();event.returnValue='';}});
  return {root,refresh,close,get active(){return activeId;},get busy(){return working||repairDialog.open;},async open(id){if(working||repairDialog.open)return;const token=++epoch;try{const value=context(id);if(!value.input)throw new Error(value.error||'上游帧集未就绪');const saved=await load(id);if(token!==epoch)return;if(context(id).fingerprint!==value.fingerprint)throw new Error('上游已变化，请重新打开');value.input.frames.forEach(mattingFrameNumber);activeId=id;input=value.input;fingerprint=value.fingerprint;previous=saved||value.output;record={...input,frames:input.frames.map(frame=>{const cached=reusableFrame(frame,previous);return cached?{...frame,sourceBlob:frame.blob,sourceHash:frame.contentHash,autoBlob:cached.autoBlob,blob:cached.blob,revision:cached.revision,contentHash:cached.contentHash}:frame;}),policy:MATTING_POLICY};active=0;fitMode=true;root.hidden=false;visible(true);setError('');render();}catch(error){notify(error.message);}}};
}

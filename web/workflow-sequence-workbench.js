import {createOrganizeWorkbench} from './workflow-organize-workbench.js';
import {icons} from './icons-data.js';

// 合并的是用户入口，不复制抽帧、帧编辑和循环算法。
export function createSequenceWorkbench(options){
  const {context,extractContext,changeParameters,run,cancel}=options;
  let base,root,loadedInput=null,opening=false,videoUrl=null,videoId=null,mode='result',editing=null;
  const $=selector=>root.querySelector(selector);
  const iconButton=(label,icon,solid=false)=>`<button type="button" class="${solid?'solid-button':'quiet-button'} work-icon-button" aria-label="${label}" title="${label}">${icons[icon]}</button>`;
  const textButton=(label,text=label,solid=false)=>`<button type="button" class="${solid?'solid-button':'quiet-button'}" aria-label="${label}">${text}</button>`;
  function selectMode(next){
    mode=next;const source=mode==='source';
    root.dataset.previewMode=mode;
    $('[data-source-preview]').hidden=!source;
    for(const selector of ['.organize-stage','[data-player]','.organize-view-tools'])$(selector).hidden=source;
    $('[data-source-tab]').setAttribute('aria-selected',String(source));$('[data-frames-tab]').setAttribute('aria-selected',String(!source));
    if(source)base.pause();else $('[data-source-preview] video')?.pause();
  }
  function releaseVideo(){const video=$('[data-source-preview] video');if(video){video.pause();video.removeAttribute('src');video.load();}if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=null;videoId=null;$('[data-source-preview]').replaceChildren();}
  function source(id){
    const value=extractContext(id),video=value?.video;
    if(videoId===video?.id)return;
    releaseVideo();if(!video?.blob){$('[data-source-preview]').textContent='连接动作视频，或直接连接已有序列帧';return;}
    videoId=video.id;videoUrl=URL.createObjectURL(video.blob);const media=document.createElement('video');media.src=videoUrl;media.controls=true;media.preload='metadata';media.setAttribute('aria-label','原视频预览');$('[data-source-preview]').append(media);
  }
  function fields(id){const value=extractContext(id);for(const [key,fallback] of [['startSeconds',0],['endSeconds',value.video?.duration??0],['fps',12]])$(`[data-extract-field=${key}]`).value=value.node.parameters[key]??fallback;}
  function updateRange(id){
    const value=extractContext(id),start=Number($('[data-extract-field=startSeconds]').value),end=Number($('[data-extract-field=endSeconds]').value),fps=Number($('[data-extract-field=fps]').value),duration=value.video?.duration||1;
    $('[data-estimate]').textContent=value.video?`预计 ${Math.max(0,Math.ceil((end-start)*fps))} 帧`:'';
    const range=$('.sequence-range');range.style.setProperty('--range-start',`${Math.max(0,Math.min(100,start/duration*100))}%`);range.style.setProperty('--range-end',`${Math.max(0,Math.min(100,end/duration*100))}%`);
    for(const [key,num] of [['start',start],['end',end]]){$(`[data-range-${key}]`).max=duration;$(`[data-range-${key}]`).value=num;}
    const seconds=Math.max(0,Math.floor(value.video?.duration||0));$('[data-range-duration]').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function apply(){if(!base.active)return;const parameters={};for(const key of ['startSeconds','endSeconds','fps'])parameters[key]=Number($(`[data-extract-field=${key}]`).value);changeParameters(base.active,parameters);updateRange(base.active);base.refresh();}
  function refreshControls(id,currentEditing){
    if(currentEditing)editing=currentEditing;
    const value=extractContext(id),result=context(id),busy=value.status.key==='running';
    const sourceMode=mode==='source';$('.extract-source>h2').textContent=sourceMode?'抽帧设置':'输出设置';
    $('[data-output-settings]').hidden=sourceMode;
    $('[data-action=publish]').hidden=sourceMode;
    $('[data-estimate]').hidden=!sourceMode;
    $('[data-duration]').hidden=true;
    const frames=editing?.editor?.checkedFrames||[],input=editing?.input;
    $('[data-output-count]').textContent=`${frames.length} 帧`;
    $('[data-output-size]').textContent=input?`${input.width} × ${input.height}`:'—';
    $('[data-output-format]').textContent=input?'PNG':'—';
    $('[data-title]').textContent=value.node.name;
    $('[data-settings-name]').textContent=value.video?.name||'已有序列帧';
    $('[data-settings-name]').hidden=!sourceMode;
    $('[data-extraction-settings]').hidden=!value.video||mode!=='source';
    $('[data-range-row]').hidden=!value.video||mode!=='source';
    $('[data-source-tab]').disabled=!value.video;
    $('[data-frames-tab]').disabled=false;
    for(const control of root.querySelectorAll('[data-extract-field],[data-range-start],[data-range-end]'))control.disabled=busy||!value.videoReady||base.busy;
    $('[data-run]').disabled=busy||!value.videoReady||base.busy;$('[data-run]').hidden=!value.video||!sourceMode;
    $('[data-cancel-extraction]').hidden=!busy;$('[data-cancel-extraction]').disabled=false;
    for(const control of root.querySelectorAll('.sequence-extract-dialog button'))control.disabled=busy||base.busy;
    // 修改抽帧参数后，旧帧仍可查看，不能继续提交为新结果。
    if(busy)$('[data-status]').textContent=value.status.label;
    else if(!result.input)$('[data-status]').textContent=value.error||(value.hasExtractedFrames?'抽帧设置已修改':'等待抽取');
    $('[data-extraction-error]').textContent=value.status.key==='failed'?value.error:'';
    updateRange(id);
  }
  base=createOrganizeWorkbench({...options,context:id=>({...context(id),processingBusy:extractContext(id)?.status.key==='running'}),processing:{
    open(id){source(id);fields(id);selectMode(context(id).input?'result':'source');},
    close(){releaseVideo();loadedInput=null;root.querySelector('.sequence-extract-dialog')?.close();},refresh:refreshControls,get modalOpen(){return !!root.querySelector('.sequence-extract-dialog')?.open;},
  }});
  root=base.root;root.id='sequenceWorkbench';root.classList.add('sequence-workbench');
  const preview=$('.organize-preview'),header=preview.querySelector('header');
  const tabs=document.createElement('div');tabs.className='extract-preview-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','序列帧预览');tabs.innerHTML='<button role="tab" data-source-tab>原视频</button><button role="tab" data-frames-tab>序列帧</button>';
  header.prepend(tabs);$('[data-view]').hidden=true;
  const sourcePreview=document.createElement('div');sourcePreview.dataset.sourcePreview='';sourcePreview.className='sequence-source-preview';preview.insertBefore(sourcePreview,$('.organize-stage'));
  const controls=document.createElement('div');controls.className='sequence-preview-controls';
  const zoomTools=document.createElement('div');zoomTools.className='sequence-zoom-tools';zoomTools.append($('[data-action="fit"]'),$('[data-action="native"]'),$('[data-zoom]'));
  controls.append(zoomTools,$('[data-player]'),$('.organize-view-tools'));preview.append(controls);
  const resultPreview=document.createElement('div');resultPreview.className='sequence-result-preview';resultPreview.append($('.organize-stage'),controls);preview.append(resultPreview);
  $('[data-source-tab]').onclick=()=>{selectMode('source');base.refresh();};$('[data-frames-tab]').onclick=()=>{selectMode('result');base.refresh();};
  const aside=$('.extract-source');aside.querySelector('h2').textContent='处理设置';
  aside.querySelector('details').hidden=true;
  const settings=document.createElement('section');settings.className='sequence-settings';settings.innerHTML=`<p data-settings-name></p><div class="extract-settings" data-extraction-settings><label>开始（秒）<input data-extract-field="startSeconds" aria-label="开始（秒）" type="number" min="0" step="0.01"></label><label>结束（秒）<input data-extract-field="endSeconds" aria-label="结束（秒）" type="number" min="0" step="0.01"></label><label>采样（帧/秒）<input data-extract-field="fps" aria-label="采样（帧/秒）" type="number" min="1" max="60" step="1"></label></div><p data-extraction-error role="alert"></p>`;
  aside.querySelector('h2').after(settings);
  settings.insertAdjacentHTML('beforeend','<dl class="sequence-output-settings" data-output-settings><div><dt>输出帧数</dt><dd data-output-count></dd></div><div><dt>图片尺寸</dt><dd data-output-size></dd></div><div><dt>图片格式</dt><dd data-output-format></dd></div></dl>');
  const toolbar=$('.extract-timeline-toolbar'),tools=document.createElement('div');tools.className='sequence-edit-tools';
  tools.append($('.organize-history'),$('[data-action=find-loop]'),$('.organize-selection'),$('[data-action=remove]'));toolbar.querySelector('span').remove();toolbar.prepend(tools);
  tools.append($('[data-checked]'));
  const actions=$('.extract-actions');actions.insertAdjacentHTML('afterbegin',`<span data-estimate></span><span data-run-slot>${textButton('抽取序列帧')}</span><span data-cancel-slot>${textButton('取消抽帧')}</span>`);
  $('[data-run-slot] button').dataset.run='';$('[data-cancel-slot] button').dataset.cancelExtraction='';
  const confirm=$('[data-action=publish]');confirm.textContent='确认输出';confirm.title='确认序列帧输出';confirm.setAttribute('aria-label','确认序列帧输出');
  const rangeRow=document.createElement('div');rangeRow.className='extract-range-row';rangeRow.dataset.rangeRow='';rangeRow.innerHTML='<span>抽取范围</span><div class="extract-range extract-range-track sequence-range"><span class="extract-range-selection"></span><label><input data-range-start type="range" min="0" step="0.01" aria-label="范围开始"></label><label><input data-range-end type="range" min="0" step="0.01" aria-label="范围结束"></label></div>';
  rangeRow.classList.add('sequence-settings-range');rangeRow.querySelector(':scope>span').remove();rangeRow.insertAdjacentHTML('beforeend','<div class="sequence-range-times"><span>0:00</span><span data-range-duration></span></div>');
  $('[data-extract-field=endSeconds]').closest('label').after(rangeRow);
  for(const control of root.querySelectorAll('[data-extract-field]'))control.onchange=apply;
  for(const key of ['start','end']){const control=$(`[data-range-${key}]`);control.oninput=()=>{const start=Number($('[data-range-start]').value),end=Number($('[data-range-end]').value);$(`[data-extract-field=${key==='start'?'startSeconds':'endSeconds'}]`).value=key==='start'?Math.min(start,end):Math.max(start,end);updateRange(base.active);selectMode('source');const video=$('[data-source-preview] video');if(video)video.currentTime=Number(control.value);};control.onchange=apply;}
  const reset=document.createElement('dialog');reset.className='organize-reset-dialog sequence-extract-dialog';reset.setAttribute('aria-label','重新抽取确认');reset.innerHTML=`<header><h2>重新抽取序列帧？</h2>${iconButton('关闭重新抽取确认','x')}</header><p>成功后将切换到新帧集；旧输入的整理草稿仍保留，取消或失败不会覆盖。</p><div>${textButton('取消重新抽取','取消')}${textButton('确认重新抽取','重新抽取',true)}</div>`;root.append(reset);
  reset.querySelector('[aria-label="关闭重新抽取确认"]').onclick=()=>reset.close();
  reset.querySelector('[aria-label="取消重新抽取"]').onclick=()=>reset.close();reset.querySelector('[aria-label="确认重新抽取"]').onclick=()=>{reset.close();apply();run(base.active);};
  $('[data-run]').onclick=()=>{base.pause();$('[data-source-preview] video')?.pause();if(context(base.active).input||context(base.active).output)reset.showModal();else{apply();run(base.active);}};
  $('[data-cancel-extraction]').onclick=()=>cancel(base.active);
  async function open(id){if(base.busy||opening)return;opening=true;loadedInput=context(id).input?.id||null;try{await base.open(id);}finally{opening=false;}}
  return {get active(){return base.active;},get busy(){return base.busy||opening;},open,close(){reset.close();base.close();},refresh(){if(!base.active)return;base.refresh();const next=context(base.active).input?.id;if(next&&next!==loadedInput&&!opening&&extractContext(base.active).status.key!=='running')open(base.active);}};
}

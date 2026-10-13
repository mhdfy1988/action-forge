import {openCharacterPackage} from './package-files.js';
import {createCharacterRuntime} from './runtime.js';
import {actionPlacement} from './geometry.js';

const $=selector=>document.querySelector(selector);
const elements={
  status:$('#runtime-status'),state:$('.runtime-state'),input:$('#package-input'),packageName:$('#package-name'),packageMeta:$('#package-meta'),error:$('#package-error'),
  characterBlock:$('#character-block'),characterSelect:$('#character-select'),canvasSize:$('#canvas-size'),origin:$('#origin-value'),revision:$('#project-revision'),
  actionList:$('#action-list'),actionCount:$('#action-count'),title:$('#stage-title'),frameIndex:$('#frame-index'),frameId:$('#frame-id'),canvas:$('#stage-canvas'),canvasShell:$('#canvas-shell'),
  empty:$('#stage-empty'),originCross:$('#origin-cross'),previous:$('#previous-frame'),play:$('#play-action'),next:$('#next-frame'),speed:$('#playback-speed'),mode:$('#playback-mode'),duration:$('#action-duration'),
  events:$('#event-log'),clearEvents:$('#clear-events'),
};
let packageHandle=null,runtime=null,animationFrame=0,lastTime=0,renderVersion=0;
const bitmaps=new Map();

elements.input.addEventListener('change',async()=>{
  if(!elements.input.files?.length)return;
  await loadPackage(elements.input.files);
  elements.input.value='';
});
elements.characterSelect.addEventListener('change',()=>{
  stopAnimation();runtime.selectCharacter(elements.characterSelect.value);renderActions();render(true);
});
elements.play.addEventListener('click',()=>runtime?.snapshot.playing?pause():play());
elements.previous.addEventListener('click',()=>{stopAnimation();runtime.step(-1);render(true);});
elements.next.addEventListener('click',()=>{stopAnimation();runtime.step(1);render(true);});
elements.speed.addEventListener('change',()=>{runtime.setSpeed(Number(elements.speed.value));render(false);});
elements.clearEvents.addEventListener('click',()=>resetEvents());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&runtime?.snapshot.playing)pause();});
window.addEventListener('beforeunload',dispose);

async function loadPackage(files){
  setStatus('正在校验角色资产包…');elements.error.textContent='';
  try{
    const loaded=await openCharacterPackage(files);
    dispose();packageHandle=loaded;runtime=createCharacterRuntime(loaded.project,{onEvent:appendEvent});
    const initial=runtime.snapshot.action;
    if(!initial)throw new Error('角色资产包中没有动作');
    runtime.selectAction(initial.id);
    elements.packageName.textContent=loaded.project.name;
    elements.packageMeta.innerHTML=`<span>${loaded.rootName}</span><span>${loaded.fileCount} 文件</span><span>v${loaded.project.formatVersion}</span>`;
    elements.revision.textContent=`r${loaded.project.revision}`;elements.characterBlock.hidden=false;
    elements.characterSelect.innerHTML=loaded.project.characters.map(character=>`<option value="${escapeHtml(character.id)}">${escapeHtml(character.name)}</option>`).join('');
    elements.characterSelect.value=runtime.snapshot.character.id;
    elements.empty.hidden=true;resetEvents();renderActions();setStatus('资产已校验 · 本机只读','ready');await render(true);
  }catch(error){dispose();elements.error.textContent=error.message;setStatus('资产包加载失败','error');}
}

function renderActions(){
  const {character,action}=runtime.snapshot;
  elements.actionCount.textContent=`${character.actions.length} 项`;
  elements.actionList.innerHTML=character.actions.map((item,index)=>{
    const enabled=item.frames.filter(frame=>frame.enabled).length;
    const mode=item.playback.mode==='constant-fps'?`${item.playback.fps} fps`:'逐帧';
    return `<button class="action-card" data-action-id="${escapeHtml(item.id)}" aria-pressed="${item.id===action.id}"><span class="action-order">${String(index+1).padStart(2,'0')}</span><span><strong>${escapeHtml(item.name)}</strong><small>${enabled} 帧 · ${mode}</small></span><span>${item.loop?'循环':'单次'}</span></button>`;
  }).join('')||'<span class="panel-empty">当前角色没有动作</span>';
  for(const button of elements.actionList.querySelectorAll('.action-card'))button.addEventListener('click',()=>{
    stopAnimation();runtime.selectAction(button.dataset.actionId);renderActions();resetEvents();render(true);
  });
}

async function render(loadImage){
  if(!runtime)return;
  const state=runtime.snapshot,{character,action,frame}=state;
  elements.title.textContent=`${character.name} · ${action.name}`;
  elements.frameIndex.textContent=`${state.frameNumber} / ${state.frameCount}`;elements.frameId.textContent=frame?.id||'—';
  elements.canvasSize.textContent=character.canvas?`${character.canvas.width} × ${character.canvas.height}`:'未设置';
  elements.origin.textContent=character.origin?`${character.origin.x}, ${character.origin.y}`:'未设置';
  elements.mode.textContent=action.playback.mode==='constant-fps'?`${action.playback.fps} 帧/秒`:'逐帧时长';
  elements.duration.textContent=`${(state.totalDurationMs/1000).toFixed(3)} 秒`;
  elements.play.innerHTML=state.playing?'<span>Ⅱ</span> 暂停':'<span>▶</span> 播放';elements.play.classList.toggle('is-playing',state.playing);
  for(const control of [elements.previous,elements.play,elements.next,elements.speed])control.disabled=!frame;
  elements.clearEvents.disabled=!elements.events.querySelector('.event-entry');
  if(!character.canvas||!character.origin||!frame)return;
  elements.canvas.width=character.canvas.width;elements.canvas.height=character.canvas.height;
  positionOrigin(character);
  const imageRef=runtime.getFrameImageReference();if(!imageRef)return;
  const version=++renderVersion;
  try{
    let bitmap=bitmaps.get(imageRef.path);
    if(!bitmap&&loadImage){bitmap=await packageHandle.loadBitmap(imageRef.path);bitmaps.set(imageRef.path,bitmap);}
    if(version!==renderVersion||!bitmap)return;
    const context=elements.canvas.getContext('2d');context.clearRect(0,0,elements.canvas.width,elements.canvas.height);
    const placement=actionPlacement({imageWidth:bitmap.width,imageHeight:bitmap.height,canvasWidth:character.canvas.width,canvasHeight:character.canvas.height,origin:character.origin,characterScale:character.scale,transform:action.transform,anchor:action.anchor});
    context.save();context.translate(placement.pivotX,placement.pivotY);context.rotate(placement.rotationDegrees*Math.PI/180);
    context.drawImage(bitmap,placement.x-placement.pivotX,placement.y-placement.pivotY,placement.width,placement.height);context.restore();
  }catch(error){elements.error.textContent=error.message;setStatus('图片加载失败','error');pause();}
}

function positionOrigin(character){
  const canvasRect=elements.canvas.getBoundingClientRect(),shellRect=elements.canvasShell.getBoundingClientRect();
  const scale=Math.min(canvasRect.width/character.canvas.width,canvasRect.height/character.canvas.height);
  elements.originCross.hidden=false;elements.originCross.style.left=`${canvasRect.left-shellRect.left+character.origin.x*scale}px`;elements.originCross.style.top=`${canvasRect.top-shellRect.top+character.origin.y*scale}px`;
}

function play(){
  try{runtime.play();render(true);lastTime=performance.now();animationFrame=requestAnimationFrame(tick);}catch(error){elements.error.textContent=error.message;setStatus('当前资产不能播放','error');}
}
function pause(){if(!runtime)return;stopAnimation();runtime.pause();render(false);}
function stopAnimation(){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;lastTime=0;}
async function tick(now){
  if(!runtime?.snapshot.playing){animationFrame=0;return;}
  const before=runtime.snapshot.frame?.id;runtime.advance(Math.min(1000,Math.max(0,now-lastTime)));lastTime=now;
  await render(before!==runtime.snapshot.frame?.id);
  if(runtime.snapshot.playing)animationFrame=requestAnimationFrame(tick);else animationFrame=0;
}

function appendEvent(event){
  if(!elements.events.querySelector('.event-entry'))elements.events.innerHTML='';
  const item=document.createElement('div');item.className='event-entry';
  item.innerHTML=`<time>${(event.timeMs/1000).toFixed(3)}s</time><strong>${escapeHtml(event.type)}</strong><span>${escapeHtml(event.frameId)}</span>`;
  elements.events.prepend(item);while(elements.events.children.length>100)elements.events.lastElementChild.remove();elements.clearEvents.disabled=false;
}
function resetEvents(){elements.events.innerHTML='<span class="panel-empty">播放到事件帧时会在这里记录</span>';elements.clearEvents.disabled=true;}
function setStatus(text,state=''){elements.status.textContent=text;elements.state.className=`runtime-state ${state}`.trim();}
function dispose(){
  stopAnimation();runtime?.dispose();runtime=null;packageHandle=null;renderVersion++;
  for(const bitmap of bitmaps.values())bitmap.close();bitmaps.clear();
  const context=elements.canvas.getContext('2d');context.clearRect(0,0,elements.canvas.width,elements.canvas.height);elements.originCross.hidden=true;
}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}

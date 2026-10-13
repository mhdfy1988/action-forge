import {bindLoopCandidates,selectLoopCandidate} from './loop-core.js';
import {framePlayer} from './workflow-extract-workbench.js';
import {icons} from './icons-data.js';

// UI仅适配工作流帧来源；候选算法及一次提交的历史语义仍由旧领域核心负责。
export function createWorkflowLoopDialog({root,getEditor,getInput,isValid,apply,getFps}){
  const dialog=document.createElement('dialog');dialog.className='workflow-loop-dialog';
  dialog.setAttribute('aria-label','寻找动作循环');
  dialog.innerHTML=`<header><h2>寻找动作循环</h2><button class="quiet-button" data-close aria-label="关闭循环查找">${icons.x}</button></header><p data-state role="status"></p><div class="workflow-loop-body"><div data-candidates></div><section><div data-preview></div><span data-range></span></section></div><footer><button class="quiet-button" data-cancel>取消</button><button class="solid-button" data-apply disabled>勾选此循环</button></footer>`;
  root.append(dialog);const $=selector=>dialog.querySelector(selector);
  let worker=null,timer=null,player=null,snapshot=null,candidate=null,generation=0,applying=false;
  function dispose(){generation++;worker?.terminate();worker=null;clearTimeout(timer);timer=null;player?.dispose();player=null;}
  function valid(){const editor=getEditor();return !!editor&&isValid()&&editor.revision===snapshot?.revision&&editor.signature===snapshot?.signature;}
  function fail(message){dispose();candidate=null;$('[data-state]').textContent=message;$('[data-state]').setAttribute('role','alert');$('[data-apply]').disabled=true;$('[data-preview]').replaceChildren();$('[data-candidates]').replaceChildren();$('[data-range]').textContent='';}
  function choose(value,item){
    player?.dispose();candidate=value;
    for(const button of $('[data-candidates]').children)button.setAttribute('aria-pressed',String(button===item));
    const input=getInput(),frames=value.frameIds.map(id=>input.frames.find(frame=>frame.id===id));
    player=framePlayer({...input,frames},{loop:true,previewFps:getFps});$('[data-preview]').replaceChildren(player.root);
    const editor=getEditor();$('[data-range]').textContent=`原帧 ${String(editor.byId.get(frames[0].id).sourceIndex+1).padStart(3,'0')} — ${String(editor.byId.get(frames.at(-1).id).sourceIndex+1).padStart(3,'0')}`;
    $('[data-apply]').disabled=!valid();
  }
  function close(){if(applying)return;dialog.close();}
  $('[data-close]').onclick=$('[data-cancel]').onclick=close;
  dialog.addEventListener('cancel',event=>{if(applying)event.preventDefault();});
  dialog.addEventListener('close',()=>{dispose();candidate=null;$('[data-preview]').replaceChildren();$('[data-candidates]').replaceChildren();});
  $('[data-apply]').onclick=async()=>{
    if(!candidate||!valid()){fail('帧顺序或上游已变化，请重新查找');return;}
    applying=true;const selected=candidate;$('[data-apply]').disabled=true;$('[data-cancel]').disabled=true;$('[data-close]').disabled=true;player?.pause();
    try{await apply(()=>selectLoopCandidate(getEditor(),selected));dialog.close();}
    finally{applying=false;$('[data-cancel]').disabled=false;$('[data-close]').disabled=false;}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player?.pause();});
  return {get active(){return dialog.open;},close,refresh(){if(dialog.open&&!valid())fail('上游或帧顺序已变化，请关闭后重新查找');},open(){
    const editor=getEditor();if(!isValid()||!editor||editor.order.length<7)return;
    dispose();snapshot={revision:editor.revision,signature:editor.signature};candidate=null;
    $('[data-candidates]').replaceChildren();$('[data-preview]').replaceChildren();$('[data-range]').textContent='';$('[data-apply]').disabled=true;
    $('[data-state]').textContent='准备分析';$('[data-state]').setAttribute('role','status');dialog.showModal();const ticket=generation;
    try{
      worker=new Worker(new URL('./loop-worker.js',import.meta.url),{type:'module'});
      timer=setTimeout(()=>{if(ticket===generation&&dialog.open)fail('循环分析超过45秒，请减少帧数后重试');},45000);
      worker.onerror=event=>{event.preventDefault();if(ticket===generation&&dialog.open)fail('循环分析线程失败，请重新查找');};
      worker.onmessage=({data})=>{
        if(ticket!==generation||!dialog.open)return;
        if(!valid()){fail('帧顺序或上游已变化，请重新查找');return;}
        if(data.type==='progress')$('[data-state]').textContent=data.message;
        else if(data.type==='error')fail(data.message);
        else if(data.type==='result'){
          worker.terminate();worker=null;clearTimeout(timer);timer=null;
          const candidates=bindLoopCandidates(editor.order,editor.revision,data.candidates);
          $('[data-state]').textContent=candidates.length?`找到 ${candidates.length} 个候选`:'未找到可靠循环';
          for(const value of candidates){const item=document.createElement('button');item.className='quiet-button';item.textContent=`${value.count} 帧 · 位置 ${value.start+1}–${value.endExclusive}`;item.setAttribute('aria-pressed','false');item.onclick=()=>choose(value,item);$('[data-candidates]').append(item);}
          if(candidates.length)choose(candidates[0],$('[data-candidates]').firstElementChild);
        }
      };
      const byId=new Map(getInput().frames.map(frame=>[frame.id,frame]));worker.postMessage({blobs:editor.order.map(id=>byId.get(id).blob)});
    }catch(error){fail(error.message||'无法启动循环分析');}
  }};
}

import {durationMs,enabledFrames,totalDurationMs} from './playback.js';
import {validateCharacterProject} from './character-project.js';

const MAX_DELTA_MS=60_000;
const MAX_FRAME_TRANSITIONS=10_000;

/**
 * R4角色资产的只读JavaScript运行时。图像解码和绘制留给宿主；该模块只给出
 * 已校验角色数据、当前帧引用、确定性时钟状态和逐帧事件通知。
 */
export function createCharacterRuntime(input,{onEvent=null}={}){
  const project=validateCharacterProject(input);
  const listeners=new Set();
  if(onEvent)listeners.add(onEvent);
  const characters=project.characters;
  let character=characters[0];
  let action=character.actions.find(item=>enabledFrames(item).length>0)||character.actions[0]||null;
  let frames=action?enabledFrames(action):[];
  let frameIndex=0,frameElapsedMs=0,playing=false,ended=false,entered=false,speed=1,loopIndex=0,disposed=false;

  function assertActive(){if(disposed)throw new Error('动作运行时已销毁');}

  function assertReady(nextCharacter,nextAction){
    if(!nextCharacter.canvas||!nextCharacter.origin)throw new Error(`角色 ${nextCharacter.name} 尚未设置共享画布与原点`);
    if(!nextAction)throw new Error('当前角色没有动作');
    if(!enabledFrames(nextAction).length)throw new Error(`动作 ${nextAction.name} 没有启用帧`);
    for(const frame of enabledFrames(nextAction))if(!frame.assets.current&&!frame.assets.mattingBase)
      throw new Error(`动作 ${nextAction.name} 的帧 ${frame.id} 尚未抠图，不能作为透明动作播放`);
  }

  function currentFrame(){return frames[frameIndex]||null;}
  function frameDuration(frame=currentFrame()){return frame?actionDuration(action,frame):0;}
  function frameStartMs(index=frameIndex){let value=0;for(let i=0;i<index;i++)value+=frameDuration(frames[i]);return value;}
  function positionMs(){return loopIndex*totalDurationMs(action)+frameStartMs()+frameElapsedMs;}
  function snapshot(){
    return Object.freeze({character,action,frame:currentFrame(),frameIndex,frameNumber:frames.length?frameIndex+1:0,
      frameCount:frames.length,frameElapsedMs,totalDurationMs:action?totalDurationMs(action):0,
      positionMs:action?positionMs():0,loopIndex,speed,playing,ended,disposed});
  }
  function dispatchFrameEvents(){
    const frame=currentFrame();if(!frame)return [];
    const found=action.events.filter(item=>item.frameId===frame.id).map(item=>Object.freeze({
      characterId:character.id,actionId:action.id,frameId:frame.id,eventId:item.id,type:item.type,
      parameters:item.parameters,loopIndex,timeMs:positionMs(),
    }));
    for(const event of found)for(const listener of listeners)listener(event);
    return found;
  }
  function selectAction(actionId){
    assertActive();
    const next=character.actions.find(item=>item.id===actionId);
    if(!next)throw new Error(`动作不存在：${actionId}`);
    assertReady(character,next);action=next;frames=enabledFrames(action);frameIndex=0;
    frameElapsedMs=0;loopIndex=0;playing=false;ended=false;entered=false;return snapshot();
  }
  function selectCharacter(characterId){
    assertActive();
    const next=characters.find(item=>item.id===characterId);
    if(!next)throw new Error(`角色不存在：${characterId}`);
    const nextAction=next.actions.find(item=>enabledFrames(item).length>0)||next.actions[0]||null;
    assertReady(next,nextAction);character=next;action=nextAction;frames=enabledFrames(action);
    frameIndex=0;frameElapsedMs=0;loopIndex=0;playing=false;ended=false;entered=false;return snapshot();
  }
  function play(){
    assertActive();
    assertReady(character,action);
    if(ended){frameIndex=0;frameElapsedMs=0;loopIndex=0;ended=false;entered=false;}
    if(!entered){entered=true;dispatchFrameEvents();}
    playing=true;return snapshot();
  }
  function pause(){assertActive();playing=false;return snapshot();}
  function seekFrame(index){
    assertActive();
    if(!Number.isInteger(index)||index<0||index>=frames.length)throw new RangeError('帧位置超出范围');
    playing=false;ended=false;frameIndex=index;frameElapsedMs=0;entered=false;return snapshot();
  }
  function step(direction){
    assertActive();
    if(direction!==-1&&direction!==1)throw new RangeError('逐帧方向必须为-1或1');
    const next=Math.max(0,Math.min(frames.length-1,frameIndex+direction));
    return seekFrame(next);
  }
  function setSpeed(value){
    assertActive();
    if(!Number.isFinite(value)||value<0.1||value>4)throw new RangeError('播放速度必须在0.1到4倍之间');
    speed=value;return snapshot();
  }
  function advance(deltaMs){
    assertActive();
    if(!Number.isFinite(deltaMs)||deltaMs<0||deltaMs>MAX_DELTA_MS)throw new RangeError(`单次推进必须在0到${MAX_DELTA_MS}毫秒之间`);
    if(!playing||deltaMs===0)return Object.freeze({snapshot:snapshot(),events:[]});
    // 浏览器动画帧通常每次只推进约16毫秒，必须把当前帧已累计时间带入本轮计算。
    let remaining=frameElapsedMs+deltaMs*speed,transitions=0;const emitted=[];
    frameElapsedMs=0;
    while(remaining+Number.EPSILON>=frameDuration()){
      remaining-=frameDuration();
      if(++transitions>MAX_FRAME_TRANSITIONS)throw new RangeError('单次推进跨越帧数超过运行时上限');
      if(frameIndex+1<frames.length){
        frameIndex++;frameElapsedMs=0;entered=true;emitted.push(...dispatchFrameEvents());continue;
      }
      if(action.loop){
        frameIndex=0;frameElapsedMs=0;loopIndex++;entered=true;emitted.push(...dispatchFrameEvents());continue;
      }
      frameElapsedMs=frameDuration();playing=false;ended=true;remaining=0;break;
    }
    if(playing)frameElapsedMs+=remaining;
    return Object.freeze({snapshot:snapshot(),events:Object.freeze(emitted)});
  }
  function subscribe(listener){
    assertActive();
    if(typeof listener!=='function')throw new TypeError('事件订阅者必须是函数');
    listeners.add(listener);return ()=>listeners.delete(listener);
  }
  function getFrameImageReference(frame=currentFrame()){
    assertActive();
    if(!frame)return null;
    const path=frame.assets.current||frame.assets.mattingBase;
    return path?Object.freeze({path,variant:frame.assets.current?'current':'mattingBase'}):null;
  }
  function dispose(){playing=false;listeners.clear();disposed=true;return snapshot();}

  return Object.freeze({project,get snapshot(){return snapshot();},selectAction,selectCharacter,play,pause,seekFrame,step,setSpeed,advance,subscribe,getFrameImageReference,dispose});
}

function actionDuration(action,frame){return durationMs(action,frame);}

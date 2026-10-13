export function enabledFrames(action){return action?.frames.filter(frame=>frame.enabled)||[];}

export function durationMs(action,frame){
  if(action.playback.mode==='constant-fps')return 1000/action.playback.fps;
  return frame.duration.numerator*1000/frame.duration.denominator;
}

export function totalDurationMs(action){
  return enabledFrames(action).reduce((total,frame)=>total+durationMs(action,frame),0);
}

export function eventOffsetMs(action,frameId){
  let elapsed=0;
  for(const frame of enabledFrames(action)){
    if(frame.id===frameId)return elapsed;
    elapsed+=durationMs(action,frame);
  }
  return null;
}

export function eventsAtFrame(action,frameId){
  return action.events.filter(event=>event.frameId===frameId);
}

export function nextFrameIndex(action,index){
  const frames=enabledFrames(action);
  if(!frames.length)return {index:0,ended:true};
  if(index+1<frames.length)return {index:index+1,ended:false};
  if(action.loop)return {index:0,ended:false};
  return {index:frames.length-1,ended:true};
}

export function millisecondsToRational(milliseconds){
  if(!Number.isInteger(milliseconds)||milliseconds<1||milliseconds>60000)throw new Error('单帧时长必须是1到60000毫秒');
  const divisor=gcd(milliseconds,1000);
  return {numerator:milliseconds/divisor,denominator:1000/divisor};
}

export function fpsToRational(fps){
  if(!Number.isInteger(fps)||fps<1||fps>60)throw new Error('帧率必须是1到60的整数');
  return {numerator:1,denominator:fps};
}

export function secondsToMilliseconds(value){
  return Math.round(value.numerator*1000/value.denominator);
}

function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}

import validateV2 from './project-validator.generated.js';

const MAX_MANIFEST_BYTES=8*1024*1024;
const ID_PATTERN=/^[a-z0-9][a-z0-9._-]{0,63}$/;

export function parseCharacterProjectJson(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>MAX_MANIFEST_BYTES)
    throw new Error('角色清单超过8MiB，拒绝加载');
  let project;
  try{project=JSON.parse(text);}catch{throw new Error('project.json 不是有效JSON');}
  return validateCharacterProject(project);
}

export function validateCharacterProject(input){
  let project;
  try{project=JSON.parse(JSON.stringify(input));}catch{throw new Error('角色清单必须是普通JSON数据');}
  assertJsonDepth(project);
  if(!validateV2(project)){
    const first=validateV2.errors?.[0];
    const location=first?.instancePath||'project.json';
    throw new Error(`角色清单不符合 v2 协议：${location} ${first?.message||'数据无效'}`);
  }
  const characterIds=new Set(),globalFrameIds=new Set(),migrationSources=new Set(),actionIds=new Set();
  for(const migration of project.migrations){
    const source=`${migration.sourceSequenceId}:${migration.sourceSha256}`;
    if(migrationSources.has(source))throw new Error('迁移来源重复');
    migrationSources.add(source);actionIds.add(migration.actionId);
  }
  assertName(project.name,'项目名称');
  for(const character of project.characters){
    unique(characterIds,character.id,'角色');
    assertName(character.name,`角色 ${character.id} 名称`);
    if((character.canvas===null)!==(character.origin===null))throw new Error(`角色 ${character.id} 的画布与原点必须同时设置`);
    if(character.canvas){
      if(character.canvas.width*character.canvas.height>16_000_000)throw new Error(`角色 ${character.id} 的共享画布超过1600万像素`);
      if(character.origin.x<0||character.origin.y<0||character.origin.x>character.canvas.width||character.origin.y>character.canvas.height)
        throw new Error(`角色 ${character.id} 的原点超出共享画布`);
    }
    const actionsById=new Map();
    const characterActionIds=new Set();
    for(const action of character.actions){
      unique(characterActionIds,action.id,'动作');actionIds.add(action.id);
      assertName(action.name,`动作 ${action.id} 名称`);
      actionsById.set(action.id,action);
      const frameIds=new Set(),eventIds=new Set();
      const enabled=new Set();
      for(const frame of action.frames){
        unique(frameIds,frame.id,'帧');unique(globalFrameIds,frame.id,'项目帧');
        if(frame.enabled)enabled.add(frame.id);
        if(action.playback.mode==='constant-fps'&&frame.duration!==null)throw new Error(`动作 ${action.id} 固定帧率模式不能包含逐帧时长`);
        if(action.playback.mode==='per-frame'&&frame.enabled&&frame.duration===null)throw new Error(`动作 ${action.id} 的启用帧 ${frame.id} 缺少时长`);
        if(frame.duration){
          assertReducedRational(frame.duration,`动作 ${action.id} 帧 ${frame.id} 时长`);
          if(frame.duration.numerator>frame.duration.denominator*60)throw new Error(`动作 ${action.id} 帧 ${frame.id} 时长超过60秒`);
        }
        const prefix=`assets/characters/${character.id}/actions/${action.id}/`;
        for(const assetPath of Object.values(frame.assets))if(assetPath!==null){
          assertSafePath(assetPath);assertPngPath(assetPath);
          if(!assetPath.startsWith(prefix))throw new Error(`帧 ${frame.id} 的资产路径不属于当前动作：${assetPath}`);
        }
        for(const time of [frame.source.sourceTimeSeconds,frame.source.sampleTimeSeconds,frame.source.sourceSampleDurationSeconds])
          if(time!==null)assertReducedRational(time,`动作 ${action.id} 帧 ${frame.id} 来源时间`);
        if(frame.source.sourceFrameId==='')throw new Error(`动作 ${action.id} 帧 ${frame.id} 的来源帧ID不能为空`);
      }
      for(const event of action.events){
        unique(eventIds,event.id,'事件');
        if(!enabled.has(event.frameId))throw new Error(`事件 ${event.id} 引用了不存在或未启用的帧`);
        if(new TextEncoder().encode(JSON.stringify(event.parameters)).byteLength>16*1024)throw new Error(`事件 ${event.id} 参数超过16KiB`);
      }
      if(action.anchor&&!enabled.has(action.anchor.frameId))throw new Error(`动作 ${action.id} 锚点必须引用启用帧`);
      if(action.source.kind==='video-extraction'){
        assertReducedRational(action.source.extraction.startSeconds,`动作 ${action.id} 起始时间`);
        assertReducedRational(action.source.extraction.endSeconds,`动作 ${action.id} 结束时间`);
        const start=action.source.extraction.startSeconds,end=action.source.extraction.endSeconds;
        if(start.numerator<0||start.numerator*end.denominator>=end.numerator*start.denominator)throw new Error(`动作 ${action.id} 的来源时间区间无效`);
        if(action.source.video!==null)assertSafePath(action.source.video);
      }
    }
    if(character.referenceImage!==null){
      assertSafePath(character.referenceImage);assertPngPath(character.referenceImage);
      if(!character.referenceImage.startsWith(`assets/characters/${character.id}/reference/`))throw new Error(`角色 ${character.id} 的参考图路径不属于该角色`);
    }
    if(character.baseline){
      const baselineAction=actionsById.get(character.baseline.actionId);
      if(!character.canvas||!character.origin||!baselineAction?.anchor||baselineAction.anchor.frameId!==character.baseline.frameId||!baselineAction.frames.some(frame=>frame.id===character.baseline.frameId&&frame.enabled))
        throw new Error(`角色 ${character.id} 的基准必须引用带锚点的启用帧`);
    }
  }
  for(const migration of project.migrations)if(!actionIds.has(migration.actionId))throw new Error(`迁移记录引用的动作不存在：${migration.actionId}`);
  return deepFreeze(project);
}

export function referencedPackageFiles(project){
  const paths=new Set();
  for(const character of project.characters){
    if(character.referenceImage)paths.add(character.referenceImage);
    for(const action of character.actions){
      if(action.source.kind==='video-extraction'&&action.source.video)paths.add(action.source.video);
      for(const frame of action.frames)for(const value of Object.values(frame.assets))if(value)paths.add(value);
    }
  }
  return [...paths].sort();
}

export function selectedFrameImagePath(frame){
  return frame.assets.current||frame.assets.mattingBase||null;
}

function assertSafePath(value){
  if(typeof value!=='string'||value.length<1||value.length>1024||value.startsWith('/')||value.includes('\\')||value.includes(':')||value.startsWith('generated/')||value.split('/').some(part=>!part||part==='.'||part==='..')||/[\x00-\x1f\x7f]/.test(value))
    throw new Error(`资产路径非法：${String(value)}`);
}

function assertPngPath(value){if(!value.toLowerCase().endsWith('.png'))throw new Error(`项目图片必须是PNG：${value}`);}

function assertName(value,label){if([...value].length<1||[...value].length>80)throw new Error(`${label}必须为1到80个字符`);}

function assertReducedRational(value,label){
  if(value.denominator<1||gcd(Math.abs(value.numerator),value.denominator)!==1)throw new Error(`${label}不是已约分的有理数`);
}

function unique(set,value,label){
  if(!ID_PATTERN.test(value))throw new Error(`${label}ID非法：${value}`);
  if(set.has(value))throw new Error(`${label}ID重复：${value}`);
  set.add(value);
}

function assertJsonDepth(root){
  const pending=[[root,0]];
  while(pending.length){
    const [value,depth]=pending.pop();
    if(depth>64)throw new Error('角色清单嵌套层级超过64，拒绝加载');
    if(value&&typeof value==='object')for(const child of Object.values(value))pending.push([child,depth+1]);
  }
}

function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value))deepFreeze(child);
  }
  return value;
}

function gcd(left,right){while(right){[left,right]=[right,left%right];}return left;}

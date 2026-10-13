import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCharacterProjectJson,referencedPackageFiles,selectedFrameImagePath,validateCharacterProject} from '../../integrations/javascript/character-project.js';
import {openCharacterPackage} from '../../integrations/javascript/package-files.js';
import {createCharacterRuntime} from '../../integrations/javascript/runtime.js';

const clone=value=>JSON.parse(JSON.stringify(value));

function packageFile(relative,contents='',type='image/png'){
  const file=new File([contents],relative.split('/').at(-1),{type});
  Object.defineProperty(file,'webkitRelativePath',{value:`character-package/${relative}`});
  return file;
}

function frame(id,actionId,{enabled=true,duration=null,current=true}={}){
  return {id,revision:0,enabled,duration,assets:{
    source:`assets/characters/hero/actions/${actionId}/source/${id}.png`,
    mattingBase:`assets/characters/hero/actions/${actionId}/matting/${id}.png`,
    current:current?`assets/characters/hero/actions/${actionId}/current/${id}.png`:null,
  },source:{sourceFrameId:id,sourceFrameIndex:0,sourceTimeSeconds:null,sourcePts:null,
    sampleTimeSeconds:null,sourceSampleDurationSeconds:null}};
}

function projectFixture(){
  return {formatVersion:2,kind:'action-forge-project',id:'hero-project',name:'英雄动作',revision:2,migrations:[],characters:[{
    id:'hero',name:'英雄',revision:2,referenceImage:null,canvas:{width:512,height:512},origin:{x:256,y:460},
    baseline:{actionId:'run',frameId:'run-1'},scale:{x:1,y:1},actions:[
      {id:'run',name:'跑步',revision:1,loop:true,playback:{mode:'constant-fps',fps:10},
        transform:{offset:{x:0,y:0},scale:{x:1,y:1},rotationDegrees:0},anchor:{frameId:'run-1',x:.5,y:.9},
        source:{kind:'image-sequence',sequenceId:'run-sequence',declaredFps:10},
        frames:[frame('run-1','run'),frame('run-2','run',{current:false}),frame('run-3','run',{enabled:false})],
        events:[{id:'run-start',frameId:'run-1',type:'start',parameters:{}},{id:'run-step',frameId:'run-2',type:'footstep',parameters:{foot:'left'}}]},
      {id:'jump',name:'跳跃',revision:1,loop:false,playback:{mode:'per-frame'},
        transform:{offset:{x:4,y:-6},scale:{x:1.1,y:1.1},rotationDegrees:0},anchor:{frameId:'jump-1',x:.5,y:.85},
        source:{kind:'image-sequence',sequenceId:'jump-sequence',declaredFps:12},
        frames:[frame('jump-1','jump',{duration:{numerator:1,denominator:4}}),frame('jump-2','jump',{duration:{numerator:1,denominator:2}})],
        events:[{id:'jump-land',frameId:'jump-2',type:'land',parameters:{strength:1}}]},
    ],
  }]};
}

test('v2角色资产严格校验、深冻结并列出实际引用文件',()=>{
  const input=projectFixture();
  const project=parseCharacterProjectJson(JSON.stringify(input));
  assert.equal(project.formatVersion,2);
  assert.ok(Object.isFrozen(project.characters[0].actions[0].frames[0]));
  assert.equal(selectedFrameImagePath(project.characters[0].actions[0].frames[0]),'assets/characters/hero/actions/run/current/run-1.png');
  assert.equal(selectedFrameImagePath(project.characters[0].actions[0].frames[1]),'assets/characters/hero/actions/run/matting/run-2.png');
  assert.equal(referencedPackageFiles(project).length,14);
  assert.throws(()=>{project.name='改变';},TypeError);
});

test('外部清单未知字段、路径穿越、重复ID和悬空事件均显式失败',()=>{
  const unsupported=projectFixture();unsupported.formatVersion=1;
  assert.throws(()=>validateCharacterProject(unsupported),/不符合 v2 协议/);
  const unknown=projectFixture();unknown.extra=true;
  assert.throws(()=>validateCharacterProject(unknown),/不符合 v2 协议/);
  const unsafe=projectFixture();unsafe.characters[0].actions[0].frames[0].assets.current='../escape.png';
  assert.throws(()=>validateCharacterProject(unsafe),/资产路径非法/);
  const duplicate=projectFixture();duplicate.characters[0].actions[1].frames[0].id='run-1';
  assert.throws(()=>validateCharacterProject(duplicate),/项目帧ID重复/);
  const dangling=projectFixture();dangling.characters[0].actions[0].events[0].frameId='missing';
  assert.throws(()=>validateCharacterProject(dangling),/引用了不存在或未启用的帧/);
  assert.throws(()=>parseCharacterProjectJson('{oops'),/不是有效JSON/);
});

test('解压目录缺少清单引用文件时停止加载，不展示残缺资产',async()=>{
  const manifest=packageFile('project.json',JSON.stringify(projectFixture()),'application/json');
  await assert.rejects(()=>openCharacterPackage([manifest]),/缺少清单引用文件/);
});

test('固定帧率循环按时间推进并按帧开始顺序补发事件',()=>{
  const emitted=[];const runtime=createCharacterRuntime(projectFixture(),{onEvent:event=>emitted.push(event)});
  let state=runtime.play();
  assert.equal(state.frame.id,'run-1');assert.equal(emitted[0].timeMs,0);
  let result=runtime.advance(100);
  assert.equal(result.snapshot.frame.id,'run-2');assert.equal(result.events[0].type,'footstep');assert.equal(result.events[0].timeMs,100);
  result=runtime.advance(100);
  assert.equal(result.snapshot.frame.id,'run-1');assert.equal(result.snapshot.loopIndex,1);
  assert.equal(result.events[0].type,'start');assert.equal(result.events[0].timeMs,200);
  assert.equal(runtime.getFrameImageReference().variant,'current');
});

test('浏览器小步时钟会跨调用累计，不会卡在首帧',()=>{
  const emitted=[];const runtime=createCharacterRuntime(projectFixture(),{onEvent:event=>emitted.push(event)});
  runtime.play();
  for(let index=0;index<5;index++)runtime.advance(16);
  assert.equal(runtime.snapshot.frame.id,'run-1');assert.equal(runtime.snapshot.frameElapsedMs,80);
  runtime.advance(20);
  assert.equal(runtime.snapshot.frame.id,'run-2');assert.equal(runtime.snapshot.frameElapsedMs,0);
  assert.equal(emitted.at(-1).type,'footstep');assert.equal(emitted.at(-1).timeMs,100);
});

test('逐帧时长非循环动作结束、切换重置、暂停和调速状态明确',()=>{
  const emitted=[];const runtime=createCharacterRuntime(projectFixture(),{onEvent:event=>emitted.push(event)});
  runtime.selectAction('jump');runtime.setSpeed(2);runtime.play();
  let result=runtime.advance(125);
  assert.equal(result.snapshot.frame.id,'jump-2');assert.equal(result.events[0].timeMs,250);
  result=runtime.advance(250);
  assert.equal(result.snapshot.playing,false);assert.equal(result.snapshot.ended,true);assert.equal(result.snapshot.positionMs,750);
  runtime.selectAction('run');assert.equal(runtime.snapshot.frame.id,'run-1');assert.equal(runtime.snapshot.speed,2);
  runtime.play();runtime.pause();const before=runtime.snapshot.positionMs;
  assert.equal(runtime.advance(500).snapshot.positionMs,before);
  runtime.seekFrame(1);assert.equal(runtime.snapshot.frame.id,'run-2');
  assert.throws(()=>runtime.setSpeed(5),/0.1到4倍/);
  assert.throws(()=>runtime.advance(60_001),/0到60000/);
  runtime.dispose();
});

test('未建立共享画布或只有源图时拒绝冒充可运行透明资产',()=>{
  const noCanvas=projectFixture();noCanvas.characters[0].canvas=null;noCanvas.characters[0].origin=null;noCanvas.characters[0].baseline=null;
  const runtime=createCharacterRuntime(noCanvas);assert.throws(()=>runtime.play(),/共享画布与原点/);
  const sourceOnly=projectFixture();sourceOnly.characters[0].actions[0].frames[0].assets.current=null;sourceOnly.characters[0].actions[0].frames[0].assets.mattingBase=null;
  assert.throws(()=>createCharacterRuntime(sourceOnly).play(),/尚未抠图/);
});

test('销毁会停止时钟、清空订阅并拒绝继续复用旧运行时',()=>{
  let emitted=0;const runtime=createCharacterRuntime(projectFixture());
  runtime.subscribe(()=>emitted++);runtime.play();assert.equal(emitted,1);
  const disposed=runtime.dispose();assert.equal(disposed.disposed,true);assert.equal(disposed.playing,false);
  assert.throws(()=>runtime.advance(100),/已销毁/);assert.throws(()=>runtime.play(),/已销毁/);
  assert.equal(emitted,1);
});

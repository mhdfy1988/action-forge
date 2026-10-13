import test from 'node:test';
import assert from 'node:assert/strict';
import {durationMs,eventOffsetMs,eventsAtFrame,fpsToRational,millisecondsToRational,nextFrameIndex,secondsToMilliseconds,totalDurationMs} from '../../web/project-playback.js';

const action=(overrides={})=>({loop:true,playback:{mode:'constant-fps',fps:10},frames:[
  {id:'f1',enabled:true,duration:null},{id:'f2',enabled:true,duration:null},{id:'f3',enabled:false,duration:null},
],events:[{id:'e1',frameId:'f2',type:'footstep',parameters:{foot:'left'}}],...overrides});

test('fixed-fps excludes disabled frames and computes event offset from enabled order',()=>{
  const value=action();
  assert.equal(durationMs(value,value.frames[0]),100);
  assert.equal(totalDurationMs(value),200);
  assert.equal(eventOffsetMs(value,'f2'),100);
  assert.equal(eventOffsetMs(value,'f3'),null);
  assert.equal(eventsAtFrame(value,'f2').length,1);
});

test('per-frame mode sums exact rational frame durations',()=>{
  const value=action({playback:{mode:'per-frame'},frames:[
    {id:'f1',enabled:true,duration:{numerator:1,denominator:10}},
    {id:'f2',enabled:true,duration:{numerator:1,denominator:4}},
  ]});
  assert.equal(totalDurationMs(value),350);
  assert.equal(eventOffsetMs(value,'f2'),100);
});

test('loop wraps only at sequence end; non-loop playback reports end',()=>{
  const value=action();
  assert.deepEqual(nextFrameIndex(value,0),{index:1,ended:false});
  assert.deepEqual(nextFrameIndex(value,1),{index:0,ended:false});
  value.loop=false;
  assert.deepEqual(nextFrameIndex(value,1),{index:1,ended:true});
});

test('milliseconds serialize as reduced rational seconds',()=>{
  assert.deepEqual(millisecondsToRational(250),{numerator:1,denominator:4});
  assert.deepEqual(millisecondsToRational(80),{numerator:2,denominator:25});
  assert.equal(secondsToMilliseconds({numerator:2,denominator:25}),80);
  assert.throws(()=>millisecondsToRational(0),/1到60000/);
});

test('switching from fixed fps preserves exact frame duration instead of rounding to milliseconds',()=>{
  assert.deepEqual(fpsToRational(60),{numerator:1,denominator:60});
  assert.equal(secondsToMilliseconds(fpsToRational(60)),17);
  assert.throws(()=>fpsToRational(0),/帧率必须是1到60的整数/);
});

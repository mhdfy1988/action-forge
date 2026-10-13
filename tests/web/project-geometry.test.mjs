import test from 'node:test';
import assert from 'node:assert/strict';
import {actionPlacement,pointOnImage} from '../../web/project-geometry.js';

test('动作锚点映射到共享画布原点，整组缩放与偏移保持可逆坐标',()=>{
  const placement=actionPlacement({imageWidth:1280,imageHeight:720,canvasWidth:512,canvasHeight:512,
    origin:{x:256,y:400},characterScale:{x:1,y:1},transform:{offset:{x:12,y:-8},scale:{x:1.2,y:1.2}},anchor:{x:.25,y:.9}});
  assert.ok(Math.abs(placement.width-614.4)<1e-8);
  assert.ok(Math.abs(placement.height-345.6)<1e-8);
  assert.ok(Math.abs(placement.x+placement.width*.25-268)<1e-8);
  assert.ok(Math.abs(placement.y+placement.height*.9-392)<1e-8);
  const rect={left:10,top:20,width:512,height:512};
  const point=pointOnImage({clientX:10+placement.x+placement.width*.25,
    clientY:20+placement.y+placement.height*.9,rect,placement,canvasWidth:512,canvasHeight:512});
  assert.ok(Math.abs(point.x-.25)<1e-8);assert.ok(Math.abs(point.y-.9)<1e-8);
  assert.equal(pointOnImage({clientX:12,clientY:22,rect,placement,canvasWidth:512,canvasHeight:512}),null);
});

test('图像适配共享画布但由锚点控制位置，尺寸非法显式失败',()=>{
  const placement=actionPlacement({imageWidth:1280,imageHeight:720,canvasWidth:512,canvasHeight:512,
    origin:{x:256,y:256},transform:{offset:{x:0,y:0},scale:{x:1,y:1}},anchor:{x:.5,y:.5}});
  assert.equal(placement.width,512);
  assert.equal(placement.height,288);
  assert.equal(placement.x,0);
  assert.equal(placement.y,112);
  assert.throws(()=>actionPlacement({imageWidth:0,imageHeight:720,canvasWidth:512,canvasHeight:512,
    origin:{x:0,y:0},transform:{offset:{x:0,y:0},scale:{x:1,y:1}}}),/尺寸必须/);
});

test('锚点拾取会反算旋转，不把画面坐标误当源图坐标',()=>{
  const placement=actionPlacement({imageWidth:100,imageHeight:50,canvasWidth:200,canvasHeight:200,
    origin:{x:100,y:100},transform:{offset:{x:0,y:0},scale:{x:1,y:1},rotationDegrees:90},anchor:{x:.5,y:1}});
  const rect={left:0,top:0,width:200,height:200};
  const clicked={x:placement.pivotX+Math.cos(Math.PI/2)*(0-placement.anchor.x*placement.width)-Math.sin(Math.PI/2)*(0-placement.anchor.y*placement.height),
    y:placement.pivotY+Math.sin(Math.PI/2)*(0-placement.anchor.x*placement.width)+Math.cos(Math.PI/2)*(0-placement.anchor.y*placement.height)};
  const point=pointOnImage({clientX:clicked.x,clientY:clicked.y,rect,placement,canvasWidth:200,canvasHeight:200});
  assert.ok(Math.abs(point.x)<1e-8);assert.ok(Math.abs(point.y)<1e-8);
});

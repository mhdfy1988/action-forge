export function actionPlacement({imageWidth,imageHeight,canvasWidth,canvasHeight,origin,
  characterScale={x:1,y:1},transform,anchor}){
  if(![imageWidth,imageHeight,canvasWidth,canvasHeight].every(value=>Number.isFinite(value)&&value>0))
    throw new RangeError('画布与图像尺寸必须为正数');
  const fit=Math.min(canvasWidth/imageWidth,canvasHeight/imageHeight);
  const sx=fit*characterScale.x*transform.scale.x;
  const sy=fit*characterScale.y*transform.scale.y;
  const pivot=anchor||{x:.5,y:.5};
  const width=imageWidth*sx,height=imageHeight*sy;
  const pivotX=origin.x+transform.offset.x,pivotY=origin.y+transform.offset.y;
  return {x:pivotX-pivot.x*width,y:pivotY-pivot.y*height,width,height,
    pivotX,pivotY,anchor:pivot,scaleX:sx,scaleY:sy,rotationDegrees:transform.rotationDegrees||0};
}

export function pointOnImage({clientX,clientY,rect,placement,canvasWidth,canvasHeight}){
  const x=(clientX-rect.left)*canvasWidth/rect.width;
  const y=(clientY-rect.top)*canvasHeight/rect.height;
  const radians=-(placement.rotationDegrees||0)*Math.PI/180;
  const dx=x-placement.pivotX,dy=y-placement.pivotY;
  const localX=dx*Math.cos(radians)-dy*Math.sin(radians)+placement.anchor.x*placement.width;
  const localY=dx*Math.sin(radians)+dy*Math.cos(radians)+placement.anchor.y*placement.height;
  if(localX<0||localY<0||localX>placement.width||localY>placement.height)
    return null;
  return {x:localX/placement.width,y:localY/placement.height};
}

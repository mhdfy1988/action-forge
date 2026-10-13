import {connectedMask,seedColorDistance} from './workflow-cleanup-core.js';
self.onmessage=async({data})=>{
  try{
    const {sourceBlob,blob,preset}=data,source=await createImageBitmap(sourceBlob),current=await createImageBitmap(blob);
    const width=source.width,height=source.height,n=width*height;
    if(n>12000000||current.width!==width||current.height!==height){source.close();current.close();throw new Error('自动清理图片尺寸无效');}
    const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0);source.close();const original=ctx.getImageData(0,0,width,height).data;
    ctx.clearRect(0,0,width,height);ctx.drawImage(current,0,0);current.close();const image=ctx.getImageData(0,0,width,height),mask=new Uint8Array(n);
    // 自动背景取边缘最常见的量化色；自定义背景仍只清理边缘连通区域。
    const edges=[];for(let x=0;x<width;x++){edges.push(x,(height-1)*width+x);}for(let y=1;y<height-1;y++){edges.push(y*width,y*width+width-1);}
    let color=preset.color.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16));
    if(preset.background==='auto'){
      const bins=new Map();for(const i of edges){if(!original[i*4+3])continue;const rgb=Array.from(original.subarray(i*4,i*4+3)),key=rgb.map(v=>v>>4).join(',');const bin=bins.get(key)||{count:0,rgb};bin.count++;bins.set(key,bin);}
      const best=[...bins.values()].sort((a,b)=>b.count-a.count)[0];if(!best)throw new Error('边缘无可识别背景，请指定背景色');color=best.rgb;
    }
    const difference=seedColorDistance(...color);let components=0;
    for(const seed of edges){
      if(mask[seed]===255||!original[seed*4+3]||difference(...original.subarray(seed*4,seed*4+3))>preset.tolerance)continue;
      if(++components>64)throw new Error('背景边缘过于复杂，请关闭自动清理后人工精修');
      const region=connectedMask(original,width,height,seed%width,Math.floor(seed/width),preset.tolerance,preset.smooth);
      for(let i=0;i<n;i++)if(region[i]>mask[i])mask[i]=region[i];
    }
    let before=0,after=0;
    for(let i=0;i<n;i++){before+=image.data[i*4+3];image.data[i*4+3]=Math.round(image.data[i*4+3]*(1-mask[i]/255));after+=image.data[i*4+3];}
    if(before>0&&after===0)throw new Error('背景清理会擦除整帧，请降低容差或关闭自动清理');
    ctx.putImageData(image,0,0);self.postMessage({blob:await canvas.convertToBlob({type:'image/png'})});
  }catch(error){self.postMessage({error:error.message});}
};

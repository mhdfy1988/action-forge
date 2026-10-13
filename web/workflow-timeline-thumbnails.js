// 只解码可见范围及相邻预取范围，最多两个并发；离开范围立即释放地址和图片。
export function createTimelineThumbnails(strip,getBlob){
  const slots=new Map();let active=0,disposed=false;const queue=[];
  const metrics=()=>{strip.dataset.loadedThumbnails=String([...slots.values()].filter(slot=>slot.url).length);};
  function release(image,slot){slot.wanted=false;slot.ticket++;if(slot.url)URL.revokeObjectURL(slot.url);slot.url=null;image.removeAttribute('src');metrics();}
  async function pump(){
    if(disposed)return;
    while(active<2&&queue.length){const [image,slot,ticket]=queue.shift();if(!slot.wanted||ticket!==slot.ticket)continue;active++;
      (async()=>{let bitmap;
        try{
          bitmap=await createImageBitmap(getBlob(image.dataset.frameId));
          const scale=Math.min(1,240/bitmap.width,140/bitmap.height),canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));
          canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
          const blob=await canvas.convertToBlob({type:'image/png'});
          if(disposed||!slot.wanted||ticket!==slot.ticket)return;
          slot.url=URL.createObjectURL(blob);image.src=slot.url;image.dataset.loaded='true';metrics();
        }catch(error){if(!disposed&&slot.wanted&&ticket===slot.ticket){image.alt='缩略图读取失败';image.title=error.message;}}
        finally{bitmap?.close();active--;pump();}
      })();
    }
  }
  const observer=new IntersectionObserver(entries=>{
    for(const {target:image,isIntersecting} of entries){const slot=slots.get(image);if(!slot)continue;
      if(isIntersecting&&!slot.wanted){slot.wanted=true;queue.push([image,slot,++slot.ticket]);}
      else if(!isIntersecting&&slot.wanted){release(image,slot);delete image.dataset.loaded;}
    }pump();
  },{root:strip,rootMargin:'0px 240px'});
  return {observe(image){const slot={wanted:false,ticket:0,url:null};slots.set(image,slot);observer.observe(image);},dispose(){disposed=true;observer.disconnect();queue.length=0;for(const [image,slot] of slots)release(image,slot);slots.clear();metrics();}};
}

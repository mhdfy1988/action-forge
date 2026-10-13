import {sourceAsset,invalidateResults} from './workflow-core.js';
import {hashBytes} from './workflow-extraction.js';

export const MATTING_POLICY='model-local-despill-v1';
const BASE='/api/workflow-matting/jobs';
// 抽帧协议的帧ID尾号是稳定的采样序号；sourceFrameIndex另指视频解码帧，不能混用。
export function mattingFrameNumber(frame){
  if(!/^[a-f0-9]{32}-[0-9]{6}$/.test(frame.id))throw new Error('原始帧身份无效');
  const number=Number(frame.id.slice(-6));if(number<1)throw new Error('原始帧编号无效');return number;
}
export function mattingInput(project,nodeId){
  const node=project.nodes.find(item=>item.id===nodeId);
  if(node?.type!=='remove-background')throw new Error('透明背景节点不存在');
  if(node.parameters.despillStrength!=null)throw new Error('此节点保存了未支持的去绿强度，请清除该参数后再处理');
  const edge=project.connections.find(item=>item.toNode===nodeId&&item.toPort==='frames'),asset=edge&&sourceAsset(project,edge.fromNode,'frames'),result=edge&&project.results.find(item=>item.nodeId===edge.fromNode);
  if(asset?.type!=='frame-set/source'||!result?.confirmed)throw new Error('请先连接已确认的原始序列帧');
  return {node,asset,fingerprint:JSON.stringify({implementation:MATTING_POLICY,definitionVersion:node.definitionVersion,parameters:node.parameters,input:asset,signature:result.resultSignature})};
}
export function reusableFrame(input,previous){return previous?.policy===MATTING_POLICY&&previous.frames?.find(frame=>frame.id===input.id&&frame.sourceHash===input.contentHash&&frame.autoBlob&&frame.blob);}
export function attachTransparent(project,nodeId,record,signature){
  const {node}=mattingInput(project,nodeId);
  if(record.kind!=='frame-set/transparent'||!record.frames.length||record.frames.some(frame=>!frame.autoBlob||!frame.blob))throw new Error('透明结果不完整');
  const next=invalidateResults(project,nodeId),asset={id:record.id,type:record.kind,revision:1,path:`media/${record.id}`,contentHash:record.contentHash};
  return {...next,revision:next.revision+1,assets:[...next.assets,asset],results:[...next.results.filter(item=>item.nodeId!==nodeId),{nodeId,definitionVersion:node.definitionVersion,resultSignature:signature,confirmed:true,outputs:[{port:'frames',asset:{id:asset.id,revision:1}}]}]};
}
export async function mattingApi(path,options={}){
  const response=await fetch(BASE+path,options);
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(response.status===404?'透明背景接口不可用或任务已过期，请更新主服务':typeof data.detail==='string'?data.detail:'透明背景请求失败');}
  return response;
}
export async function sealTransparent(record){
  const frames=await Promise.all(record.frames.map(async frame=>({...frame,contentHash:await hashBytes(await frame.blob.arrayBuffer())})));
  return {...record,id:crypto.randomUUID(),frames,contentHash:await hashBytes(JSON.stringify({policy:MATTING_POLICY,frames:frames.map(frame=>[frame.id,frame.contentHash,frame.durationSeconds])}))};
}
export function createMattingTask(){
  let cancelled=false,jobId=null;
  return {get cancelled(){return cancelled;},async cancel(){cancelled=true;if(jobId)await mattingApi(`/${jobId}/cancel`,{method:'POST'});},
    async execute(input,previous,onProgress=()=>{}){
      const cached=input.frames.map(frame=>reusableFrame(frame,previous));
      const metadata={name:input.name,width:input.width,height:input.height,policy:MATTING_POLICY,frames:input.frames.map((frame,index)=>({id:frame.id,sourceIndex:mattingFrameNumber(frame)-1,sourceTimeSeconds:frame.sourceTimeSeconds??null,durationSeconds:frame.durationSeconds,contentHash:frame.contentHash,cached:!!cached[index],revision:cached[index]?.revision||0}))};
      let total=0;
      for(const [index,frame] of input.frames.entries())for(const blob of [frame.blob,...(cached[index]?[cached[index].autoBlob,cached[index].blob]:[])]){total+=blob.size;if(total>256*1024**2)throw new Error('源帧与恢复结果超过256 MiB预算，请缩短序列');}
      if(cancelled)throw new Error('已取消');
      onProgress({stage:'准备透明背景任务',completed:0,total:input.frames.length});
      const started=await (await mattingApi('',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(metadata)})).json();jobId=started.id;
      try{
        for(const [index,frame] of input.frames.entries()){
          if(cancelled)throw new Error('已取消');
          onProgress({stage:`上传帧 ${index+1} / ${input.frames.length}`,completed:0,total:input.frames.length});
          for(const [variant,blob] of [['source',frame.blob],...(cached[index]?[['auto',cached[index].autoBlob],['current',cached[index].blob]]:[])]){
            if(cancelled)throw new Error('已取消');
            await mattingApi(`/${jobId}/upload/${index}/${variant}`,{method:'PUT',headers:{'content-type':'image/png'},body:blob});
          }
        }
        let state=await (await mattingApi(`/${jobId}/run`,{method:'POST'})).json(),deadline=Date.now()+46*60*1000;
        while(['running','cancelling'].includes(state.status)){
          if(cancelled||Date.now()>deadline){const message=cancelled?'已取消':'处理超时，已请求停止';await this.cancel();throw new Error(message);}
          onProgress(state);await new Promise(resolve=>setTimeout(resolve,250));state=await (await mattingApi(`/${jobId}`)).json();
        }
        if(cancelled||state.status==='cancelled')throw new Error('已取消');
        if(state.status!=='done')throw new Error(`${state.error||'透明背景处理失败'}${state.failedFrameId?`（${state.failedFrameId}）`:''}`);
        const frames=[];let bytes=0;
        for(const [index,frame] of input.frames.entries()){
          if(cancelled)throw new Error('已取消');onProgress({stage:`保存透明帧 ${index+1} / ${input.frames.length}`,completed:index,total:input.frames.length});
          const blobs=[];
          for(const variant of ['auto','current']){
            const blob=await (await mattingApi(`/${jobId}/frames/${frame.id}/${variant}`)).blob();bytes+=blob.size;if(bytes>256*1024**2)throw new Error('透明结果超过256 MiB保存预算');
            const image=await createImageBitmap(blob),valid=image.width===input.width&&image.height===input.height;image.close();if(!valid)throw new Error('透明帧尺寸无效');blobs.push(blob);
          }
          frames.push({...frame,sourceBlob:frame.blob,sourceHash:frame.contentHash,autoBlob:blobs[0],blob:blobs[1],revision:state.revisions[frame.id]});
        }
        return await sealTransparent({kind:'frame-set/transparent',name:input.name,width:input.width,height:input.height,policy:MATTING_POLICY,sequence:input.sequence,frames,batchId:jobId});
      }catch(error){await this.cancel().catch(()=>{});throw error;}
    }
  };
}

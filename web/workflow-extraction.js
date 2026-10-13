import {sourceAsset,invalidateResults} from './workflow-core.js';

const BASE='/api/workflow-extraction';
export const EXTRACT_VERSION='ffmpeg-nearest-v1';
export async function hashBytes(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');}
export function extractionInput(project,nodeId){
  const node=project.nodes.find(node=>node.id===nodeId);if(!['extract-frames','process-frames'].includes(node?.type))throw new Error('抽帧节点不存在');
  const edge=project.connections.find(edge=>edge.toNode===nodeId&&edge.toPort===(node.type==='process-frames'?'source':'video'));if(!edge)throw new Error('请先连接动作视频');
  const asset=sourceAsset(project,edge.fromNode),result=project.results.find(result=>result.nodeId===edge.fromNode);
  if(asset?.type!=='action-video'||!result?.confirmed)throw new Error('上游视频未就绪，请先导入或确认采用');
  return {node,asset,result};
}
export function extractionParameters(node,duration){const parameters={startSeconds:node.parameters.startSeconds??0,endSeconds:node.parameters.endSeconds??duration,fps:node.parameters.fps??12};if(!Number.isFinite(parameters.startSeconds)||!Number.isFinite(parameters.endSeconds)||parameters.startSeconds<0||parameters.endSeconds<=parameters.startSeconds||parameters.endSeconds>duration)throw new Error('时间范围须在视频内，且结束大于开始');if(!Number.isInteger(parameters.fps)||parameters.fps<1||parameters.fps>60)throw new Error('采样帧率须为1–60的整数');if(parameters.endSeconds-parameters.startSeconds>60||Math.ceil((parameters.endSeconds-parameters.startSeconds)*parameters.fps)>600)throw new Error('单次最多60秒、600帧，请缩短范围或降低帧率');return parameters;}
export function extractionFingerprint(project,nodeId){const {node,asset,result}=extractionInput(project,nodeId);return JSON.stringify({implementation:EXTRACT_VERSION,definitionVersion:node.definitionVersion,input:{id:asset.id,revision:asset.revision,hash:asset.contentHash,signature:result.resultSignature},parameters:node.parameters});}
export function attachFrameSet(project,nodeId,record,signature){const {node}=extractionInput(project,nodeId),next=invalidateResults(project,nodeId),asset={id:record.id,type:'frame-set/source',revision:1,path:`media/${record.id}`,contentHash:record.contentHash};return {...next,revision:project.revision+1,assets:[...project.assets,asset],results:[...next.results.filter(result=>result.nodeId!==nodeId),{nodeId,definitionVersion:node.definitionVersion,resultSignature:signature,confirmed:true,outputs:[{port:'frames',asset:{id:asset.id,revision:1}}]}]};}

async function api(path,options={}){const response=await fetch(BASE+path,options);if(!response.ok){let message='抽帧服务请求失败';try{const data=await response.json();message=typeof data.detail==='string'?data.detail:message;}catch{}throw new Error(response.status===404?'抽帧接口不可用或任务已过期，请确认主服务已更新':message);}return response;}
export function createExtractionTask(){let cancelled=false,jobId=null,abort=new AbortController();return {
  get cancelled(){return cancelled;},
  async cancel(){cancelled=true;if(jobId)await api(`/jobs/${jobId}/cancel`,{method:'POST'});else abort.abort();},
  async execute(record,parameters,onProgress){
    onProgress({stage:'上传并读取视频',progress:null});
    const video=await (await api('/videos',{method:'POST',headers:{'x-file-name':encodeURIComponent(record.name)},body:record.blob,signal:abort.signal})).json();
    if(cancelled)throw new Error('已取消');
    // 片尾默认值采用探测后的精确时长，不能任意延长用户自定义范围。
    if(parameters.endSeconds===record.duration)parameters={...parameters,endSeconds:video.duration};
    const started=await (await api('/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({videoId:video.id,start:parameters.startSeconds,end:parameters.endSeconds,fps:parameters.fps})})).json();jobId=started.id;
    if(cancelled)await api(`/jobs/${jobId}/cancel`,{method:'POST'});
    let result=started,deadline=Date.now()+180000;
    while(['running','cancelling'].includes(result.status)){if(Date.now()>deadline){await this.cancel();throw new Error('等待任务超时，已请求停止');}onProgress(result);await new Promise(resolve=>setTimeout(resolve,250));result=await (await api(`/jobs/${jobId}`)).json();}
    if(cancelled||result.status==='cancelled')throw new Error('已取消');if(result.status!=='done')throw new Error(result.error||'抽帧失败');
    const sequence=result.sequence;
    if(sequence?.formatVersion!==2||!Array.isArray(sequence.frames)||!sequence.frames.length||sequence.frames.length>600||sequence.source?.sha256!==record.contentHash)throw new Error('抽帧返回的来源或清单无效');
    const frames=[];let total=0;
    for(const [index,frame] of sequence.frames.entries()){
      if(cancelled)throw new Error('已取消');onProgress({stage:`保存原始帧 ${index+1} / ${sequence.frames.length}`,progress:100});
      const response=await api(`/jobs/${jobId}/frames/${index+1}`),length=Number(response.headers.get('content-length'));
      if(total+length>256*1024**2)throw new Error('帧集超过本机256 MiB保存预算，请缩短范围');
      const blob=await response.blob();total+=blob.size;if(total>256*1024**2)throw new Error('帧集超过本机256 MiB保存预算，请缩短范围');
      const bitmap=await createImageBitmap(blob);const valid=bitmap.width===sequence.canvas.width&&bitmap.height===sequence.canvas.height;bitmap.close();if(!valid)throw new Error('抽帧尺寸校验失败');
      frames.push({...frame,blob,contentHash:await hashBytes(await blob.arrayBuffer())});
    }
    if(cancelled)throw new Error('已取消');
    const contentHash=await hashBytes(JSON.stringify({sequence,hashes:frames.map(frame=>frame.contentHash)}));
    return {id:crypto.randomUUID(),kind:'frame-set/source',name:sequence.name,width:sequence.canvas.width,height:sequence.canvas.height,sequence,frames,contentHash,parameters};
  },
};}

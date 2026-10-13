import {FrameEditor} from './organizer-core.js';
import {sourceAsset,invalidateResults} from './workflow-core.js';
import {hashBytes} from './workflow-extraction.js';

export function organizerInput(project,nodeId,extracted=null){
  const node=project.nodes.find(item=>item.id===nodeId);
  if(!['organize-frames','process-frames'].includes(node?.type))throw new Error('整理节点不存在');
  if(node.type==='process-frames'&&extracted){
    const asset={id:extracted.id,type:extracted.kind,revision:1,contentHash:extracted.contentHash};
    return {node,asset,fingerprint:JSON.stringify({implementation:'frame-organizer-v1',definitionVersion:node.definitionVersion,input:asset})};
  }
  const edge=project.connections.find(item=>item.toNode===nodeId&&item.toPort===(node.type==='process-frames'?'source':'frames'));
  const asset=edge&&sourceAsset(project,edge.fromNode,'frames'),result=edge&&project.results.find(item=>item.nodeId===edge.fromNode);
  if(!asset||!result?.confirmed||!['frame-set/source','frame-set/transparent'].includes(asset.type))throw new Error('请先连接已就绪的序列帧');
  return {node,asset,fingerprint:JSON.stringify({implementation:'frame-organizer-v1',definitionVersion:node.definitionVersion,parameters:node.parameters,input:asset,signature:result.resultSignature})};
}
export function createOrganizerEditor(record,draft){
  const editor=new FrameEditor({...record.sequence,formatVersion:2,frames:record.frames.map(({blob,...frame})=>frame)});
  editor.selectAll();
  if(draft){
    const valid=snapshot=>snapshot&&Array.isArray(snapshot.order)&&new Set(snapshot.order).size===snapshot.order.length&&snapshot.order.every(id=>editor.byId.has(id))&&Array.isArray(snapshot.selected)&&snapshot.selected.every(id=>snapshot.order.includes(id))&&(snapshot.active===null||snapshot.order.includes(snapshot.active));
    if(!valid(draft.snapshot)||!Array.isArray(draft.undo)||!Array.isArray(draft.redo)||draft.undo.length>100||draft.redo.length>100||![...draft.undo,...draft.redo].every(valid))throw new Error('整理草稿无效，未自动覆盖');
    editor.restore(draft.snapshot);editor.undoStack=draft.undo;editor.redoStack=draft.redo;
  }
  return editor;
}
export function organizerDraft(editor){return {snapshot:editor.snapshot(),undo:structuredClone(editor.undoStack),redo:structuredClone(editor.redoStack)};}
export function organizerOutputIds(editor){return editor.order.filter(id=>editor.selected.has(id));}
export function organizerOutputSignature(editor){return organizerOutputIds(editor).join('|');}
export function recordOrganizerSelection(editor,before){
  if(editor.order.join('|')!==before.order.join('|')||[...editor.selected].sort().join('|')===[...before.selected].sort().join('|'))return false;
  editor.undoStack.push(before);if(editor.undoStack.length>100)editor.undoStack.shift();editor.redoStack=[];editor.revision++;return true;
}
export function restoreOrganizerFrame(editor,id){
  if(editor.order.includes(id)||!editor.byId.has(id))return false;
  // 优先恢复到最后一次删除前的相邻位置，避免破坏已经手动交换过的顺序。
  const order=[...editor.undoStack].reverse().find(snapshot=>snapshot.order.includes(id))?.order||editor.original;
  const following=order.slice(order.indexOf(id)+1).find(value=>editor.order.includes(value));
  const next=[...editor.order];next.splice(following?next.indexOf(following):next.length,0,id);return editor.commit(next);
}
export async function organizedRecord(input,editor){
  const outputIds=organizerOutputIds(editor);
  if(!outputIds.length)throw new Error('请至少勾选一帧');
  const byId=new Map(input.frames.map(frame=>[frame.id,frame]));
  if(new Set(editor.order).size!==editor.order.length||editor.order.some(id=>!byId.has(id)))throw new Error('整理帧身份无效');
  const frames=outputIds.map(id=>({...byId.get(id)}));
  const sequence={...input.sequence,frames:frames.map(({blob,contentHash,...frame})=>frame)};
  return {id:crypto.randomUUID(),kind:input.kind,name:input.name,width:input.width,height:input.height,sequence,frames,contentHash:await hashBytes(JSON.stringify({sequence,hashes:frames.map(frame=>frame.contentHash)}))};
}
export function attachOrganized(project,nodeId,record,signature,extracted=null){
  const {node,asset:input}=organizerInput(project,nodeId,extracted);
  if(!record.frames.length||record.kind!==input.type)throw new Error('整理输出类型或帧集无效');
  const next=invalidateResults(project,nodeId),asset={id:record.id,type:input.type,revision:1,path:`media/${record.id}`,contentHash:record.contentHash};
  return {...next,revision:next.revision+1,assets:[...next.assets,asset],results:[...next.results.filter(item=>item.nodeId!==nodeId),{nodeId,definitionVersion:node.definitionVersion,resultSignature:signature,confirmed:true,outputs:[{port:'frames',asset:{id:asset.id,revision:1}}]}]};
}

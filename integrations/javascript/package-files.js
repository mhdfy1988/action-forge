import {parseCharacterProjectJson,referencedPackageFiles} from './character-project.js';

const MAX_FILE_COUNT=20_000;
const MAX_MANIFEST_BYTES=8*1024*1024;
const MAX_PNG_BYTES=64*1024*1024;
const MAX_TOTAL_BYTES=2*1024*1024*1024;

/** 从浏览器目录选择器建立只读文件索引；不解压、不上传、不写回资产包。 */
export async function openCharacterPackage(fileList){
  const files=[...fileList];
  if(!files.length)throw new Error('所选文件夹为空');
  if(files.length>MAX_FILE_COUNT)throw new Error(`资产包文件数超过${MAX_FILE_COUNT}，拒绝加载`);
  if(files.reduce((total,file)=>total+file.size,0)>MAX_TOTAL_BYTES)throw new Error('资产包总大小超过2GiB，拒绝加载');
  const roots=new Set(),index=new Map();
  for(const file of files){
    const parts=(file.webkitRelativePath||file.name).replaceAll('\\','/').split('/');
    if(parts.length<2||!parts[0]||parts[0]==='.'||parts[0]==='..')throw new Error('请选择包含 project.json 的解压后资产包文件夹');
    roots.add(parts[0]);
    const relative=parts.slice(1).join('/');
    if(!relative||relative.split('/').some(part=>!part||part==='.'||part==='..')||relative.includes(':'))throw new Error(`文件路径非法：${relative}`);
    if(index.has(relative))throw new Error(`资产包内出现重名文件：${relative}`);
    index.set(relative,file);
  }
  if(roots.size!==1)throw new Error('请选择单个解压后的角色资产包文件夹');
  const manifest=index.get('project.json');
  if(!manifest)throw new Error('资产包根目录缺少 project.json');
  if(manifest.size>MAX_MANIFEST_BYTES)throw new Error('project.json 超过8MiB，拒绝加载');
  const project=parseCharacterProjectJson(await manifest.text());
  const required=referencedPackageFiles(project),pngPaths=new Set();
  for(const character of project.characters){
    if(character.referenceImage)pngPaths.add(character.referenceImage);
    for(const action of character.actions)for(const frame of action.frames){
      pngPaths.add(frame.assets.source);
      if(frame.assets.mattingBase)pngPaths.add(frame.assets.mattingBase);
      if(frame.assets.current)pngPaths.add(frame.assets.current);
    }
  }
  for(const relative of required){
    const file=index.get(relative);
    if(!file)throw new Error(`资产包缺少清单引用文件：${relative}`);
    if(pngPaths.has(relative)){
      if(!relative.toLowerCase().endsWith('.png')||(file.type&&file.type!=='image/png'))throw new Error(`项目图片必须是PNG：${relative}`);
      if(file.size>MAX_PNG_BYTES)throw new Error(`PNG文件超过64MiB：${relative}`);
    }
  }
  return Object.freeze({project,rootName:[...roots][0],fileCount:files.length,loadBitmap:(relative)=>loadBitmap(index,relative)});
}

async function loadBitmap(index,relative){
  const file=index.get(relative);
  if(!file)throw new Error(`资产包缺少图片：${relative}`);
  if(!relative.toLowerCase().endsWith('.png')||(file.type&&file.type!=='image/png'))throw new Error(`图片格式不是PNG：${relative}`);
  if(file.size>MAX_PNG_BYTES)throw new Error(`PNG文件超过64MiB：${relative}`);
  try{return await createImageBitmap(file);}catch{throw new Error(`PNG无法解码：${relative}`);}
}

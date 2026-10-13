// 独立页内置模型库使用的公开姿势包；文件留在output，只有用户选择此模型才载入。
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://app.cinevva.com/rigging/clips/',folder=new URL('../output/fixtures/poses/',import.meta.url);
const response=await fetch(base+'MakeHumanPoses.json');if(!response.ok)throw new Error('姿势来源清单下载失败');
const metadata=await response.json();if(metadata.license!=='CC0-1.0'||metadata.poses.length!==99)throw new Error('姿势包许可或数量与已核对清单不一致');
const asset=await fetch(base+'MakeHumanPoses.glb');if(!asset.ok)throw new Error('姿势包下载失败');const bytes=Buffer.from(await asset.arrayBuffer());
if(bytes.readUInt32LE(0)!==0x46546c67)throw new Error('不是有效GLB');
const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());if(data.animations.length!==99)throw new Error('姿势动画数量不匹配');
await mkdir(folder,{recursive:true});await writeFile(new URL('MakeHumanPoses.glb',folder),bytes);await writeFile(new URL('MakeHumanPoses.json',folder),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({file:'output/fixtures/poses/MakeHumanPoses.glb',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),clips:data.animations.length,joints:data.skins.map(s=>s.joints.length)}));

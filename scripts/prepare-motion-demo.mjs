// 官方 CC0 示例只用于独立验证，下载文件不进入版本库。
import {mkdir,writeFile} from 'node:fs/promises';
const url='https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
const response=await fetch(url);
if(!response.ok)throw new Error(`示例下载失败：${response.status}`);
const folder=new URL('../output/fixtures/',import.meta.url);
await mkdir(folder,{recursive:true});
await writeFile(new URL('RobotExpressive.glb',folder),new Uint8Array(await response.arrayBuffer()));
console.log('RobotExpressive.glb ready (CC0, three.js r186 sample)');
// 作者免费版的公开glTF镜像；保留许可，不下载收费版。
const humanFolder=new URL('quaternius/',folder);
await mkdir(humanFolder,{recursive:true});
for(const name of ['glTF/AnimationLibrary_Godot_Standard.gltf','glTF/AnimationLibrary_Godot_Standard.bin','LICENSE']){
  const result=await fetch(`https://raw.githubusercontent.com/J-Ponzo/gltf-universal-animation-library/main/${name}`);
  if(!result.ok)throw new Error(`人偶下载失败：${name} (${result.status})`);
  await writeFile(new URL(name.split('/').pop(),humanFolder),new Uint8Array(await result.arrayBuffer()));
}
console.log('Quaternius standard humanoid ready (CC0, public glTF mirror)');

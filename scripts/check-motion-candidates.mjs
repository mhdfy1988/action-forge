import {readFile,readdir,writeFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelInfo} from '../web/labs/motion/three-adapter.js';
import {defaultBoneName} from '../web/labs/motion/default-poses.js';
globalThis.ProgressEvent??=class{constructor(type,fields){Object.assign(this,fields);}};
const loader=new GLTFLoader(),root='output/fixtures/candidates';
const json=JSON.parse(await readFile('output/fixtures/quaternius/AnimationLibrary_Godot_Standard.gltf','utf8'));
json.buffers[0].uri='data:application/octet-stream;base64,'+(await readFile('output/fixtures/quaternius/AnimationLibrary_Godot_Standard.bin')).toString('base64');
const target=await loader.parseAsync(JSON.stringify(json),'');
const files=(await readdir(root,{recursive:true})).filter(p=>p.endsWith('.glb'));
const reports=[];
for(const file of files){
 // Node结构验收不解码贴图；浏览器另验原始文件的真实渲染。
 const bytes=await readFile(root+'/'+file),length=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+length).toString('utf8')),offset=20+length;
 data.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(offset+8).toString('base64');delete data.images;delete data.textures;delete data.materials;for(const mesh of data.meshes??[])for(const primitive of mesh.primitives)delete primitive.material;
 const asset=await loader.parseAsync(JSON.stringify(data),'');
 const info=modelInfo(asset.scene),bones=info.bones,map=new Map(bones.map(b=>[b.name,b]));let maxPosition=0,maxAngle=0;const missing=[],parents=[];
 for(const bone of modelInfo(target.scene).bones){const other=map.get(defaultBoneName(bone.name));if(!other){missing.push(bone.name);continue;}maxPosition=Math.max(maxPosition,bone.position.distanceTo(other.position));maxAngle=Math.max(maxAngle,bone.quaternion.clone().normalize().angleTo(other.quaternion.clone().normalize()));if((bone.parent?.isBone?defaultBoneName(bone.parent.name):'')!==(other.parent?.isBone?other.parent.name:''))parents.push(bone.name);}
 let meshes=0;asset.scene.traverse(n=>{if(n.isMesh)meshes++;});
 const report={file,bones:bones.length,meshes,skins:info.skins.length,animations:asset.animations.length,names:asset.animations.map(c=>c.name),durationRange:asset.animations.length?[Math.min(...asset.animations.map(c=>c.duration)),Math.max(...asset.animations.map(c=>c.duration))]:[],compatibility:{missing,parents,maxPosition,maxAngle},firstTracks:asset.animations[0]?.tracks.slice(0,8).map(t=>t.name)};
 reports.push(report);console.log(JSON.stringify(report));
}
await writeFile(root+'/inspection.json',JSON.stringify(reports,null,2));

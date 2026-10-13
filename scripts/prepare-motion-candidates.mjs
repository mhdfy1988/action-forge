// 仅下载免费标准版和公开资源；候选文件留在output，不自动替换用户模型。
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const folder=new URL('../output/fixtures/candidates/',import.meta.url),cookies=new Map();
async function request(url,options={}){
 const headers=new Headers(options.headers);if(new URL(url).hostname.endsWith('itch.io')&&cookies.size)headers.set('Cookie',[...cookies].map(([k,v])=>k+'='+v).join('; '));
 const result=await fetch(url,{signal:AbortSignal.timeout(45000),...options,headers});if(!result.ok)throw new Error('资源请求失败：'+new URL(url).hostname+' '+result.status);
 for(const raw of result.headers.getSetCookie?.()??[]){const [key,...value]=raw.split(';')[0].split('=');cookies.set(key,value.join('='));}return result;
}
async function save(name,bytes){await mkdir(folder,{recursive:true});await writeFile(new URL(name,folder),bytes);console.log(JSON.stringify({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));}
const firstLibrary=process.argv.includes('--library-one');
const base='https://quaternius.itch.io/universal-animation-library'+(firstLibrary?'':'-2');
const purchase=await (await request(base+'/purchase')).text();if(!purchase.includes('[Standard].zip')||!purchase.includes('"actual_price":0'))throw new Error('未确认免费标准版');
const csrf=purchase.match(/name="csrf_token" value="([^"]+)"/)?.[1];if(!csrf)throw new Error('下载页缺少请求令牌');
// 作者页面“无需付款，直接下载”按钮的公开请求路径，不提交购买表单。
const generated=await (await request(base+'/download_url',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Referer':base+'/purchase'},body:new URLSearchParams({csrf_token:csrf})})).json();
if(typeof generated.url!=='string'||new URL(generated.url,base).hostname!=='quaternius.itch.io')throw new Error('免费资源页地址无效');
const page=await (await request(new URL(generated.url,base))).text();
const rows=[...page.matchAll(/<div[^>]*class="[^"]*upload[^"]*"[^>]*>[\s\S]*?<\/div>/g)].map(m=>m[0]);
let id;for(const row of rows)if(row.includes('[Standard].zip'))id=row.match(/data-upload_id="(\d+)"/)?.[1];
if(!id){const index=page.indexOf('[Standard].zip');id=page.slice(Math.max(0,index-1200),index+1200).match(/data-upload_id="(\d+)"/)?.[1];}
if(!id)throw new Error('未找到标准版下载项');
const location=await (await request(base+'/file/'+id+'?source=game_download&as_props=1',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Referer':generated.url},body:new URLSearchParams({csrf_token:page.match(/name="csrf_token" value="([^"]+)"/)?.[1]??csrf})})).json();
if(typeof location.url!=='string'||!location.url.startsWith('https://'))throw new Error('标准版地址无效');
const archive=Buffer.from(await (await request(location.url)).arrayBuffer());if(archive.length>100*1024*1024)throw new Error('资源超出预期大小');if(createHash('sha256').update(archive).digest('hex')!==(firstLibrary?'cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724':'4008ea208a604773a2b2177d965f0f5d3195498b5bf838c3f5785d68e95f2a68'))throw new Error('标准版资源已变化，需重新验收后更新哈希');await save(firstLibrary?'UAL1-Standard.zip':'UAL2-Standard.zip',archive);
// 使用 Windows 自带 Expand-Archive；路径固定在候选目录，保留原有 ZIP 目录结构。
const archivePath=fileURLToPath(new URL(firstLibrary?'UAL1-Standard.zip':'UAL2-Standard.zip',folder)),extractPath=fileURLToPath(new URL(firstLibrary?'ual1':'ual2',folder));
const literal=value=>"'"+value.replaceAll("'","''")+"'";
execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath '+literal(archivePath)+' -DestinationPath '+literal(extractPath)+' -Force'],{windowsHide:true,stdio:'inherit'});
// 固定本轮验收版本，避免仓库更新后悄悄改变候选骨架。
if(!firstLibrary){
const branch={sha:'653a9698f5f315523072f1c3ff3496100401317b'};
for(const path of ['static/models/model-human.glb','static/rigs/rig-human.glb','static/animations/human-base-animations.glb','static/animations/human-addon-animations.glb','LICENSE-CC0.MD']){
 const bytes=Buffer.from(await (await request('https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/'+branch.sha+'/'+path)).arrayBuffer());
 if(path.endsWith('.glb')&&bytes.readUInt32LE(0)!==0x46546c67)throw new Error('资源不是GLB：'+path);await save('m2m-'+path.split('/').pop(),bytes);
}
await save('sources.json',Buffer.from(JSON.stringify({quaternius:{page:base,uploadId:id,license:'CC0',edition:'Standard'},mesh2motion:{repository:'Mesh2Motion/mesh2motion-app',commit:branch.sha,license:'CC0',excluded:'human-mocap-animations.glb 尚未核对上游许可'}},null,2)));
}

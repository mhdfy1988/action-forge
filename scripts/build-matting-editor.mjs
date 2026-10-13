import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,basename} from 'node:path';

const project=resolve(import.meta.dirname,'..');
const source=resolve(process.env.FRAMES_MATTING_ROOT||resolve(project,'../game-art-matting'));
const target=resolve(project,'web/matting');
const require=createRequire(resolve(source,'package.json'));
const {build}=require('esbuild');
await mkdir(target,{recursive:true});
const options={absWorkingDir:source,outdir:target,entryNames:'[name]-[hash]',bundle:true,format:'esm',target:'es2022',legalComments:'eof',metafile:true};
// 只在嵌入适配层切换明确的API前缀，单图核心及旧页链路保持原样。
const workflowAdapter={name:'workflow-repair-api',setup(builder){builder.onLoad({filter:/[\\/]web[\\/]src[\\/]app\.js$/},async args=>{
  let contents=await readFile(args.path,'utf8');
  // 私有源码使用const声明；精确检查替换数量，升级后失败快。
  const hits=contents.match(/\/api\/matting-batches\//g)||[];
  if(hits.length!==2)throw new Error('精修API源码变化，请重新核对适配点');
  contents=contents.replaceAll('/api/matting-batches/','${repairParams.get("workflow")==="1"?"/api/workflow-matting/jobs":"/api/matting-batches"}/');
  return {contents,loader:'js'};
});}};
const asset=(result,extension)=>{
  const output=Object.keys(result.metafile.outputs).find(name=>name.endsWith(extension));
  if(!output)throw new Error(`缺少资源 ${extension}`);
  return `/assets/matting/${basename(output)}`;
};
const worker=asset(await build({...options,entryPoints:['web/src/worker.js']}),'.js');
const app=asset(await build({...options,plugins:[workflowAdapter],entryPoints:['web/src/app.js'],define:{__WORKER_URL__:JSON.stringify(worker)}}),'.js');
const style=asset(await build({...options,entryPoints:['web/style.css']}),'.css');
const html=(await readFile(resolve(source,'web/index.html'),'utf8'))
  .replace(/href="\/assets\/assets\/style-[A-Z0-9]+\.css"/,`href="${style}"`)
  .replace(/src="\/assets\/assets\/app-[A-Z0-9]+\.js"/,`src="${app}"`)
  .replace('</head>','<link rel="stylesheet" href="/assets/matting/embed.css" /><link rel="stylesheet" href="/assets/icons.css" /><script type="module" src="/assets/matting-icons.js"></script></head>');
if(!html.includes(`src="${app}"`)||!html.includes(`href="${style}"`))throw new Error('精修资源引用未更新');
await writeFile(resolve(target,'repair.html'),html,'utf8');
console.log(JSON.stringify({app,worker,style}));

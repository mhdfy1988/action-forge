import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const project=resolve(import.meta.dirname,'..'),source=resolve(process.env.FRAMES_MATTING_ROOT||resolve(project,'../game-art-matting'));
const {build}=createRequire(resolve(source,'package.json'))('esbuild');
const license=await readFile(resolve(source,'node_modules/culori/LICENSE'),'utf8');
// 仅打包已有魔法棒与颜色距离核心；不复制私有应用或改变8896构建。
await build({absWorkingDir:source,stdin:{contents:"export {connectedMask} from './web/src/editor.js';export {seedColorDistance} from './web/src/color-distance.js';",resolveDir:source,sourcefile:'auto-cleanup-core.js'},outfile:resolve(project,'web/workflow-cleanup-core.js'),bundle:true,format:'esm',target:'es2022',legalComments:'eof',banner:{js:`/*! Culori license\n${license}*/`}});

# JavaScript 动作资产适配器

本目录提供 R4 角色资产包的无框架 JavaScript 消费链路。它读取用户已经解压的角色 ZIP，不请求动作工坊接口、不写回 `project.json` 或 PNG，也不修改任何游戏工程。

## 模块

- `character-project.js`：v2 清单结构和领域语义校验，返回深冻结数据。
- `package-files.js`：浏览器文件夹入口，校验包根目录、引用文件、PNG 类型与资源预算。
- `runtime.js`：动作切换、播放/暂停、逐帧推进、调速、循环、结束状态与事件订阅。
- `geometry.js`：共享画布、稳定原点、角色比例、动作变换和锚点的绘制位置。
- `playback.js`：固定帧率、逐帧时长和事件偏移的唯一 JavaScript 实现；旧工作区通过薄转发复用它。
- `demo.html`：隔离示例宿主，服务启动后访问 `/javascript-preview`。

## 最小宿主调用

```js
import {openCharacterPackage} from './package-files.js';
import {createCharacterRuntime} from './runtime.js';

const packageHandle = await openCharacterPackage(folderInput.files);
const runtime = createCharacterRuntime(packageHandle.project, {
  onEvent(event) {
    console.log(event.type, event.frameId, event.timeMs);
  },
});

runtime.selectAction('run');
runtime.play();

// 宿主拥有时钟；每轮传入自上轮以来的真实毫秒数。
runtime.advance(deltaMs);
const image = runtime.getFrameImageReference();
const bitmap = await packageHandle.loadBitmap(image.path);
```

`runtime.snapshot` 给出当前角色、动作、帧、动作内累计位置、循环次数、播放速度和结束状态。宿主负责自己的渲染循环及 `ImageBitmap.close()`；运行时只管理只读动作状态，`dispose()` 会停止播放并移除事件订阅。

## 输入边界

- 仅接受 `formatVersion: 2` 的 `action-forge-project`。
- 文件夹最多 20,000 个文件、总计 2 GiB；`project.json` 最多 8 MiB；单 PNG 最多 64 MiB。
- 拒绝未知字段、绝对路径、路径穿越、重复 ID、悬空事件、缺失文件、无法解码的 PNG、未校准角色和只有源图而没有透明结果的动作。
- 固定帧率与逐帧时长严格互斥；来源视频时间不参与播放。

## 校验器维护

开发依赖 Ajv 只用于从 `character-project-v2.schema.json` 生成静态 ESM 校验器；浏览器运行时不加载 Ajv。

```powershell
npm.cmd run generate:character-validator
npm.cmd test
```

JSON Schema 负责字段、类型和 `additionalProperties` 等结构约束；名称长度、安全路径、跨引用、已约分有理数、画布预算等关联语义留在 `character-project.js`。不要在浏览器端增加与 Python 协议互相矛盾的隐式修复或旧格式回退。

## 当前边界

这是可复用适配器和示例宿主，不是 npm 包、具体 JavaScript 游戏引擎插件或用户工程安装器。游戏输入、状态机、战斗判定、碰撞框、拖尾和图层仍由后续阶段单独定义。

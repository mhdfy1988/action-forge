# 动作工坊（Action Forge）

从视频素材到 2D 游戏动作资产的本机工作台。

目标工作流：**图片 → 视频 → 序列帧 → 角色动作资产 → 游戏引擎**。目前已实现视频导入、抽帧、帧整理、批量抠图、人工精修、单动作统一导出，以及可重启恢复的最小多动作角色项目；共享画布校准、动作事件编排、引擎实时预览、图片生成视频和桌面安装包尚未实现。

后续不新建第二个产品仓库，也不继续拆出孤立工具。现有 `action-forge` 将采用“同仓隔离演进”：当前单动作页面保持稳定，新建独立角色工作区和状态边界，通过适配层复用已验证能力；新版完成角色容器、跨动作校准与 Godot 纵向验收后，才讨论替换默认入口。决策与阶段见[角色动作资产工作台方向](docs/character-asset-workspace.md)。

R1最小角色容器已完成：独立 `/projects` 工作区支持创建角色项目、添加/排序/切换动作、独立保存帧率与循环参数、保存后重启回读；抽帧v2、整理v3、抠图v4结果可显式迁入。下一步是R2共享画布、稳定原点和跨动作校准。详见[角色资产协议](docs/character-asset-protocol.md)与[当前任务](docs/stages/current-todo.md)。

## 使用

侧栏分为“抽帧 / 帧处理 / 导出”。帧处理中整理与抠图没有强制先后关系。

- 抽帧：MP4 / MOV / WebM，选择时间范围和采样帧率；结果缩略图连续滚动，原尺寸播放使用弹窗。
- 整理：查看与勾选独立，批量删除勾选帧，悬浮垃圾桶删除单帧；拖动交换、撤销 / 恢复、循环候选。
- 抠图：当前全部保留帧，模型透明度＋局部 FFmpeg 去绿；双击打开精修弹窗，修改自动同步。**批量模型依赖独立单图项目，详见下文。**
- 导出：当前全部有序且已抠帧；原尺寸、比例尺寸、固定尺寸和自定义画布。裁剪与算法参数在高级设置中。
- PNG 序列＋JSON，或精灵图集 PNG＋JSON，统一 ZIP 下载。图集可查看整张排列；动作帧率明确写入说明文件，不覆盖源时间。
- 角色项目：从顶部“角色项目”进入独立工作区；项目素材与 `project.json` 保存在项目仓库，可在服务重启后重新打开。当前旧抠图结果可从“加入角色项目”迁入；跨动作尺寸与原点校准留到R2。

当前不是安装包。`/projects` 中已保存的角色项目可以跨刷新与服务重启恢复；旧 `/` 单动作临时工作区仍不会跨重启恢复，重新抽帧会清旧历史，未迁入项目的结果仍应及时下载或迁移。仅本机处理，不上传素材。

## 安装与启动

基础环境：Windows、Python 3.12、Node.js、Chrome，以及 PATH 中的 FFmpeg / ffprobe。当前本机 FFmpeg 验收版本为 8.1.1，未随仓库分发。

```powershell
git clone https://github.com/mhdfy1988/action-forge.git
Set-Location action-forge
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd ci
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8897 --no-access-log
```

用 Chrome 打开 http://127.0.0.1:8897/ 。不监听公网，不占用独立抠图入口 8896。

环境变量：`FRAMES_CACHE` 指定临时任务缓存；`ACTION_FORGE_PROJECTS` 指定可恢复角色项目仓库；`FRAMES_FFMPEG` / `FRAMES_FFPROBE` 指定程序路径。未知非空目录不会被接管。本地标准目录为 `action-forge`，代码按自身位置解析，不依赖目录名字。

### 批量模型的可选依赖

公开仓库**不包含**独立私有项目 `game-art-matting` 的 Python 模型代码、环境和权重。基础抽帧/整理可独立运行；当前统一导出只接已抠透明结果，因此完整抠图/精修/导出链路需要具备该依赖，不能把缺少模型的克隆当成完整安装。

默认依赖位于同级 `../game-art-matting`，使用其 `.venv/Scripts/python.exe`；可以显式指定 `FRAMES_MATTING_ROOT` 和 `FRAMES_MODEL_PYTHON`。缺失会报错，不切换替代算法。模型 CPU 测试可用 `FRAMES_MATTING_CPU_ONLY=1`。

精修编辑器已构建产物随本项目提供；如需重建，需要上述单图项目的源码、npm 依赖，再执行 `node scripts/build-matting-editor.mjs`。不修改独立 8896 的构建产物。本机配套版本及依赖边界见 [安装与仓库边界](docs/repository-guide.md)。

## 开发验证

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
npm.cmd test
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe scripts/make-demo.py
```

浏览器功能验收使用独立 8898、独立 `FRAMES_CACHE`，不要争抢用户正在使用的 8897：

```powershell
$env:FRAMES_CACHE = (Join-Path (Get-Location) 'output/browser-test-cache')
$env:FRAMES_MATTING_CPU_ONLY = '1'
.\.venv\Scripts\python.exe -m uvicorn export_server:app --app-dir tests --host 127.0.0.1 --port 8898 --no-access-log
```

另一个终端运行：

```powershell
$env:FRAMES_TEST_URL = 'http://127.0.0.1:8898'
$env:FRAMES_EXPORT_SYNTHETIC = '1'
npm.cmd run test:e2e
```

此服务仅使用自制形状验证处理协议，不代表真实模型质量。完整套件和定向测试不要同时共享同一个服务。每次完整验收使用新的专用缓存目录；测试后只停止自己创建的实例。

2026-10-09 R1收口验收：69项Python通过、1项真实模型条件测试跳过，25项前端领域测试通过；Chrome完整回归37项通过、3项按环境跳过，角色工作区定向保存回读连续3次通过。最新验证记录见[恢复入口](docs/recovery-index.md)。本机启动不等于已发布桌面客户端。

## 边界与文档

单视频256MiB、600秒，选取60秒、最多600帧，8位SDR；单任务120秒、两CPU线程。单帧输出最多8192边/1600万像素，累计RGBA预算2GiB；图集末行空格透明，不自动旋转或逐帧居中。超限显式失败，不保证任意素材自动抠干净。

- [项目方向与后续计划](docs/project-plan.md)
- [角色动作资产工作台方向](docs/character-asset-workspace.md)
- [导出设计及协议](docs/export-design.md)
- [批量抠图与精修](docs/batch-matting-design.md)
- [时间与来源协议](docs/protocol.md)
- [图标与许可](docs/icon-system.md)
- [测试职责与整理](docs/test-strategy.md) · [历史证据](docs/history/)
- [当前任务](docs/stages/current-todo.md) · [恢复入口](docs/recovery-index.md)
- [更新日志](CHANGELOG.md)

仓库不包含用户视频、输出结果、模型权重、虚拟环境或日志。第三方图标许可在 `web/licenses/`；未捆绑 FFmpeg。公开可见不等于所有依赖获准重新分发，模型及运行时许可需分别核对。

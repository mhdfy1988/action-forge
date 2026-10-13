# 安装与仓库边界

## 目录

- app/：本机HTTP服务、抽帧、整理、批量模型适配、导出核心。
- web/：单屏工作台及已构建精修编辑器；web/licenses/保留图标许可。
- model_config.py：唯一Python模型配置，不导入私有模型。
- scripts/：构建、夹具生成、下载重读与诊断；诊断脚本不是正常使用入口。
- tests/：Python/领域/Chrome测试，export_server.py仅合成测试服务。
- docs/：当前协议、设计、计划；docs/history/单独保存历史证据。

不上传output/、用户视频、权重、环境、日志和本机临时数据。默认缓存有预算和回收机制，不承诺它是项目保存功能。

## 模型依赖

现有批量适配器启动独立Python子进程，导入单图项目app.engine、app.refinement、app.green_despill。公开仓库不复制私有项目全量源码，不提供权重或它的运行环境。

本机配套版本为game-art-matting提交`1668d18f525e4320a2b1a8d972e0a59b91dc3f2b`，包含模型原始Alpha选项、局部去绿和嵌入实时精修，已推送其私有仓库。私有依赖不因此成为公开可安装组件；外部用户缺少依赖时，完整模型链路不可用，这是已知安装限制而不是静默回退。

model_config.py统一运行和Python诊断配置；构建脚本读取同名FRAMES_MATTING_ROOT。FRAMES_MATTING_ROOT可指向已安装配套项目，FRAMES_MODEL_PYTHON指定对应环境Python。它们必须在服务启动前设置；不从任意上传文件加载代码。基础抽帧/整理只使用本项目基础依赖。

## 资源构建

3D打包文件不纳入源码提交，首次启动原8900验证页前执行以下构建；素材仍需按[资源准备说明](references/motion-resource-expansion.md)下载至output/fixtures。仅复制源码不包含本机模型资源。

```powershell
npm.cmd ci
npm.cmd run build:motion-lab
npm.cmd run build:fullbody-trial
npm.cmd run motion:lab
```

自动背景清理核心由 `node scripts/build-auto-cleanup.mjs` 重建，沿用配套源码路径，只打包既有魔法棒与颜色距离到 `web/workflow-cleanup-core.js`，保留Culori MIT许可；不修改独立8896。运行使用随仓库提供的构建产物。

精修HTML引用当前构建的内容哈希app/style，app内引用对应worker；文件名以web/matting/repair.html与脚本实际输出为准，不以历史哈希名作为安装配置。

scripts/build-matting-editor.mjs按脚本自身位置确定本项目输出目录；源目录使用FRAMES_MATTING_ROOT或默认同级单图项目。源码改变后须重新构建，并检查repair.html与Worker URL实际引用；当前服务静态文件直接加载，旧浏览器仍需刷新。私有项目及独立8896不随本项目构建改动。

## 本地目录迁移

本地标准目录action-forge。先检查8897空闲并完整备份缓存，停止本工具后同盘重命名；旧.venv归档到output，再在新位置建立环境，不复用写死旧路径的激活脚本/入口。Git元数据及旧输出随目录保留，源视频不删除；新服务使用新的专用缓存，旧缓存不被启动清理。

缓存所有权标识game-video-to-frames-v1是已有格式身份，不是产品名称；保留以识别既有缓存，不能随目录改名随意替换并接管未知目录。/projects角色项目可从磁盘恢复，/workflow素材和草稿依赖当前浏览器IndexedDB；旧/临时工作区不承诺跨重启恢复。缓存备份不等于浏览器操作历史恢复。

## 公开与发布

3D工具另已抽取为同级MotionDeck，不重写原功能；本仓保留原验证源码和8900入口。MotionDeck独立存储、8901入口和MIT许可不自动改变本仓代码或第三方许可。本次提交只针对action-forge；临时缓存、模型素材与output继续排除。依赖锁以`.npmrc`固定legacy-peer-deps重放，避免实验IK包的同伴依赖改变旧依赖图。

公有仓库只是可见性，不代表模型、FFmpeg或第三方资源的许可证被统一覆盖。未创建Release、桌面安装包或模型分发包。不发布个人账号凭据，不把本机路径和历史会话记录当安装配置。

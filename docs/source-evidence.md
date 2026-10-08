# 源码与依赖证据

> 历史设计/验收记录，保留原日期与证据；其中旧界面、旧策略、端口进程与待开发描述不代表当前状态。当前能力以 [README](../README.md)、[项目计划](project-plan.md) 和 [导出设计](export-design.md) 为准，禁止照历史步骤覆盖用户当前环境。

## B0批量抠图与人工精修复用核对（2026-10-07）

- 同级`../game-art-matting/app/engine.py`：`GameArtEngine.cutout`统一模型选择、推理、边缘及前景颜色处理；已有Alpha入口和推理互斥也在此。`app/main.py`的`/api/cutout`返回原尺寸PNG，失败显式报错。新批量入口应适配同一核心，不复制算法或静默切模型。
- 同级`../game-art-matting/web/src/editor.js`：原图/自动RGBA独立于当前结果，按局部块记录有界历史；`app.js`负责双侧交互及独立Worker生命周期。`selection-preview.js`和`worker.js`为既有选区/像素工作路径。当前没有逐帧保存桥接；复用需要显式适配，不把单图下载当成序列保存接口。
- 同级`../game-art-matting/scripts/build-web.mjs`：构建哈希资源与Worker URL使用`/assets/assets/`绝对路径，不能直接挂到新子路径并假设资源可达；新入口须统一适配、构建并验证实际引用，不保留旧固定资源兜底。
- 本仓`web/organizer-ui.js`导出使用完整`editor.order`，勾选仅用于播放/批量操作；当前对外只暴露工作区状态等接口，尚无批量快照入口。`app/organizer.py`从服务端原清单按稳定ID派生顺序及有理数时长；`app/service.py`已有编辑会话持有和下载释放边界，后续B1需精读相关方法后扩展，不另建不受预算控制的缓存。
- 以上为源码核对，不是新模块运行证据；设计与边界以[批量抠图与人工精修](batch-matting-design.md)为准，未增加依赖或运行模型。

- U16统一底栏（替代U15）：index.html将唯一timeline/start/end/range移到.parameters，原视频面板只留视频与元信息；style.css宽窗口同排、1100以下两行且两步骤同高。首轮extract-layout 1366失败为预计帧数24→120增加一位，范围宽552.9375→546.484375；固定estimate 72像素后几何定向通过，不改取帧链或放宽断言。动态数字与同排交互控件共存时预留数字空间，避免文字变化挤动滑条。

- U15范围控件合并：index.html将既有start/end移到.timeline .range-fields，删除重复固定刻度；app.js仅移除range-total显示写入，复用updateRange/controls及抽帧请求快照。flow.spec.js真实拖动/数值/精确输出回归、navigation-layout.spec.js父区域与输入矩形断言避免只检查容器。没有第二套状态、通用依赖或后端改动。

- U14恢复帧预览弹窗（替代U12/U13内嵌）：复用本仓loop-ui.js已使用的原生dialog.showModal/close/cancel；web/index.html将唯一viewer移出视频面板，app.js仍使用openViewer/FramePlayback/缩放平移，不复制播放器。native dialog负责模态焦点，close/cancel统一停播放；workspace.spec.js检查播放/缩略图入口、Esc/焦点恢复及三窗口原面板不变。无新依赖、无后端改动。

- U13输入归属：web/index.html仅搬移既有open/file/filename/play控件；app.js移除setStage对输入文件名的改写，复用importFile/openViewer/togglePlayback。navigation-layout.spec.js断言父面板和窗口可达，workspace.spec.js验证右侧入口实际播放、输入仅抽帧可见及往返文件名不变。步骤专属输入不放全局顶栏，呈现调整不复制业务。

日期：2026-10-06；本项目独立实现，不复制抠图运行时或业务。

## M2接续证据与依赖选择

- U12桌面工作台：web/app.js的setStage/updateNavigation负责唯一活动步骤和顶部导出位置；organizer-ui.js通过onActivate/onControls与pause/working/jobId/name适配，FrameEditor/FramePlayback/服务端v2/v3协议均复用，不复制编辑或抽帧逻辑。一个main内的两个tabpanel仅切内容，固定网格几何，保持DOM和编辑资源；普通viewer改内嵌，只有loop-dialog保留模态。tests/browser/workspace.spec.js覆盖真实几何/状态/锁定，双ZIP重读验证来源不变。
- [W3C步骤Tab规范](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)：tablist/tab/tabpanel及aria-selected/controls/labelledby关联，竖向上下键/横向左右键；异步交接采用手动激活，方向键只移焦点、Enter/Space切换。原生按钮/SVG/CSS足够，无路由框架或新依赖；整理快捷键明确排除侧栏焦点，不能把Delete导航操作误作删帧。

- 循环检测试验版：已有FrameEditor.revision/order/commit、FramePlayback.position、同源PNG/缩略图接口可直接适配；算法`web/loop-core.js`、隔离线程`loop-worker.js`、弹窗`loop-ui.js`。输出是原帧ID区间，不生成/混合图片，不改v3导出。流程和阈值限制见[循环方案](loop-finder.md)。
- [Video Textures原论文介绍](https://www.microsoft.com/en-us/research/publication/video-textures/)：支持“分析视频结构以找可重复衔接关系”的研究方向，不证明本项目当前启发式的效果，也不声称复制其完整合成算法。连续邻域、绿幕权重、版本门禁为本项目方案。
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)：支持在工作线程运行画布操作，采用浏览器现有图像解码/Canvas能力，不为轻量试验安装NumPy/OpenCV；[Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)用于关闭/超时立即结束线程；[showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)隔离主页面交互，但document快捷键仍须显式检查弹窗状态。
- [OpenCV光流官方说明](https://docs.opencv.org/4.13.0/d4/dee/tutorial_optical_flow.html)：运动场可以作后续候选方向验证，但依赖亮度/局部运动假设。当前未安装或接入，不把颜色变化向量比较称为光流。

- 单帧垃圾桶复用本仓FrameEditor.remove/commit：remove(ids=this.selected)增加显式身份入口，其他勾选由commit过滤保持。原生button、同级SVG与已有卡片定位/CSP足够，无新增图标库或依赖；不以修改selected模拟单帧删除。organizer-ui.js统一工作中/失效禁用，排除控件dragstart。Chrome验收见organizer-acceptance.md最新节点。
- 现有`app/service.py`负责完整结果、缓存锁、busy和精确v2清单；M2在同Store资源边界增加会话持有，`app/organizer.py`只做严格请求与v3派生。复用原帧接口和PNG文件，不复制FFmpeg/HTTP入口。前端`web/organizer-core.js`管理ID/选择/顺序/历史，`organizer-ui.js`为独立工作区，复用core格式/播放边界，不导入旧React运行时。
- 已定向核对旧`../2d-action-studio/apps/frame-sequencer/src/domain.ts`：单帧splice移动、毫秒求和且最少1ms；其App导入ZIP/图片并给时长默认值。与当前稳定身份、精确有理数、无额外导入边界不同，故只作为对照，不搬其默认时长/序号协议。
- 2026-10-06交换/编号反馈：已有稳定ID、sourceIndex、commit/100步历史及原生拖放链路。原卡片显示index+1，重新排序仍连续编号，无法识别改变；改显示sourceIndex+1。最新排序为swap(id,target)，仅交换两身份，append(id)处理空白末尾；替代此前左右插入，不保留静默旧路径。图片、来源和勾选仍依附原ID。详见organizer-acceptance.md最新节点。
- [MDN原生元素动画](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)：animate(keyframes,options)创建并播放动画，返回Animation；getAnimations可检查真实动画。organizer-ui.js按稳定ID捕获前后矩形，用平移关键帧展示移动，无新依赖或动画业务状态。浏览器测试暂停真实动画检查两帧非零位移、截图，并检查减少动态效果下无动画；600帧只动画可见区域附近帧。源码和协议先读本索引，无需重新查旧桌面排序。
- [Pydantic字段约束](https://docs.pydantic.dev/latest/concepts/fields/)：复用既有依赖，禁止额外输入，严格身份字符串/600项上限；客户端只给帧ID顺序，时长/PTS/路径取服务端原清单，不手写通用HTTP/schema校验库。
- [Python标准库ZIP](https://docs.python.org/3.12/library/zipfile.html)：复用已安装运行时的`ZipFile.open`流式写读原PNG；不引入JSZip或浏览器解包器。ZIP经JSON/数量/PNG流式哈希重读才返回；`ManagedDownload`只包已有FileResponse的finally释放，不另写文件传输协议。
- 来源PTS和精确duration沿M1，v3新增播放时间轴，不覆写原来源。契约与资源边界见`organizer-protocol.md`，实际验证见`organizer-acceptance.md`；本地依赖版本无新增/升级，未来客户端未打包。

## 已有能力与适配

### M3复用证据（2026-10-07）

- 同级`game-art-matting/app/engine.py`的`GameArtEngine.cutout`是正式单图推理入口；本项目`app/batch_model_worker.py`只做逐帧文件协议与结果写入，`app/batch_matting.py`负责串行/预算/发布，不复制抠图或绿幕算法。CPU真实模型320×180帧已通过，失败无静默色键兜底。
- 同级`game-art-matting/web/src/editor.js`及`web/src/app.js`的现有画笔、魔法棒和历史为唯一精修实现；本项目`scripts/build-matting-editor.mjs`构建同源静态编辑器，嵌入模式仅加载/保存当前帧，独立8896入口不受本次运行影响。
- 本项目`app/organizer.py`的`edited_manifest`提供稳定ID/原PTS/有理数时长派生，`app/service.py`的源持有与缓存锁保护批量过程，v4另存且不冒充v2/v3。验证分层：假模型检查全序列状态/字节/失败取消，真实CPU单帧检查RGBA和ZIP，Chrome完整回归及真实浏览器链路检查界面；质量仍需真实素材试用。

- [MDN动画回调时间](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)：RAF参数表示渲染周期时间，与回调内performance.now()不相等；官方示例分别采用首个RAF时间作为起点、document.timeline或全程performance.now，不能假设两者可随意混用。2026-10-06用户页实证混用产生负索引；当前web/app.js/organizer-ui.js起点、调速、tick统一performance.now，web/core.js负差保持进度。tests/web/core.test.mjs覆盖回调早于起点；tests/browser/organizer.spec.js显式滞后回调、真实时钟重复播放及pageerror先失败后通过。后续优先读本索引，不凭模拟时钟通过宣称原生动画可用。

- 旧参考 `../2d-action-studio/apps/video-frame-extractor/server/{lib,index}.mjs`：FFprobe结构化探测、参数数组调用、PNG/ZIP可参考。旧sourceTimeMs按序号计算，不能用于本版真实PTS；不复制其Express/React或大段抠图协议。
- [FFprobe文档](https://ffmpeg.org/ffprobe.html)：`-show_frames`、`best_effort_timestamp`和流`time_base`。本机8.1.1核对实际JSON，完整解析画面时间后归一化，拒绝无PTS、时序不递增或中途变尺寸。
- [FFmpeg滤镜文档](https://ffmpeg.org/ffmpeg-filters.html)：`select`按解码帧序号筛选、`showinfo`输出实际pts。本机`ffmpeg -h filter=select`与`-h filter=showinfo`可核对接口。`app/media.py`使用-copyts、passthrough，探测PTS必须等于实际选中PNG的showinfo PTS，否则失败。
- [FFmpeg8.1表达式源码](https://www.ffmpeg.org/doxygen/8.1/eval_8c.html)的`MAX_DEPTH=100`：120项`eq`直线加法链触发解析深度限制，最终外层报Cannot allocate memory，并非机器内存不足。`selection_expression`改平衡树，600离散选帧实际PTS及全帧参考逐像素验证；不缩减输出帧数、不切旧抽帧实现。
- [FFmpeg旋转选项](https://ffmpeg.org/ffmpeg.html)：`-display_rotation`是输入选项。自制旋转夹具旧`-metadata rotate=90`没有生成侧数据，改此选项再stream-copy才形成有效夹具；不为无效测试数据修改生产逻辑。
- [FastAPI请求/文件说明](https://fastapi.tiangolo.com/tutorial/request-files/)：本项目使用Request.stream接收原始文件体，逐块限额，避免先解析大型multipart；路径由服务分配，原文件名只作显示。

## 依赖决策

| 能力 | 采用 | 替代与成本 |
| --- | --- | --- |
| 容器/解码/标准化 | 本机FFmpeg/ffprobe 8.1.1 | 不手写解码器；需安装/版本检查，当前Gyan构建含GPL，未打包分发 |
| HTTP/参数校验 | FastAPI、Pydantic、Uvicorn | 不手写HTTP协议；锁文件保留版本，领域与媒体适配独立 |
| PNG验证/缩略图 | Pillow | 不自行解析PNG；独立图像内存峰值，不载入整序列 |
| ZIP/时间/线程 | Python标准库 | ZIP无需额外依赖；Fraction承担精确时间，线程仅单任务且有取消预算 |
| 网页 | 原生JS/CSS | 小工具无需React；服务禁止缓存旧脚本，不借上级构建配置 |
| 验证 | pytest/httpx、Playwright复用Chrome | 真接口/鼠标/下载，安装成本仅开发依赖，不重启8896 |

均通过项目适配层使用；领域`domain.py`不依赖FFmpeg或HTTP。前端无CDN、不新增字体网络请求。版本清单在requirements及package-lock，Python完整解析版本另存requirements-lock.txt。

## 时间、格式与预算

- v2有理数秒字符串为真值，毫秒小数为显示；源PTS与timeBase单独保存。首帧PTS作为归一化0点，真实源流时间保留。
- 半开区间，最近合法源帧，等距取较早；无合法帧拒绝。允许重复采样，不补帧/去重。v1仅显式导出适配，累计舍入避免逐帧漂移；旧工具不能自动读取v2。
- 首版固定256MiB输入、源视频600秒、片段60秒、600输出帧、4K显示像素、累计RGBA估算2GiB、单任务磁盘2GiB、缓存4GiB、30秒探测/120秒任务、两CPU线程。源时长上限补足全帧探测预算，不承诺600秒4K素材一定能在预算内处理完；超时显式失败。
- 最大3素材/3任务；缓存闲置1小时后在下次操作清理，重启只回收本工具分配目录。不删除用户视频，最近完整结果受保护；无工程恢复承诺。
- HDR/BT.2020拒绝；8位RGB PNG，不承诺Alpha视频/10位保真。非方形像素显式标准化到方形像素，旋转应用显示方向，不能称“不发生任何重采样”。
- 非零首帧PTS会让Chrome原生时间轴与归一化范围错位（自制2秒素材原生报告6.958333秒）。按[FFmpeg官方时间选项](https://www.ffmpeg.org/ffmpeg.html)的`-copyts -start_at_zero`单画面轨重封装预览，不重编码、不替代源文件；再次探测每帧时间/时长、总时长、方向和尺寸，全部一致且首PTS为0才发布，否则显式失败。正常零起点不生成代理。Chrome不能播放编码时明确提示，浏览器截图不作fallback。
- 配额遍历按[Python官方DirEntry说明](https://docs.python.org/3.12/library/os.html#os.scandir)使用Windows目录枚举属性，避免反复Path.stat；每次仍真实扫描，不缓存过期大小。120帧用例逐项性能证据保存在验收文档。

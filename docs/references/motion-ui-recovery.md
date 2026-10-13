# 3D动作编排接续索引

当前正式页姿势编辑/导入动作姿势入口隐藏、保存姿势在播放器、导出在库标题，刷新时间轴为空。内置资源扩充后Quaternius117动作99姿势、Mesh2Motion162动作16姿势：[资源及兼容性索引](motion-resource-expansion.md)，[导出索引](motion-export.md)。下方菜单/编辑说明为历史过程；全身联动/旋转继续暂停。

当前自定义素材使用右侧悬浮垃圾桶，无素材右键菜单；站内确认和具名整体动作复用见[实现及验证索引](motion-library-interactions.md)。全身联动/旋转工作按用户要求暂停，不继续修改试验。3D工具已直接抽取到同级MotionDeck，原8900源码保留，独立工具使用8901，不在本仓本次推送范围内。

全身联动隔离试验：[实现、入口及验收范围](motion-fullbody-trial.md)。使用固定提交的closed-chain-ik/core验证多目标联动，独立`fullbody.html`，不替换正式编辑器或写素材库。用户试手感尚未完成；人体限位、碰撞、平衡及正式保存接入尚未实现。[前置学习基线](motion-fullbody-study.md)保留，不把静态学习结论当成运行验收。

2026-10-13最新：用户要求“先局部、不够再逐渐带动周边”，拖动已改为局部/邻近/周边分阶段残差驱动参与，每帧从手势基准重求、拉回收紧；最高预算保留但不再全程启用。6项领域定向测试及5项Chrome真实拖动测试通过，仍待用户试手感。旋转只能小范围的问题本轮未处理；预算不是软刚度或人体生理角度。

最新关节拖动试用版：[操作、限制、源码与验证索引](motion-joint-drag.md)。肘膝及骨盆直接拖动，其余关节保持旋转；旧阶段记录不代表当前操作分工。

目标仓库：`D:\learn_code\game\action-forge`。当前入口：8900的`/labs/motion/index.html`；高级验证入口`?tools=1`。8897主工作流不受本轮影响。

## 四项体验优化接续

2026-10-12收口：构建、30项动作领域测试、48项Chrome完整回归全部通过，diff检查通过。已审阅framing-before/after及motion-refinement-four截图；未提交/推送/发布，未刷新用户页面，不修改8897。

实现：显式“适合视图”重算当前源动作/编排/自定义预览整段范围，静态姿势仅量当前帧；视角切换复用此范围，播放不再取景。素材行高32px、分组间距收紧；时间轴复用中文显示名，原名留title与data-raw-name，保存协议不变，用户命名不翻译。简版工具条移除移动/旋转切换，仅自动按所点部位选择，内部原控制器与高级页保留。保存动作位置仍在最右。

源码依据：[SkinnedMesh.computeBoundingBox](https://threejs.org/docs/pages/SkinnedMesh.html)明确动画时须重算；当前安装源码遍历变形顶点，不能复用缓存绑定包围盒。motion-bounds.js按30fps、动画原关键时刻及序列各边界姿势并集，额外1.5%尺寸裕量。沿既有采样器/compileSequence采样，不增加动画播放链路。测量finally恢复当前姿势及边界；单次时间点预算2400，超量报错建议分段，无降采样/绑定姿势fallback。不宣称连续数学包络，极端运动仍须预览。

motion-framing.spec.js验证蹲伏取景更大、多个时刻不出画、暂停镜头像素稳定、混排/自定义取景、原进度与片段数据不变、中文及自定义名称保留、移除模式按钮。motion-bounds.test.mjs检查真实蒙皮边界随骨骼变化、关键时刻纳入、预算拒绝、成功与失败均恢复姿势。

## 视口姿势编辑接续

2026-10-12本轮收口：构建、28项领域Node测试、47项Chrome浏览器回归全部通过，diff检查通过。已审阅视口编辑/头部旋转及1280短屏截图；未刷新用户页、未修改8897、未提交或发布。

本轮按用户明确口径：手动调整是在3D视口里拖人偶，不是在右侧填参数。简版原editPose/capturePose按钮移动到视口浮动工具条；编辑时显示原移动/旋转、撤销/初始姿势及微调开关，不新建第二套编辑器或保存事务。右侧默认隐藏，posePanel.open仍为编辑状态，pose-details-open单独控制参数面板可见；隐藏简版savePose、poses、addPose重复入口，高级显式工具页保留原布局。

白模提示“不支持手脚拖动”的根因是findLimbChains仅匹配DEF/Mixamo手脚名，BodyControls仅匹配DEF身体点。核对实际GLB 66骨骼：hand_l/r父lowerarm_l/r、祖父upperarm_l/r；foot_l/r父calf_l/r、祖父thigh_l/r。仅添加这些明确端点别名和15个已确认身体点；原IK求解器、同骨架父链约束、姿势快照与保存不变。真实资源Node测试检查四条IK收敛、骨长/缩放/节点数不变；viewport-pose-tools.spec.js真实鼠标拖手、脚Esc取消、头旋转环与撤销、命名保存和短屏入口。

## 当前工作

- 两个内置模型、模型隔离库、手动过渡、剪辑与姿势混排、默认姿势副本编辑、高清拍照/录像均保留，细节见[motion-lab-validation.md](motion-lab-validation.md)。
- 本轮实现：简版中英文动作搜索、中文显示名、播放/录像对象提示、更大默认取景、空轴精简工具、去重复信息；拍照、录像等通用操作图标化，录像中切停止方块并显示红点计时；导入/保存/选择保留文字。
- 横版2D正交侧视向右/向左。先检查整段动作范围，再录像；优先原地动作。有根位移的角色可离开镜头，不自动居中；已补平视八向、45°斜俯视八向及等角四向，固定视图按组统一尺度，输出文件名带方向；不提供批量录制。
- 新模块：`action-labels.js`（展示映射）、`view-camera.js`（取景/相机宽高比）、`view-presets.js`（唯一方向目录）。骨架动作、编排和持久化仍复用旧领域链路，不新增协议或依赖。

## 源码证据与边界

- [正交相机官方文档](https://threejs.org/docs/pages/OrthographicCamera.html)：物体大小不随距离变化；更改视锥后更新投影。`fitView`用绑定包围盒统一取景，`resizeView`维持竖直范围并适配宽高比；高清输出克隆当前相机，不退回透视。
- [轨道控制器官方文档](https://threejs.org/docs/pages/OrbitControls.html)：`object`为受控相机；侧视关闭旋转，缩放/平移仍可操作。PoseDrag/BodyControls及变换工具同步新的相机。
- `ui-refinement.spec.js`检查中英文搜索、原标识保留、上下文、空轴控件、文字与图标边界和短屏截图。`motion-view-camera.test.mjs`检查透视适配、正交投影深度不改变尺寸、方向和导出比例。
- 布局验收发现通用select的100%宽度挤压工具栏，最小修复为视角select固定宽度、按钮不换行；空轴清空按钮隐藏后更新对应测试，不恢复冗余入口。

## 多方向视角源码证据

- `view-presets.js`：保留透视＋20个固定正交方向，按平视四向/补充斜向、斜俯视八向、等角四向分组。斜俯视仰角45°，等角仰角atan(1/√2)、水平斜向45°，三轴屏幕投影等长。
- `fitView`按同一组全部方向的绑定包围盒最大投影范围决定统一视锥，不因切方向动态缩放，不逐帧取景；`referenceName`标注方向，摄影/录制仍复制真实相机。
- `OrbitControls.update`源码中关闭阻尼会清零_sphericalDelta和_panOffset（当前安装源码`node_modules/three/examples/jsm/controls/OrbitControls.js:798-810`）。切换前临时关闭阻尼update一次，再恢复设置并适配新相机，清除旧惯性；不调用私有字段。浏览器先复现旋转后切正面仍变化，再验证300ms两次像素完全一致。
- `view-presets.spec.js`逐个下载20方向PNG，核对尺寸、人物边界、原编排保留；另录制斜俯视/等角视频并实际解码帧数，核对录制中锁定相机、结束恢复。没有增加新媒体编码器、协议或依赖。

## 验证结果

2026-10-12多视图收口：构建通过，27项领域测试与46项Chrome回归全部通过，diff检查通过。最新侧视图片/视频1920×836，人物区域RGB SSIM=0.957482、亮度结构=0.984889。20方向PNG及斜俯视/等角真实视频已下载、解码；截图`output/acceptance/view-ui-front.png`、`view-ui-overhead-front-right.png`、`view-ui-iso-front-right.png`已核对。未提交、推送或发布。

## 接续方式

先看本索引和验证文档，不重复读整段历史。构建`npm.cmd run build:motion-lab`后运行领域测试`node --test tests/web/motion-*.test.mjs`及`npx.cmd playwright test --config motion-lab.playwright.config.js`。测试用独立Chrome上下文，不刷新用户页面。未保存编排先保存再手动刷新；本轮无commit、push或发布授权。

## 透视编辑自由观看（2026-10-12）

`free-view.js`管理右键手势及键盘，`motion.js`每帧传入真实时间差而非播放倍速。按住右键：WASD水平移动、Q/E升降、Shift加速，鼠标转向；松开/Esc/失焦/后台/切视角/拍照录像/退出编辑结束。恢复轨道控制时将目标设为当前朝向前方，清除旧阻尼，不跳回旧中心；不改模型姿势或持久化。

- [PointerLockControls官方说明](https://threejs.org/docs/pages/PointerLockControls.html)及安装源码：鼠标使用YXZ角度；moveForward沿XZ，moveRight沿相机右轴。复用已有Three.js，无新依赖。
- [requestPointerLock官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock)：原生请求可能返回Promise；SDK的lock不转交返回值，所以适配层直接发请求，捕获拒绝和pointerlockerror。失败显式提示并恢复控制，不切旧路径。
- 回归定位：元素截图包含HTML悬浮效果，不能用于断言相机稳定，改比较canvas真实像素；快速移动中默认轮询会漏过控件，改为短间隔检查头部进入安全区域。另修复原生锁定与SDK事件同步之间忽略按键的窗口。
- 验收包含裁掉头部后升高镜头、真实鼠标转向与移动、姿势不变、恢复后镜头稳定、手部编辑、固定视图、输入域、权限拒绝及Esc/失焦退出。截图位于output/acceptance/free-view-zoom-before.png、free-view-zoom-after.png、motion-free-view.png。

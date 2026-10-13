# 扩展动作资源验收（2026-10-12）

## 目标与落点

沿用单模型、动作/姿势统一时间轴。先把已验证的同源动作接入默认人偶，不因外观相似放宽外部骨架校验；不同绑定骨架的包整体作为独立模型。当前只改8900验证页，未改8897主工程、未提交或发布。

## Quaternius 动作库②

- [作者资源页](https://quaternius.itch.io/universal-animation-library-2)的免费Standard版实际43动画，不把完整版130+宣传数当作免费数量。
- 作者ZIP内README确认：`_RM`包含根位移，另一个版本关闭根位移。接入`Unreal-Godot/UAL2_Standard.glb`，不重复加入RM版本。
- ZIP为18,735,003字节，SHA-256：`4008ea208a604773a2b2177d965f0f5d3195498b5bf838c3f5785d68e95f2a68`；下载项17958478，包内License.txt声明CC0。
- 65骨骼、2蒙皮网格、43动画。默认53主骨骼可全部对应，父子层级一致，局部绑定位置最大差约6.10e-7、归一化旋转最大差约2.09e-6弧度；只排除12个末端叶子骨骼。
- `default-poses.js/defaultBonePairs`复用姿势包的明确映射与绑定校验；`mappedDefaultActions`逐轨道复制并改绑当前骨名，保留时间、值及插值，未知节点/属性拒绝。外部导入仍走`assertSameRig`，不是通用重定向。
- `motion.js/importModel`在发布模型前载入动作包。原46动作保留，新43条使用`UAL2 ·`前缀区分来源，总计89动作、99姿势。包文件不参与原模型身份哈希，已有自定义库不迁移；保存动作仍携带实际轨道数据。
- `motion-default-actions.test.mjs`覆盖43动画各17点（731点）的主骨骼相对根位置，误差小于0.0001；验证输入不变异、未知轨道拒绝。Chrome覆盖原始带贴图GLB载入、播放、动作/姿势/过渡混排、保存恢复、资源缺失保护，无静默回退。
- 包内女性人偶虽然同样65骨骼，但绑定位置和旋转不同；本轮未接入、不用同源许可或外观推断兼容。

## Mesh2Motion

- [官方源码](https://github.com/Mesh2Motion/mesh2motion-app/tree/653a9698f5f315523072f1c3ff3496100401317b)，固定提交`653a9698f5f315523072f1c3ff3496100401317b`。根`LICENSE-CC0.MD`声明模型、骨架与动画为CC0，代码许可独立。
- 源码证据：`src/lib/RigConfig.ts`列出`models/model-human.glb`、`rigs/rig-human.glb`及human-base/addon/mocap三包。`src/lib/processes/animations-listing/AnimationLoader.ts`处理位置轨道及缩放；不能把原始包直接追加当作官方适配流程。
- 单独`model-human.glb`：1网格、0骨骼、0动画；`rig-human.glb`：66骨骼、0网格。仅把两文件同时导入不等于完成蒙皮绑定。
- 实际动画GLB包含自己的已蒙皮人偶：base为66骨骼、1蒙皮网格、87动画，addon为66骨骼、1蒙皮网格、75动画。可通过已有“导入模型…”入口整体载入，各自浏览、播放。Chrome实测两包独立导入成功，截图在output/acceptance。
- 与默认人偶相比，头部命名、骨骼数量及绑定姿态存在差异。base与addon彼此初始绑定变换也不同，现有严格校验拒绝直接追加；不合并、不做通用重定向。基础包已作为Mesh2Motion内置模型接入菜单，附加包仍为独立候选。
- 仅验证代表动作播放和结构，未对162条逐帧做蒙皮视觉验收。mocap包上游许可尚待核对，本轮未下载或接入。

## 可复现准备与验收

```powershell
node scripts/prepare-motion-candidates.mjs
node scripts/check-motion-candidates.mjs
node --test tests/web/motion-default-actions.test.mjs tests/web/motion-default-poses.test.mjs
npm.cmd run build:motion-lab
npx.cmd playwright test --config motion-lab.playwright.config.js
```

下载脚本沿作者免费“直接下载”路径，只取Standard，不购买Source版；用当前PowerShell 7的Expand-Archive解压（下载脚本需要pwsh.exe在PATH），不新增ZIP依赖。资源、检查JSON与截图都留在output，不提交大模型或用户素材。结构检查在Node中移除贴图引用，仅用于骨架采样；Chrome另加载原始带贴图文件，不能用无贴图结构检查代替渲染验收。

准备路径收口：最初假设存在JSZip，但项目并未依赖该包，改用宿主现成解压能力；Windows PowerShell 5.1无法加载Archive模块，核对当前实际宿主为PowerShell 7后显式使用pwsh。最终完整下载脚本重新执行成功，未安装依赖或修改执行策略。Node不能直接解码浏览器贴图，因此结构采样和Chrome原始文件渲染分开验收。

已完成Quaternius②接入、Mesh2Motion基础白模内置及附加包候选验证；Kenney仍是独立模型候选，未下载、未接入。后续如需合并Mesh2Motion动作，应先核对官方动画适配与蒙皮绑定流程，保持明确适配入口，不能放松现有导入校验。

最终门禁：39项Chrome浏览器测试、19项动作领域Node测试通过，动作页构建与脚本语法检查通过，git diff --check无空白错误；现有.gitignore存在Git行尾转换提示，不属于本轮新增失败。资源准备脚本完整重跑成功，未购买资源、未安装依赖、未提交/推送/发布。

## 两模型菜单验收

内置来源使用稳定ID quaternius/mesh2motion，显示名称Quaternius/Mesh2Motion；模型名称更新不改变文件哈希，原默认人偶保存内容保留。model-catalog.js复用资源目录定义，motion.js共用导入/切换并按注册表同步菜单，library-schema.js及生成校验器支持新来源ID。Mesh2Motion不种入Quaternius姿势，用户提取姿势及自定义动作按各自模型事务保存。builtin-models.spec.js覆盖两项名称、真实白模87动作、取消切换保护、姿势与自定义动作隔离、刷新恢复白模选择和已保存编排；不新增第二套库或时间轴。

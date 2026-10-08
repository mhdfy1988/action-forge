# 视频帧残留与预览截断排查

> 历史设计/验收记录，保留原日期与证据；其中旧界面、旧策略、端口进程与待开发描述不代表当前状态。当前能力以 [README](../README.md)、[项目计划](project-plan.md) 和 [导出设计](export-design.md) 为准，禁止照历史步骤覆盖用户当前环境。

日期：2026-10-07。目标：用户当前49帧跑步视频的第5帧，定位残留与显示截断，不修改原素材或用户当前精修。

## 已确认

- 原帧及输出均1280×720。预览的百分比尺寸图片参与网格固有高度计算，图片撑高后被overflow裁切；改为受预览容器约束的绝对定位和object-fit:contain。大画布四窗口1440×1000/1920×900/800×600/390×844浏览器检查通过，导出尺寸不变。
- 独立调用同级GameArtEngine.cutout，CPU float32/ToonOut 1024结果与用户批量PNG解码后逐像素一致，变化像素0；先前一次GPU float16诊断也一致。批量没有遗漏现有颜色/软边细化。
- route为chroma-matting，识别均匀绿幕[1,205,19]，已有前景色修正25888像素、软边修正23966像素。因此“细化未接入”不成立。
- 输出有21452个可见偏绿像素，其中8262个不透明、13190个半透明。偏绿判定只是诊断指标，不能当作人工前景/背景标签，不能据此删除绿色饰物。
- 右下角诊断区域有5893个不透明像素，原图确有文字；地面确有阴影。现有build_trimap把偏离幕布色的片段设为前景，后续green_edge只改软Alpha，完全不透明RGB按既有契约保留，因此部分错误硬前景不会被软边步骤清掉。地面区域包含脚部，不将整个区域统计当成阴影真值。

## 修改与未解决项

### 模型＋FFmpeg接入状态

用户确认后，已将冻结局部FFmpeg候选提取为同级app/green_despill.py，视频worker正式调用。默认processingPolicy=model-local-despill-v1，实际第5帧CPU输出与离线候选逐像素一致。Alpha/主体内侧保护不变，允许最外圈RGB修正；三分图/前景估计/软边网络仍关闭。36相关契约、43视频后端、22网页领域、2定向Chrome和主入口只读Chrome通过，验证层次以recovery-index.md最新节点为准。下方“尚未启用”描述均为各实验历史状态。

当前仅可信均匀亮绿幕开启，其他背景/无可靠内侧参考记录skip_reason。FFmpeg20秒/2线程，失败不静默返回旧结果；Windows取消只终止本批进程树。旧结果保留在缓存与ZIP备份，新版8897已用新缓存启动，用户需重新导入。

### 多方法与组合离线对照

2026-10-07用户要求三个方法及组合都试。固定模型Alpha，对第1/5/25/49帧比较：保守内侧颜色延拓、OBS思路的色度去饱和、PyMatting固定Alpha前景估计，以及前景估计＋旧两次颜色更新、前景估计＋延拓、再加去饱和。另查询并调用本机FFmpeg的成熟despill，增加局部颜色压制与组合。共基线＋9个候选，每帧全部Alpha变化0、内侧可靠核心RGB变化0；本轮允许最外圈不透明RGB改变，不能继续声称“全部不透明RGB保持”。

合成反例先暴露未保护的延拓将黑边误差从0.079扩大到0.157；原证据保留output/despill-variants-20261007/synthetic.json。随后在合成域增加亮内色不得覆盖暗轮廓的保护，才进入用户帧测试。绿色饰物内部/触边、弱Alpha发丝、黑描边有明确真值；最终合同加入颜色误差不退步断言，guarded-final/synthetic.json通过。不依据用户像素坐标选择规则或强度。当前原理适配不是Nuke商业节点复刻，也不是完整OBS键控。

四帧边缘加权偏绿指标下降范围：延拓61–69%，色度去饱和7–14%，前景估计60–67%，前景估计＋延拓73–81%；FFmpeg局部despill约96%，前景估计＋FFmpeg约95–96%，再叠延拓未更好。此指标不是人工真值质量分，不作为单独胜出门槛。白/暗底及头部/全身观察，局部FFmpeg去绿最明显，黑描边仍保留；部分边缘可能变暗，真实绿色边缘的泛化尚未确认。固定Alpha前景估计叠旧颜色更新在这四帧反而没有更好。

当前推荐候选为模型原Alpha＋局部FFmpeg despill：限制距离轮廓2像素，邻近内侧6像素内有可靠颜色参考，只有边缘绿色明显超过内侧参考才修正；主体内部、无可靠参考的细节不修改。局部选择为本实验适配，FFmpeg参数使用固定mix=.5/expand=0/green=-1/brightness=0/alpha=false，不使用其输出Alpha。

脚本同级research/scripts/trial_despill_variants.py，候选在用户帧测试前冻结，单帧90秒CPU预算/FFmpeg20秒与两线程；复用冻结原蒙版，无模型重跑或训练。产物本工具output/despill-variants-20261007/frame-{1,5,25,49}，包括各RGBA、白/暗底、头部总对照与report.json。frame-5/comparison-best.png为原模型/局部FFmpeg/前景估计＋FFmpeg三列。实验全部另存，8897当前默认model-only-v1保持；未接入、重启或提交推送，不能将同一视频四帧推广为所有游戏素材质量保证。

参考：[FFmpeg despill](https://www.ffmpeg.org/ffmpeg-filters.html#despill)、[OBS着色器](https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter.effect)、[Foundry EdgeExtend说明](https://learn.foundry.com/nuke/content/comp_environment/filters/extending_edges.html)、[PyMatting前景估计](https://pymatting.github.io/foreground.html)。本机ffmpeg -h filter=despill核对参数，优先复用成熟滤镜而非重写其计算。

### 原始模型上的独立颜色去绿试验

2026-10-07用户授权“先试试看看是否有效”。只复用同级app/green_foreground.py的固定两次前景颜色更新：输入原图RGB、原模型RGBA、边框幕布色，选择0<Alpha<255的像素；不求三分图、不改Alpha、不调用软边网络。独立合成前景（棕色与绿色）颜色误差下降，Alpha、实心和全透明RGBA保持；既有4项颜色修正测试通过。

同一视频固定抽查第1、5、25、49帧。四帧Alpha逐像素变化均为0，不透明RGB变化均为0；加权半透明偏绿指标下降约42%、44%、47%、45%。该指标不是人工前景真值，不代表整体质量提升对应百分比。白底/暗底放大目视可见部分细绿线变淡，剩余实心绿线仍明显；颜色更新不能处理Alpha255处绿边。四帧来自同一视频，不称为独立广泛素材验收。

脚本同级research/scripts/trial_model_only_despill.py。模型CPU4线程，第1/25/49各90秒进程预算，第5帧直接复用此前原蒙版。产物在本工具output/model-only-despill-frame5-20261007及output/model-only-despill-pose-{1,25,49}-20261007，含透明PNG、白/暗底与头部左右对照、report.json。未修改正式自动路径、没有重启8896/8897、未改当前结果、未训练或依当前帧调更新次数。当前结论：可作为后续单独颜色修正候选，效果有限，尚未默认启用。

### 用户授权离线试验：独立零支持块保护

2026-10-07“你先试试”：候选仅在均匀亮绿幕启用。按原颜色shape连通块检查模型证据，整个块模型Alpha均为0才取消其硬前景回填；主体相连指尖与任意非零模型支持的独立块保持。合成文字/模型漏指尖/3/255弱细节/绿色饰物契约先通过，再以进程内替换运行既有35项细化/前景色/软边回归，全部通过。正式app未改、无训练、参数未依用户坐标选取。

第一版对当前第5帧：文字区域7648可见像素降为0，5893不透明像素降为0；但新背景约束影响了10个“模型非零、旧输出不透明”的像素（含尾部边缘），不能以文字清掉就忽略传播影响。第一版证据保留output/semantic-guard-frame5-20261007。

第二版追加一般保护规则：模型非零且旧PNG不透明的像素保持完整RGBA。文字仍完全删除，上述不透明像素变化为0；不透明原色变化为0。地面含脚部区域可见12422→10664，说明阴影仍有残留，不能当阴影完整清除。软边其他区域变化还没有独立真值认证；模型完全漏掉的孤立真实物体仍存在歧义，因此候选仅用于离线对比，未进入8896/8897自动链路，当前49帧保持。

第二版候选SHA256为1d7372cd9e1a4272eb2c31f8e3671c8b23a065b63e3bcee0acdc1d0d172d5ffa。脚本同级game-art-matting/research/scripts/trial_semantic_trimap_guard.py，90秒CPU预算，复用先前原始蒙版、不再跑基础模型。产物output/semantic-guard-frame5-protected-20261007，包含candidate.png、白底前后对照及report.json。后续重点仍是阴影、绿边与孤立道具保护，不能用单帧试验冒充广泛质量达标。

### 原8896接口与硬前景回填证据

2026-10-07继续核对：8896当前无监听；在其原虚拟环境中用TestClient调用`app.main.app`的原`/api/cutout`入口，输入同一原PNG，CPU返回200，解码结果与8897当前第5帧逐像素一致。单图网页Editor构造仅复制automatic，无隐藏自动清理；核心engine/refinement/green_edge/green_foreground/editor与基线b89f32b无差异。

再独立运行ToonOut原始透明度，核对右下区域：最终5893个不透明像素的原模型Alpha全部为0。其中5746个被`build_trimap`颜色shape/腐蚀明确设为前景种子。模型已删除文字，是颜色后处理硬回填为不透明；不能归因为模型无法识别文字。该证据只针对当前文字区域，不将其推广为所有阴影/绿边的同一原因。

下一步应修正“偏离背景色即确定前景”的种子生成规则：显式处理模型背景与颜色前景冲突，并验证手指/发丝恢复仍成立。不能粗暴全图要求高模型Alpha，因为旧模型可能误删细节；需在合成契约和独立素材上验证冲突/空间关联规则。当前只是定位，尚未部署算法变更，用户49帧及人工结果保持。

### HR与ToonOut单帧对比

同一帧、CPU float32、正式权重，HR2048推理68.563秒，ToonOut1024推理16.994秒（仅当前本机单帧，不当产品性能基准）。原模型蒙版均完整删除右下文字；白底观察均删除地面阴影、主体大体完整，仍有细绿边。图像来源RGB直接配原Alpha，不做前景色恢复，不能将观感当作带真值质量排名。

固定正式后处理后，HR最终PNG与现有ToonOut批量PNG逐像素完全一致，变化像素0；两者都回填文字区域5893不透明像素。当前例子中后处理压过了模型差异，仅换HR不会解决残留。输出保存在忽略目录output/hr-toonout-frame5-20261007，脚本scripts/compare-matting-model.py限定本进程模型路由，外层子进程HR180秒/ToonOut120秒超时预算；未替换主服务或用户当前结果。

显示截断已修正；批量worker现在返回真正model字段及独立details，下一次启动更新后的服务会把路由/设备/细化计数写入派生清单，旧清单不擅自改写。当前8897保持运行、49帧和人工结果保持，没有通过重启清理用户缓存。

自动质量问题尚未修正。后续须分开验证压缩绿幕的亮度变化、半透明绿边、错误硬前景及文字/阴影处理。文字与阴影要不要保留需有明确产品语义；不能直接按“偏绿”删掉，或者全图腐蚀，以免误删服装、手指和发丝。诊断图不得成为训练/阈值选择的数据。

## 证据入口

- 同级app/engine.py：predict_alpha与cutout为唯一模型/细化调用链。
- 同级app/refinement.py：build_trimap的前景种子、refine的完全不透明RGB保护。
- 同级app/green_edge.py：只处理未知区域中0<Alpha<1的软边。
- 本项目scripts/inspect-matting-frame.py：本机只读诊断、单图直接对照、黑白合成查看；CPU在PowerShell中使用CUDA_VISIBLE_DEVICES=-1，空字符串会被PowerShell移除。
- 本机忽略产物output/matting-issue-20261007-cpu/report.json与result-black.png/result-white.png，含CPU实际路由、像素一致性和区域统计；不提交用户素材。
- 定向Chrome两项及批量后端三项通过；既有Starlette测试适配弃用警告保持。

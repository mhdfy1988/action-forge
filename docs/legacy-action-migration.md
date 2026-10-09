# 旧单动作结果迁移（R0-C）

## 输入与范围

R1已实现显式“从当前结果建立或追加角色项目”，不在页面启动时自动迁移。支持抽帧v2、整理v3、抠图v4结果及当前精修图片；v4在旧工作台提供“加入角色项目”入口，v2/v3由同一HTTP迁移适配器支持。旧结果若只存在浏览器内存或已被缓存清理，不宣称可迁移。原项目的模型文件和GPU依赖不随结果拷贝。

迁移前先冻结输入快照：旧清单、按旧清单顺序的源PNG、可用抠图基底与当前精修PNG及各自SHA-256。缺少必需源PNG则失败；缺少抠图结果允许迁移为待抠图动作，并列出缺失帧。迁移不改写旧缓存、原视频和图片。

## 映射表

| 旧单动作字段/文件 | 新项目字段/文件 | 规则 |
| --- | --- | --- |
| 旧`sequence.id` | `action.source.sequenceId`与`migration.sourceSequenceId` | 来源身份原样保留；项目、角色和动作ID由用户明确填写，相同输入重试不会重复添加动作。 |
| 旧清单版本、清单及图片哈希 | `migration.sourceFormatVersion/sourceSha256` | 哈希覆盖规范化旧清单与所有输入图片字节哈希，作为迁移凭据。 |
| 旧`name` | 项目、角色、动作显示名 | 只生成初始名称，后续可各自修改。 |
| 无角色字段 | `characters[0].id="character-1"` | 稳定默认ID，不推测角色身份。 |
| 无动作字段 | `actions[0].id="action-1"` | 稳定默认ID，可编辑显示名。 |
| 旧帧数组顺序 | `action.frames`数组顺序 | 原样保留；不按文件名、来源时刻重新排序。 |
| 旧`frame.id` | `frame.id`与`source.sourceFrameId` | 原样保留；排序后仍不重编号。 |
| 旧`sourceFrameIndex/sourceTimeSeconds/sourcePts` | 同名来源字段 | `"分子/分母"`精确解析成有理数对象；缺失时为`null`，不从序号推断。 |
| 旧`loop`、抽帧`fps` | `action.loop/playback.fps` | 有效FPS保留；v3/v4缺少时用本次迁移明确输入的播放速度，不猜源视频FPS。 |
| 旧源PNG、自动抠图、当前精修PNG | `assets.source/mattingBase/current` | 复制为项目内路径，记录对应帧修订；当前精修优先展示。 |
| 旧`canvas` | 初始动作来源尺寸 | 仅作提议值；角色`canvas/origin/referenceImage`均为`null`，直到R2校准。 |
| 旧`sampleTimeSeconds/durationSeconds` | `frame.source.sampleTimeSeconds/sourceSampleDurationSeconds` | 作为来源证据精确保留，不驱动v1动作播放。 |
| 旧`sequenceTimeSeconds` | 迁移报告中的旧序列视图 | 它由旧顺序和时长计算，不是独立真值；不写入v1动作时间轴。 |

精修`revision`取旧批次的单帧修订；项目、角色、动作初次导入修订统一为0。源图片不存在时不能用抠图图片冒充源图片。没有原视频文件时`source.video=null`；`source.kind`仍是`video-extraction`。v2使用`extraction`，v3使用`originalExtraction`，v4使用其绑定的原始v2来源；缺少对应来源元数据时显式失败，不拼凑伪来源。v2/v3只有源PNG时，`mattingBase/current`保持`null`。

## 幂等事务

1. 计算冻结输入的`sourceSha256`，目标目录使用用户指定的项目根目录，不因再次导入自动附加序号。
2. 如果目标没有`project.json`，按[保存协议](character-project-storage.md)先复制不可变资产，再提交清单。
3. 如果目标已存在且`migration.sourceSequenceId/sourceSha256`与输入一致，返回`ALREADY_IMPORTED`和现有项目；即使后来编辑过，也不覆盖它。
4. 如果目标已存在但凭据不同，返回`TARGET_CONFLICT`；不得覆盖、合并或删除现有项目。
5. 失败后再次重试可复用内容相同的孤儿图片，或者写入新不可变文件；已提交清单的内容不可变。

## 示例与验收

旧输入：v2序列`abc...`含`run`的两帧`abc...-000001/000002`，来源时刻`0/1`、`1/12`，第2帧已精修修订2。迁移输出：一个`character-1`、一个`action-1`，帧顺序和ID不变，第2帧`revision=2`且`current`指向精修PNG；角色基准全空，运行时正式导出显示“需校准”。同一输入再次导入返回`ALREADY_IMPORTED`，修改某个像素后再导入也不得把修改回滚。

R1迁移测试已覆盖v2/v3/v4版本映射、图片内容凭据、原缓存字节不变、缺源失败、缺抠图保持未抠状态、重复导入幂等、来源内容变化与动作ID冲突。项目仓库测试另覆盖清单替换失败、旧修订和外部锁冲突；旧精确时间通过有理数解析进入项目协议。

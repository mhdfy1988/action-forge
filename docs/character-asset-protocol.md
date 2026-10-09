# 角色资产协议 v1 草案

## 状态

本文件是 R0 设计协议，尚未实现读取、保存或界面功能。第一版采用单一 `project.json` 作为编辑真值，PNG等二进制资产使用项目内相对路径引用；不使用Godot、JavaScript或其他引擎格式作为核心模型。

## 设计目标

- 一个项目可以保存多个角色，一个角色可以保存多个动作。
- 同一角色的动作共享画布和稳定原点。
- 保留现有源帧身份、来源时间、抠图/精修修订和动作顺序。
- 项目可以关闭后重新打开，不依赖临时任务缓存还原。
- 引擎产物可以从项目清单重复生成，但不能成为编辑真值。
- v1保持最小：不内置游戏状态机、输入、战斗、AI或复杂动画混合。

## 文件布局

```text
<project-root>/
├─ project.json
├─ assets/
│  ├─ characters/<character-id>/reference/
│  └─ characters/<character-id>/actions/<action-id>/
│     ├─ source/
│     ├─ matting/
│     └─ current/
└─ generated/
   ├─ runtime/
   ├─ godot/
   └─ javascript/
```

`project.json`与`assets/`属于项目数据；`generated/`是可删除、可重新生成的派生结果。

## 顶层结构

```json
{
  "formatVersion": 1,
  "kind": "action-forge-project",
  "id": "raccoon-project",
  "name": "浣熊动作资产",
  "revision": 3,
  "characters": [
    {
      "id": "raccoon", "name": "浣熊", "revision": 0,
      "referenceImage": null, "canvas": null, "origin": null,
      "scale": {"x": 1, "y": 1}, "actions": []
    }
  ]
}
```

| 字段 | 规则 |
| --- | --- |
| `formatVersion` | v1固定为整数`1`。未知版本拒绝加载，不能猜测兼容。 |
| `kind` | 固定为`action-forge-project`。 |
| `id` | 项目内稳定ID，匹配`^[a-z0-9][a-z0-9._-]{0,63}$`，创建后不随显示名称改变。 |
| `name` | 面向用户的UTF-8名称，1–80个字符。 |
| `revision` | 非负整数；每次成功保存整个项目后递增。 |
| `migration` | 可选的旧结果导入凭据：旧清单版本、旧序列ID和输入内容SHA-256；创建新项目时为`null`或省略。导入后不可编辑。 |
| `characters` | 角色数组，角色ID不得重复。v1至少包含一个角色。 |

v1运行时模型使用严格字段校验；未知字段拒绝，防止拼写错误被静默忽略。格式升级必须显式迁移。

## 角色资产

```json
{
  "id": "raccoon",
  "name": "浣熊",
  "revision": 2,
  "referenceImage": "assets/characters/raccoon/reference/base.png",
  "canvas": {"width": 847, "height": 714},
  "origin": {"x": 423, "y": 650},
  "scale": {"x": 1, "y": 1},
  "actions": []
}
```

- `revision`只在该角色或其动作内容成功保存时递增，用于局部冲突判断。
- `referenceImage`可以为`null`；没有参考图时不能伪造基准已建立。
- `canvas`和`origin`可以同时为`null`，表示尚未完成跨动作基准校准；两者不能只填一个。完成校准后，`canvas.width/height`是所有动作正式输出的统一像素画布，范围1–8192，乘积不超过1600万像素。
- 坐标系固定为左上角原点、X向右、Y向下；`origin`使用画布像素坐标，允许落在画布边界上。
- `scale`是角色级非破坏缩放，X/Y必须为有限正数；v1默认均为1。
- 同一角色的动作ID不得重复。

## 动作片段

```json
{
  "id": "run",
  "name": "跑步",
  "revision": 4,
  "loop": true,
  "playback": {
    "mode": "constant-fps",
    "fps": 12
  },
  "transform": {
    "offset": {"x": 0, "y": 0},
    "scale": {"x": 1, "y": 1},
    "rotationDegrees": 0
  },
  "source": {"kind": "image-sequence", "sequenceId": "imported-run", "declaredFps": 12},
  "frames": [],
  "events": []
}
```

- `revision`只在该动作编辑内容保存成功后递增。
- `loop`表示动作播放到末帧后是否返回首帧。
- v1正式支持`constant-fps`，`fps`为1–60整数，单帧播放时长由`1/fps`推导；源视频展示时间只保留为来源信息，不控制最终动作速度。逐帧时长留给R4的协议升级，不在v1暗存。
- `transform`是动作级整体变换，不能改写角色级共享画布和原点。
- `rotationDegrees`是顺时针角度，必须为有限数；第一版界面可限制为`-180..180`。
- 数组中的帧顺序就是播放顺序，不再保存可冲突的`order`字段。

## 动作来源

视频抽帧来源：

```json
{
  "kind": "video-extraction",
  "video": "assets/characters/raccoon/actions/run/source/source.mp4",
  "sequenceId": "0123456789abcdef0123456789abcdef",
  "extraction": {
    "startSeconds": {"numerator": 0, "denominator": 1},
    "endSeconds": {"numerator": 1, "denominator": 1},
    "fps": 12
  }
}
```

已有图片序列来源：

```json
{
  "kind": "image-sequence",
  "sequenceId": "imported-run",
  "declaredFps": 12
}
```

`video`可以为`null`，表示迁移时未把原视频纳入项目；这不会影响已保存帧，但界面必须显示“原视频未归档”。

## 动作帧

```json
{
  "id": "frame-000001",
  "revision": 1,
  "enabled": true,
  "assets": {
    "source": "assets/characters/raccoon/actions/run/source/frame_000001.png",
    "mattingBase": "assets/characters/raccoon/actions/run/matting/frame_000001.png",
    "current": "assets/characters/raccoon/actions/run/current/frame_000001.png"
  },
  "source": {
    "sourceFrameId": "0123456789abcdef0123456789abcdef-000001",
    "sourceFrameIndex": 0,
    "sourceTimeSeconds": {"numerator": 0, "denominator": 1},
    "sourcePts": 0
  }
}
```

- 帧ID在项目内唯一且稳定；拖动排序只改变数组位置，不改变ID。
- `revision`在`current`图片或单帧编辑数据成功保存后递增。
- `assets.source`必须存在且只读；`mattingBase`和`current`可以为`null`。
- 有`current`时预览和正式生成使用`current`；否则使用`mattingBase`；两者都不存在时只允许查看源帧，不能宣称透明资产已就绪。
- `sourceFrameId`保留原抽帧身份；没有可靠来源字段时写`null`，不能根据新序号伪造。
- 可选`sampleTimeSeconds`、`sourceSampleDurationSeconds`只保存旧抽帧采样位置与原时长作为来源证据；不影响v1动作播放，不能当作逐帧播放时长。
- `enabled=false`表示动作播放和正式生成忽略该帧，源素材仍保留。

## 动作事件

```json
{
  "id": "event-footstep-left",
  "frameId": "frame-000002",
  "type": "footstep",
  "parameters": {"foot": "left"}
}
```

- 事件发生在目标帧开始时。
- `frameId`必须引用同一动作中的启用帧。
- `type`使用项目中立字符串，不写`AnimationPlayer`、DOM事件名等引擎实现。
- `parameters`只允许JSON值；v1单个事件序列化后最大16KiB。
- 删除或禁用被事件引用的帧时必须先提示并明确处理事件，不能留下悬空引用。

## 有理数

来源时间使用：

```json
{"numerator": 1, "denominator": 12}
```

- 分子是整数，分母是正整数。
- 保存时约分并保持分母为正。
- 不以浮点秒替换来源真值；小数只作为界面显示结果。

## 相对路径规则

- 使用`/`作为分隔符。
- 必须是项目根目录下的相对路径。
- 禁止空段、`.`、`..`、反斜杠、绝对路径、盘符、UNC路径、NUL和控制字符。
- 解析后的规范绝对路径必须仍位于项目根目录内。
- `generated/`不得被协议字段引用为编辑源。

## 覆盖顺序

有效显示变换按以下固定顺序计算：

1. 原始帧像素。
2. 角色级`scale`。
3. 动作级`transform.scale`和`rotationDegrees`。
4. 动作级`transform.offset`。
5. 放入角色共享`canvas`，以角色`origin`作为稳定锚点。

v1不保存单帧几何覆盖。以后如增加，必须通过新字段和格式版本明确加入，不能把隐藏状态写进图片或复用动作偏移字段。

## 派生状态

以下状态由数据计算，不写回`project.json`：

- `hasSourceFrames`：所有启用帧都有`assets.source`。
- `hasTransparentFrames`：所有启用帧都有`current`或`mattingBase`。
- `hasCharacterBaseline`：角色有参考图、有效共享画布和原点。
- `runtimeReady`：已建立角色基准，至少一个动作有启用帧，且该动作每个启用帧都有透明结果和有效播放参数。未校准的旧数据允许打开与编辑，但不能标为正式游戏资产。

不保存“整理结束”“抠图完成”等人工流程标志。

## 示例

- [合法双动作项目](examples/character-asset-v1.valid.json)
- [非法重复动作ID](examples/character-asset-v1.invalid-duplicate-action.json)
- [非法越界相对路径](examples/character-asset-v1.invalid-parent-path.json)

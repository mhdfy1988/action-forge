# 引擎实时预览协议（R0-D）

## 目标与边界

角色项目仍是编辑真值。预览连接只把当前已保存的角色动作投影到游戏引擎，不让引擎反写项目；连接断开或引擎未运行不妨碍项目编辑。正式导出使用独立适配器和产物校验，不能把预览缓存当成正式游戏资产。

R3首个目标是本机Godot预览；核心协议为引擎中立JSON消息，Godot适配层处理图片加载与动画显示。JavaScript适配器留到R5。传输候选为仅监听回环地址的WebSocket消息加只读图片端点；R3实现前需对照Godot当前官方接口确认选型，本文件不声称连接已实现。

## 完整快照

只有`runtimeReady`角色才能发正式可播放快照；未校准角色可在工作区查看，但预览连接应返回`BASELINE_REQUIRED`，不能以临时中心点伪装基准。快照包含：

```json
{
  "type": "snapshot", "protocolVersion": 1, "messageId": "m-001",
  "projectId": "raccoon-project", "projectRevision": 3,
  "character": {
    "id": "raccoon", "revision": 2,
    "canvas": {"width": 847, "height": 714},
    "origin": {"x": 423, "y": 650},
    "scale": {"x": 1, "y": 1}
  },
  "actions": [
    {
      "id": "run", "revision": 1, "loop": true,
      "fps": 12,
      "transform": {
        "offset": {"x": 0, "y": 0},
        "scale": {"x": 1, "y": 1}, "rotationDegrees": 0
      },
      "frames": [
        {"id": "run-frame-000001", "revision": 0,
         "imageUrl": "/preview/assets/run-frame-000001?r=0",
         "sha256": "<64位小写十六进制内容摘要>"}
      ],
      "events": []
    }
  ]
}
```

快照只含启用帧，帧顺序即播放顺序；`imageUrl`是本机只读端点，不是磁盘绝对路径。端点需校验连接令牌、文件归属和SHA-256，不能允许任意路径读取。图片字节是清单中`current`优先、其次`mattingBase`的已保存PNG；源图不能伪装透明结果。快照中的`sha256`用于引擎缓存与更新判断，示意占位符不作为真实消息值。

## 增量消息

```json
{
  "type": "patch", "protocolVersion": 1, "messageId": "m-002",
  "projectId": "raccoon-project", "baseRevision": 3, "nextRevision": 4,
  "characterId": "raccoon", "actionId": "jump",
  "change": {
    "kind": "replace-action",
    "action": "与快照中单个action同结构的完整动作对象"
  }
}
```

R3第一版只支持`replace-action`和`replace-character-baseline`两种语义补丁；它们替换对应子树，不做逐像素或JSON任意路径操作。项目仓库保存成功后才发补丁，`baseRevision`必须等于接收端当前修订，`nextRevision`必须等于已保存项目修订。连续保存可合并成新完整快照，但不能跳过修订后仍假装补丁连续。

接收端确认：`{"type":"ack","messageId":"m-002","appliedRevision":4}`。重复`messageId`且内容摘要相同应幂等确认，不重复应用；相同ID不同内容返回`MESSAGE_CONFLICT`。引擎端可以回报`{"type":"select-action","actionId":"jump"}`只影响预览播放选择，不写回项目。项目端可以发送`play`/`pause`/`seek-frame`预览控制，它们不改变项目修订。

## 状态与错误

```text
未连接 → 连接中 → 已连接 → 等待快照确认 → 已同步
             └→ 连接失败                  ├→ 发送补丁 → 等待确认 → 已同步
                                           └→ 冲突/超时 → 重发完整快照
已同步 → 断开 → 重连 → 重新握手 → 完整快照确认
```

连接握手包含协议版本、客户端实例ID和短期本机令牌；版本不匹配直接`PROTOCOL_UNSUPPORTED`。收到旧修订或漏修订补丁返回`REVISION_CONFLICT`，发送端重新从已保存项目制作完整快照。图片不可读返回`ASSET_MISSING`，校验不一致返回`ASSET_HASH_MISMATCH`；这些都不能静默显示旧图片并报告成功。超时后状态为“未同步”，界面要显示当前已确认修订和待发送修订。

## 第一版验收序列

1. 保存`run`和`jump`两个动作的项目修订3，连接Godot，发送完整快照并收到修订3确认。
2. 在工作区修改`jump`偏移并保存成修订4；发送`replace-action`补丁，Godot仍可切换`run`且`jump`位置更新。
3. 模拟丢掉修订4确认后重连；重新握手、完整快照修订4确认，不重复应用旧补丁。
4. 制造图片哈希不符，预览标为未同步并明确报错；正式导出不受预览连接状态影响。

这属于R3的运行验收，不是R0完成项。R0只固定消息契约和失败语义。

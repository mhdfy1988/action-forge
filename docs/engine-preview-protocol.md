# 引擎实时预览协议（R4）

## 目标与边界

角色项目仍是编辑真值。Godot 实时预览只接收角色、动作、帧、逐帧时长、事件和空间参数，不向项目回写，也不修改用户的 Godot 工程。预览桥仅绑定 `127.0.0.1`，运行态会话、令牌与快照仅保存在内存；应用关闭、会话过期或显式断开后即失效。正式导入/应用到用户工程是后续独立能力，不属于 R4。

浏览器通过带短期令牌的 HTTP `PUT` 发布当前编辑态；Godot 原生客户端通过带令牌的 WebSocket 订阅。WebSocket 用于低频编辑消息，不用于高速游戏联网。帧图像由 Godot 按帧 ID 调用本机只读 HTTP 接口获取，绝不接受客户端提供的绝对路径或任意 URL。

## 会话生命周期

```text
无会话 --浏览器创建--> 等待连接 --Godot鉴权连接--> 已连接/等待快照
                                          └--状态更新--> 已同步
已同步 --浏览器编辑态更新--> 等待确认 --Godot确认--> 已同步
任意状态 --断开/到期/服务退出--> 无会话
```

1. 浏览器向 `POST /api/character-projects/{projectId}/preview-sessions` 创建会话。服务检查项目存在且角色有共享画布、原点和基准动作；返回随机 `sessionId`、一次性显示的随机令牌和 WebSocket 地址。
2. 浏览器以 `Authorization: Bearer <token>` 调用 `PUT /api/preview-sessions/{sessionId}/snapshot` 发布当前编辑态。项目数据须通过严格运行时模型校验，且角色、动作、帧及帧资产路径必须与磁盘项目相符；只允许同步空间参数、播放状态与选中项等预览态差异。
3. Godot 用 `WebSocketPeer.handshake_headers` 携带令牌连接；服务器只允许一个 Godot 客户端占用一个会话，并推送最新快照/状态更新。
4. Godot 使用 `HTTPRequest` 请求会话内的 `/frames/{frameId}`，令牌必须匹配，帧必须属于该项目；服务端仅返回清单当前帧资产（`current` 优先，其次 `mattingBase`，再其次 `source`）。
5. 会话令牌只在内存中保存摘要；令牌不放在 URL、日志或快照中。客户端不得用令牌访问其他项目、会话或任意路径。

## 消息与版本

所有 WebSocket 消息为 UTF-8 JSON 对象，必须带 `protocolVersion: 2`、`messageId` 和非负 `revision`。v2快照增加播放模式、逐帧时长和事件列表；未知字段、未知消息类型、超限消息或不支持的协议版本均明确拒绝，不做旧协议静默降级。

### 浏览器发布的预览快照

```json
{
  "type": "snapshot",
  "protocolVersion": 2,
  "messageId": "随机消息标识",
  "revision": 7,
  "projectId": "hero-project",
  "characterId": "hero",
  "activeActionId": "run",
  "activeFrameId": "run-000001",
  "playing": false,
  "character": {
    "canvas": {"width": 512, "height": 512},
    "origin": {"x": 256, "y": 460},
    "scale": {"x": 1, "y": 1}
  },
  "actions": [{
    "id": "run", "name": "跑步",
    "playback": {"mode": "per-frame"}, "loop": true,
    "transform": {
      "offset": {"x": 0, "y": 0},
      "scale": {"x": 1, "y": 1}, "rotationDegrees": 0
    },
    "frames": [
      {"id": "run-000001", "revision": 0, "duration": {"numerator": 1, "denominator": 12}},
      {"id": "run-000002", "revision": 0, "duration": {"numerator": 1, "denominator": 10}}
    ],
    "events": [{"id":"event-footstep","frameId":"run-000002","type":"footstep","parameters":{"foot":"left"}}]
  }]
}
```

固定帧率动作使用 `playback: {"mode":"constant-fps","fps":12}`；每帧的 `duration` 为 `null`。逐帧模式使用约分的有理数秒数，Godot 适配器以此推进本地播放。事件引用稳定 `frameId`，在进入该帧时记录；顺序、禁用帧和循环行为均使用核心角色资产协议语义。

浏览器播放时以快照中的 `activeFrameId` 和 `playing` 为准，Godot镜像这些帧切换，不另起一套计时器，避免重复推进或重复触发事件。浏览器暂停后，Godot可使用本地播放按钮独立验证相同的时长和事件序列。Godot的事件栏仅展示触发类型，不执行游戏逻辑。

### Godot 确认

```json
{"type":"ack","protocolVersion":2,"messageId":"随机消息标识","revision":7}
```

Godot 只在应用完整快照且当前帧图像成功加载后确认该 `revision`。旧修订会忽略；缺少帧、无法解码、尺寸不符或载入失败会返回具名错误并保持“未同步”，不得继续展示旧帧并伪报成功。重连时服务端立即补发当前最新完整快照，不依赖断线期间的增量队列。

服务端只在 `messageId` 与当前完整快照匹配且修订仍为最新时更新已确认修订，并返回：

```json
{"type":"snapshot-acknowledged","protocolVersion":2,"messageId":"随机消息标识","revision":7}
```

Godot 收到匹配的服务端回执后才显示“已同步”；仅成功调用 `send_text()` 不代表服务端已确认。

## 关键不变式

- 预览接收端只读；仅浏览器经现有项目保存 API 改变持久状态。
- 服务进程不把预览快照写入项目目录，也不改动用户的 Godot 工程目录。
- 所有资产查找由服务端以已验证项目清单和帧 ID 完成；禁止路径拼接来自客户端的文件路径。
- 同一会话只有一个已配对的 Godot 客户端；短期令牌只授权该会话。
- 每次发布都以完整当前快照替换旧状态；修订单调递增，服务端确认消息标识和修订后返回回执，Godot 收到后才显示为已同步。
- 浏览器刷新或 Godot 重启后允许重新连接；服务端进程重启后会话清空，需重新创建。
- 尚未保存的新增/删除帧不进入预览；首版只预览已保存项目中存在的帧与编辑态变换。

## 错误语义

`PROJECT_NOT_READY`（缺少共享画布、原点或基准）、`SESSION_EXPIRED`、`TOKEN_INVALID`、`PROTOCOL_UNSUPPORTED`、`SNAPSHOT_INVALID`、`PROJECT_STRUCTURE_CHANGED`、`FRAME_NOT_FOUND`、`ASSET_MISSING`、`IMAGE_DECODE_FAILED`、`REVISION_STALE`、`CLIENT_ALREADY_CONNECTED`。任何错误都应显示具体未同步状态；不静默回退到旧帧或正式导出文件。

## R4 验收流程

1. 建立含 `run` 与 `jump` 的已保存角色项目，创建本机预览会话。
2. 启动最小 Godot 预览工程，使用一次性令牌连接；确认画布、原点、逐帧时长、当前帧和事件记录正确。
3. 在浏览器切换 `run/jump`、播放/暂停、调整动作缩放/偏移；Godot镜像浏览器帧与事件，浏览器播放时不自行重复计时。
4. 重启 Godot 客户端后重新连接，收到完整最新快照并恢复预览；旧令牌/过期会话拒绝。
5. 核对预览开始前后项目清单及用户工程目录未被桥接流程写入；完整跑浏览器既有回归。

## 官方接口依据

- Godot `WebSocketPeer`：原生客户端可用握手头、`connect_to_url()`、轮询、文本消息，适合本机编辑状态订阅。
- Godot `HTTPRequest`：异步请求 PNG；示例用 `Image.load_png_from_buffer()` 与 `ImageTexture.create_from_image()` 创建运行时纹理。
- Godot 的 WebSocket 是消息协议，不适合高速实时联网；本功能只传低频编辑状态与帧切换。

具体源码证据和当前核对日期见[Godot 预览桥源码证据索引](reference-godot-preview.md)。

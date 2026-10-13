# Godot 本机预览源码证据索引

## 官方接口（2026-10-09 核对）

- [WebSocketPeer（stable）](https://docs.godotengine.org/en/stable/classes/class_websocketpeer.html)：原生客户端支持 `handshake_headers`、`connect_to_url()`、周期性 `poll()`、`send_text()` 和收取文本包。用握手头传短期令牌，不把令牌写进 URL。
- [Using WebSockets（stable）](https://docs.godotengine.org/en/stable/tutorials/networking/websocket.html)：消息式通信，可用于浏览器/原生客户端与服务端双向通信；不是低延迟游戏网络协议。本项目只发编辑态快照，不承载游戏运行流量。
- [HTTPRequest（stable）](https://docs.godotengine.org/en/stable/classes/class_httprequest.html)：异步下载帧 PNG；文档示例用 `Image.load_png_from_buffer(body)` 解析，再以 `ImageTexture.create_from_image(image)` 生成运行时纹理。单个请求节点不应同时发多个请求。
- [ImageTexture（stable）](https://docs.godotengine.org/en/stable/classes/class_imagetexture.html)：为运行时图像创建纹理；频繁替换同尺寸图时 `update()` 比重新分配更合适。

## 参考项目对照

`docs/reference-xsxb-frame-tuner.md` 所记录的 XSXB 版本把 Godot 同步实现为文件复制/生成运行时清单。它适用于正式同步资产，但不是即时预览桥。本项目借鉴“核心协议与引擎适配器分离”，不直接复制其工程写入路径；R3 临时预览仅走回环地址、内存态会话和清单帧只读端点。

## 当前实现验证状态

R3验收使用官方 Godot 4.7.2 stable Windows portable 构建，SHA-256 与官方发布资产摘要一致；运行时保存在仓库忽略的 `output/godot-validation/`，未安装或替换系统级 Godot。无编辑器语法/运行错误。真实客户端专项通过：双动作、PNG加载、帧率播放、共享画布/原点、跳跃整组变换、严格修订确认、同令牌断线重连恢复；角色项目清单在预览前后保持一致。测试入口见 `tests/run_godot_preview_acceptance.py`。

验证中发现：Godot JSON解析把 `revision` 数值交给Variant后会序列化为浮点（例如 `1.0`），而服务端协议使用严格整数校验。客户端必须显式 `int()` 转换；服务端收到匹配的ACK后返回 `snapshot-acknowledged`，客户端仅在回执到达后显示已同步。勿将“Godot已加载图像/发送ACK”单独视为协议完成。

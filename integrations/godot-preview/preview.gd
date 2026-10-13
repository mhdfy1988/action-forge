extends Control

const PROTOCOL_VERSION = 2

var socket = WebSocketPeer.new()
var socket_url = ""
var bearer_token = ""
var session_id = ""
var http_base = ""
var snapshot = {}
var active_action_id = ""
var active_frame_id = ""
var frame_index = 0
var frame_elapsed = 0.0
var playing = false
var remote_playing = false
var previous_remote_playing = false
var texture = null
var loaded_frame_id = ""
var request_frame_id = ""
var request_revision = -1
var pending_frame_id = ""
var connected = false
var connecting = false
var exit_after_revision = 0
var acceptance_mode = false
var status_label
var event_label
var url_input
var token_input
var connect_button
var disconnect_button
var action_picker
var play_button
var image_request


func _ready():
	_build_ui()
	image_request = HTTPRequest.new()
	image_request.body_size_limit = 12 * 1024 * 1024
	image_request.timeout = 12.0
	image_request.request_completed.connect(_on_image_completed)
	add_child(image_request)
	set_process(true)
	_read_launch_args()


func _read_launch_args():
	var args = OS.get_cmdline_user_args()
	var launch_url = ""
	var launch_token = ""
	for argument in args:
		if argument.begins_with("--preview-url="):
			launch_url = argument.trim_prefix("--preview-url=")
		elif argument.begins_with("--preview-token="):
			launch_token = argument.trim_prefix("--preview-token=")
		elif argument == "--preview-exit-after-ack":
			exit_after_revision = 1
		elif argument.begins_with("--preview-exit-after-revision="):
			exit_after_revision = int(argument.trim_prefix("--preview-exit-after-revision="))
		elif argument == "--preview-acceptance-mode":
			acceptance_mode = true
	if not launch_url.is_empty() and not launch_token.is_empty():
		url_input.text = launch_url
		token_input.text = launch_token
		_connect_preview()


func _build_ui():
	var root = VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 10)
	root.offset_left = 16
	root.offset_top = 14
	root.offset_right = -16
	root.offset_bottom = -14
	add_child(root)

	var heading = Label.new()
	heading.text = "动作工坊 · Godot 实时预览"
	heading.add_theme_font_size_override("font_size", 22)
	root.add_child(heading)

	var connection = HBoxContainer.new()
	connection.add_theme_constant_override("separation", 8)
	root.add_child(connection)
	url_input = LineEdit.new()
	url_input.placeholder_text = "粘贴动作工坊提供的 WebSocket 地址"
	url_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	connection.add_child(url_input)
	token_input = LineEdit.new()
	token_input.placeholder_text = "一次性预览令牌"
	token_input.secret = true
	token_input.custom_minimum_size.x = 220
	connection.add_child(token_input)
	connect_button = Button.new()
	connect_button.text = "连接"
	connect_button.pressed.connect(_connect_preview)
	connection.add_child(connect_button)
	disconnect_button = Button.new()
	disconnect_button.text = "断开"
	disconnect_button.disabled = true
	disconnect_button.pressed.connect(_disconnect_preview)
	connection.add_child(disconnect_button)

	var controls = HBoxContainer.new()
	controls.add_theme_constant_override("separation", 8)
	root.add_child(controls)
	action_picker = OptionButton.new()
	action_picker.custom_minimum_size.x = 220
	action_picker.item_selected.connect(_on_action_selected)
	controls.add_child(action_picker)
	play_button = Button.new()
	play_button.text = "播放"
	play_button.disabled = true
	play_button.pressed.connect(_toggle_playback)
	controls.add_child(play_button)
	status_label = Label.new()
	status_label.text = "未连接"
	status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	controls.add_child(status_label)
	event_label = Label.new()
	event_label.text = "事件：—"
	event_label.custom_minimum_size.x = 220
	controls.add_child(event_label)

	var canvas = Control.new()
	canvas.name = "Canvas"
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(canvas)


func _connect_preview():
	var candidate_url = url_input.text.strip_edges()
	var candidate_token = token_input.text.strip_edges()
	var regex = RegEx.new()
	regex.compile("^(ws|wss)://(127\\.0\\.0\\.1|localhost):([0-9]{1,5})/api/preview-sessions/([a-f0-9]{32})/socket$")
	var match_result = regex.search(candidate_url)
	if match_result == null or candidate_token.length() < 40:
		_set_status("地址或令牌格式无效")
		return
	socket_url = candidate_url
	bearer_token = candidate_token
	session_id = match_result.get_string(4)
	var scheme = "https" if match_result.get_string(1) == "wss" else "http"
	http_base = "%s://%s:%s" % [scheme, match_result.get_string(2), match_result.get_string(3)]
	socket = WebSocketPeer.new()
	socket.handshake_headers = PackedStringArray(["Authorization: Bearer " + bearer_token])
	var error = socket.connect_to_url(socket_url)
	if error != OK:
		_set_status("无法启动连接，错误码 %d" % error)
		return
	connect_button.disabled = true
	connecting = true
	_set_status("正在连接本机预览桥…")


func _disconnect_preview():
	if socket.get_ready_state() != WebSocketPeer.STATE_CLOSED:
		socket.close(1000, "用户断开")
	connected = false
	connecting = false
	connect_button.disabled = false
	disconnect_button.disabled = true
	play_button.disabled = true
	_set_status("已断开")


func _process(delta):
	if socket.get_ready_state() != WebSocketPeer.STATE_CLOSED:
		socket.poll()
		var state = socket.get_ready_state()
		if state == WebSocketPeer.STATE_OPEN:
			if not connected:
				connected = true
				connecting = false
				disconnect_button.disabled = false
				_set_status("已连接，等待动作工坊同步")
			while socket.get_available_packet_count() > 0:
				var packet = socket.get_packet()
				if not socket.was_string_packet():
					_set_status("收到不支持的二进制消息")
					continue
				_handle_message(packet.get_string_from_utf8())
		elif state == WebSocketPeer.STATE_CLOSED and connecting:
			connecting = false
			connect_button.disabled = false
			_set_status("连接失败；请确认动作工坊会话仍有效")
		elif state == WebSocketPeer.STATE_CLOSED and connected:
			connected = false
			connect_button.disabled = false
			disconnect_button.disabled = true
			play_button.disabled = true
			_set_status("连接中断；可用同一地址和令牌重新连接")

	if playing and not remote_playing and not snapshot.is_empty():
		var action = _active_action()
		var frames = action.get("frames", []) if action else []
		if frames.size() > 1:
			frame_elapsed += delta
			var advances = 0
			while playing and frame_elapsed >= _frame_duration(action, frames[frame_index]) and advances < 64:
				frame_elapsed -= _frame_duration(action, frames[frame_index])
				if frame_index + 1 < frames.size():
					frame_index += 1
				elif action.get("loop", true):
					frame_index = 0
				else:
					playing = false
					play_button.text = "播放"
					break
				_set_frame(str(frames[frame_index].get("id", "")))
				_record_frame_events(action, str(frames[frame_index].get("id", "")))
				advances += 1


func _handle_message(text):
	var message = JSON.parse_string(text)
	if typeof(message) != TYPE_DICTIONARY:
		_set_status("收到无效 JSON 消息")
		return
	if int(message.get("protocolVersion", -1)) != PROTOCOL_VERSION:
		_set_status("预览协议版本不匹配")
		return
	match message.get("type", ""):
		"session-ready":
			_set_status("已配对，等待动作工坊同步")
		"snapshot":
			_apply_snapshot(message)
		"snapshot-acknowledged":
			if int(message.get("revision", -1)) == int(snapshot.get("revision", -2)) and message.get("messageId", "") == snapshot.get("messageId", ""):
				_set_status("已同步 · 修订 %d · %s · 第 %d / %d 帧" % [
					int(snapshot.get("revision", 0)), active_action_id,
					frame_index + 1, _active_action().get("frames", []).size(),
				])
		"error":
			_set_status("预览未同步：%s" % message.get("detail", message.get("code", "未知错误")))
		_:
			_set_status("收到未知消息类型")


func _apply_snapshot(next_snapshot):
	if int(next_snapshot.get("revision", -1)) < int(snapshot.get("revision", -1)):
		return
	if not next_snapshot.has("character") or not next_snapshot.has("actions"):
		_set_status("快照缺少角色或动作数据")
		return
	var previous_frame_id = active_frame_id
	var had_snapshot = not snapshot.is_empty()
	snapshot = next_snapshot
	active_action_id = str(snapshot.get("activeActionId", ""))
	previous_remote_playing = remote_playing
	remote_playing = bool(snapshot.get("playing", false))
	playing = remote_playing
	frame_elapsed = 0.0
	_populate_actions()
	var action = _active_action()
	if action == null:
		_set_status("预览未同步：当前动作不存在")
		return
	var frames = action.get("frames", [])
	active_frame_id = str(snapshot.get("activeFrameId", ""))
	frame_index = 0
	for index in range(frames.size()):
		if frames[index].get("id", "") == active_frame_id:
			frame_index = index
			break
	if frames.is_empty():
		_set_status("预览未同步：当前动作没有启用帧")
		return
	play_button.disabled = remote_playing
	play_button.text = "浏览器播放中" if remote_playing else ("暂停" if playing else "播放")
	if remote_playing and (not had_snapshot or previous_frame_id != active_frame_id or not previous_remote_playing):
		_record_frame_events(action, active_frame_id)
	_set_frame(active_frame_id)


func _populate_actions():
	action_picker.clear()
	for action in snapshot.get("actions", []):
		action_picker.add_item(str(action.get("name", action.get("id", "动作"))))
		action_picker.set_item_metadata(action_picker.item_count - 1, action.get("id", ""))
		if action.get("id", "") == active_action_id:
			action_picker.select(action_picker.item_count - 1)


func _on_action_selected(index):
	if index < 0 or index >= action_picker.item_count:
		return
	active_action_id = str(action_picker.get_item_metadata(index))
	var action = _active_action()
	var frames = action.get("frames", []) if action else []
	frame_index = 0
	if frames.size() > 0:
		_set_frame(str(frames[0].get("id", "")))


func _active_action():
	for action in snapshot.get("actions", []):
		if action.get("id", "") == active_action_id:
			return action
	return null


func _frame_duration(action, frame):
	var playback = action.get("playback", {})
	if playback.get("mode", "constant-fps") == "per-frame":
		var value = frame.get("duration", {})
		var denominator = max(1, int(value.get("denominator", 1)))
		return max(0.001, float(value.get("numerator", 1)) / denominator)
	return 1.0 / max(1, int(playback.get("fps", 12)))


func _record_frame_events(action, frame_id):
	var labels = []
	for event in action.get("events", []):
		if str(event.get("frameId", "")) == frame_id:
			var event_type = str(event.get("type", "event"))
			labels.append(event_type)
			if acceptance_mode:
				print("ACTION_FORGE_EVENT|%s|%s|%s" % [action.get("id", ""), frame_id, event_type])
	var combined = ""
	for label in labels:
		if not combined.is_empty():
			combined += "、"
		combined += label
	event_label.text = "事件：" + (combined if not combined.is_empty() else "—")


func _set_frame(frame_id):
	if frame_id.is_empty() or (frame_id == loaded_frame_id and texture != null):
		return
	if image_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		pending_frame_id = frame_id
		return
	active_frame_id = frame_id
	request_frame_id = frame_id
	request_revision = int(snapshot.get("revision", -1))
	_set_status("正在加载帧 %s…" % frame_id)
	var url = "%s/api/preview-sessions/%s/frames/%s" % [http_base, session_id, frame_id]
	var headers = PackedStringArray(["Authorization: Bearer " + bearer_token])
	var error = image_request.request(url, headers)
	if error != OK:
		_set_status("预览未同步：帧请求启动失败")
		return


func _on_image_completed(result, response_code, _headers, body):
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		_set_status("预览未同步：帧下载失败（%d）" % response_code)
		if not pending_frame_id.is_empty():
			var next_frame = pending_frame_id
			pending_frame_id = ""
			_set_frame(next_frame)
		return
	var image = Image.new()
	if image.load_png_from_buffer(body) != OK:
		_set_status("预览未同步：PNG 解码失败")
		if not pending_frame_id.is_empty():
			var next_frame = pending_frame_id
			pending_frame_id = ""
			_set_frame(next_frame)
		return
	texture = ImageTexture.create_from_image(image)
	loaded_frame_id = request_frame_id
	queue_redraw()
	if connected and int(snapshot.get("revision", -1)) == request_revision and active_frame_id == loaded_frame_id:
		var ack_error = socket.send_text(JSON.stringify({
			"type": "ack", "protocolVersion": PROTOCOL_VERSION,
			"messageId": snapshot.get("messageId", ""),
			"revision": int(snapshot.get("revision", 0)),
		}))
		socket.poll()
		_set_status("帧已加载，等待同步确认" if ack_error == OK else "预览未同步：确认消息发送失败")
		if exit_after_revision > 0 and request_revision >= exit_after_revision:
			get_tree().quit()
	if not pending_frame_id.is_empty() and pending_frame_id != loaded_frame_id:
		var next_frame = pending_frame_id
		pending_frame_id = ""
		_set_frame(next_frame)


func _toggle_playback():
	if remote_playing:
		return
	playing = not playing
	frame_elapsed = 0.0
	play_button.text = "暂停" if playing else "播放"
	if playing:
		_record_frame_events(_active_action(), active_frame_id)


func _draw():
	var canvas = get_node_or_null("VBoxContainer/Canvas")
	if canvas == null:
		return
	var rect = Rect2(canvas.global_position, canvas.size)
	draw_rect(rect, Color("#202728"), true)
	if snapshot.is_empty() or texture == null:
		return
	var character = snapshot.get("character", {})
	var size = character.get("canvas", {})
	var width = float(size.get("width", 1))
	var height = float(size.get("height", 1))
	var scale_to_view = min(rect.size.x / width, rect.size.y / height)
	var canvas_size = Vector2(width, height) * scale_to_view
	var canvas_position = rect.position + (rect.size - canvas_size) * 0.5
	draw_rect(Rect2(canvas_position, canvas_size), Color("#dce2dc"), true)
	var tile_size = max(12.0, 24.0 / scale_to_view)
	var tile = tile_size * scale_to_view
	for y in range(int(ceil(height / tile_size))):
		for x in range(int(ceil(width / tile_size))):
			if (x + y) % 2 == 0:
				draw_rect(Rect2(canvas_position + Vector2(x, y) * tile, Vector2(tile, tile)), Color("#eef1ec"), true)
	var origin = character.get("origin", {"x": width * 0.5, "y": height * 0.9})
	var origin_point = canvas_position + Vector2(float(origin.get("x", 0)), float(origin.get("y", 0))) * scale_to_view
	var action = _active_action()
	if action == null:
		return
	var transform = action.get("transform", {})
	var offset = transform.get("offset", {"x": 0, "y": 0})
	var action_scale = transform.get("scale", {"x": 1, "y": 1})
	var character_scale = character.get("scale", {"x": 1, "y": 1})
	var anchor = action.get("anchor")
	if typeof(anchor) != TYPE_DICTIONARY:
		anchor = {"x": 0.5, "y": 0.9}
	var pivot = origin_point + Vector2(float(offset.get("x", 0)), float(offset.get("y", 0))) * scale_to_view
	var image_fit = min(width / texture.get_width(), height / texture.get_height())
	var image_scale = scale_to_view * image_fit * Vector2(float(character_scale.get("x", 1)) * float(action_scale.get("x", 1)), float(character_scale.get("y", 1)) * float(action_scale.get("y", 1)))
	draw_set_transform(pivot, deg_to_rad(float(transform.get("rotationDegrees", 0))), image_scale)
	draw_texture(texture, -Vector2(texture.get_width() * float(anchor.get("x", 0.5)), texture.get_height() * float(anchor.get("y", 0.9))))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	draw_line(origin_point + Vector2(-10, 0), origin_point + Vector2(10, 0), Color("#f0604e"), 2.0)
	draw_line(origin_point + Vector2(0, -10), origin_point + Vector2(0, 10), Color("#f0604e"), 2.0)


func _set_status(value):
	if status_label:
		status_label.text = value

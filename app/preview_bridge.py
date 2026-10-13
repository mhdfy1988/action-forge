"""仅内存保存的本机 Godot 预览会话；不修改项目仓库。"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, model_validator

from .character_project_schema import CharacterProject
from .domain import DomainError


PROTOCOL_VERSION = 2
SESSION_TTL_SECONDS = 900


class PreviewSnapshotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    project: CharacterProject
    activeCharacterId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    activeActionId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    activeFrameId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    playing: StrictBool = False

    @model_validator(mode="after")
    def bounded_preview_geometry(self):
        for character in self.project.characters:
            for scale in (character.scale, *(action.transform.scale for action in character.actions)):
                if not (0.05 <= scale.x <= 20 and 0.05 <= scale.y <= 20):
                    raise ValueError("预览缩放必须在0.05到20之间")
            for action in character.actions:
                if abs(action.transform.offset.x) > 16384 or abs(action.transform.offset.y) > 16384:
                    raise ValueError("预览偏移超出允许范围")
                if abs(action.transform.rotationDegrees) > 360:
                    raise ValueError("预览旋转角度超出允许范围")
        return self


class EngineMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    type: str
    protocolVersion: StrictInt
    messageId: str = Field(min_length=1, max_length=80)
    revision: StrictInt = Field(ge=0)


@dataclass
class PreviewSession:
    id: str
    project_id: str
    token_digest: bytes
    expires_at: float
    snapshot: dict[str, Any] | None = None
    asset_paths: dict[str, str] = field(default_factory=dict)
    websocket: WebSocket | None = None
    revision: int = 0
    acknowledged_revision: int = 0


class PreviewBridge:
    def __init__(self, ttl_seconds: int = SESSION_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self.sessions: dict[str, PreviewSession] = {}

    def create(self, project_id: str) -> tuple[PreviewSession, str]:
        self.expire_old()
        if len(self.sessions) >= 32:
            raise DomainError("本机预览会话已达到32个上限")
        token = secrets.token_urlsafe(32)
        session = PreviewSession(
            id=uuid.uuid4().hex,
            project_id=project_id,
            token_digest=hashlib.sha256(token.encode("ascii")).digest(),
            expires_at=time.monotonic() + self.ttl_seconds,
        )
        self.sessions[session.id] = session
        return session, token

    def expire_old(self) -> None:
        now = time.monotonic()
        for session_id, session in list(self.sessions.items()):
            if session.expires_at <= now:
                self.sessions.pop(session_id, None)

    def get(self, session_id: str, authorization: str | None) -> PreviewSession:
        self.expire_old()
        session = self.sessions.get(session_id)
        if session is None:
            raise DomainError("预览会话已过期，请重新创建")
        prefix = "Bearer "
        if not authorization or not authorization.startswith(prefix):
            raise DomainError("预览令牌无效")
        supplied = hashlib.sha256(authorization[len(prefix):].encode("utf-8")).digest()
        if not hmac.compare_digest(supplied, session.token_digest):
            raise DomainError("预览令牌无效")
        session.expires_at = time.monotonic() + self.ttl_seconds
        return session

    @staticmethod
    def _same_frame_topology(current: CharacterProject, saved: CharacterProject) -> bool:
        current_characters = {item.id: item for item in current.characters}
        saved_characters = {item.id: item for item in saved.characters}
        if current_characters.keys() != saved_characters.keys():
            return False
        for character_id, current_character in current_characters.items():
            saved_character = saved_characters[character_id]
            current_actions = {item.id: item for item in current_character.actions}
            saved_actions = {item.id: item for item in saved_character.actions}
            if current_actions.keys() != saved_actions.keys():
                return False
            for action_id, current_action in current_actions.items():
                saved_action = saved_actions[action_id]
                current_frames = {item.id: item for item in current_action.frames}
                saved_frames = {item.id: item for item in saved_action.frames}
                if current_frames.keys() != saved_frames.keys():
                    return False
                for frame_id, current_frame in current_frames.items():
                    if current_frame.assets != saved_frames[frame_id].assets:
                        return False
        return True

    def publish(self, session: PreviewSession, request: PreviewSnapshotRequest,
                saved_project: CharacterProject) -> dict[str, Any]:
        project = request.project
        if project.id != session.project_id or saved_project.id != session.project_id:
            raise DomainError("预览项目不匹配")
        if not self._same_frame_topology(project, saved_project):
            raise DomainError("项目动作或帧结构已变化；请先保存后再预览")
        character = next((item for item in project.characters
                          if item.id == request.activeCharacterId), None)
        if character is None:
            raise DomainError("预览角色不存在")
        if character.canvas is None or character.origin is None or character.baseline is None:
            raise DomainError("角色尚未设置共享画布、原点和基准帧")
        action = next((item for item in character.actions
                       if item.id == request.activeActionId), None)
        if action is None:
            raise DomainError("预览动作不存在")
        enabled_frames = [frame for frame in action.frames if frame.enabled]
        if request.activeFrameId not in {frame.id for frame in enabled_frames}:
            raise DomainError("预览帧不存在或已禁用")

        actions = []
        asset_paths = {}
        for item in character.actions:
            frames = []
            for frame in item.frames:
                if not frame.enabled:
                    continue
                relative = frame.assets.current or frame.assets.mattingBase or frame.assets.source
                asset_paths[frame.id] = relative
                frames.append({
                    "id": frame.id, "revision": frame.revision,
                    "duration": frame.duration.model_dump() if frame.duration else None,
                })
            actions.append({
                "id": item.id, "name": item.name,
                "playback": item.playback.model_dump(),
                "loop": item.loop, "transform": item.transform.model_dump(),
                "anchor": item.anchor.model_dump() if item.anchor else None,
                "frames": frames,
                "events": [event.model_dump() for event in item.events],
            })
        session.revision += 1
        snapshot = {
            "type": "snapshot", "protocolVersion": PROTOCOL_VERSION,
            "messageId": uuid.uuid4().hex, "revision": session.revision,
            "projectId": project.id, "projectRevision": saved_project.revision,
            "characterId": character.id, "activeActionId": action.id,
            "activeFrameId": request.activeFrameId, "playing": request.playing,
            "character": {
                "canvas": character.canvas.model_dump(),
                "origin": character.origin.model_dump(),
                "scale": character.scale.model_dump(),
                "baseline": character.baseline.model_dump(),
            },
            "actions": actions,
        }
        session.snapshot = snapshot
        session.asset_paths = asset_paths
        return snapshot

    async def send_latest(self, session: PreviewSession) -> None:
        if session.websocket and session.snapshot:
            try:
                await session.websocket.send_json(session.snapshot)
            except (RuntimeError, OSError):
                session.websocket = None

    def acknowledge(self, session: PreviewSession, message: EngineMessage) -> None:
        if not session.snapshot:
            return
        if (message.revision == session.revision and
                message.messageId == session.snapshot["messageId"]):
            session.acknowledged_revision = max(session.acknowledged_revision, message.revision)

    async def connect(self, session: PreviewSession, websocket: WebSocket) -> None:
        if session.websocket is not None:
            raise DomainError("Godot 已连接此预览会话")
        session.websocket = websocket
        session.acknowledged_revision = 0

    def disconnect(self, session: PreviewSession, websocket: WebSocket) -> None:
        if session.websocket is websocket:
            session.websocket = None

"""R0 角色资产项目清单的运行时校验；不读写项目文件。"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, field_validator, model_validator
from PIL import Image


ID = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")]
NAME = Annotated[str, Field(min_length=1, max_length=80)]
REVISION = Annotated[StrictInt, Field(ge=0)]
FPS = Annotated[StrictInt, Field(ge=1, le=60)]
PATH = str


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


def safe_relative_path(value: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 1024:
        raise ValueError("相对路径必须是非空字符串且不超过1024字符")
    if ("\\" in value or ":" in value or value.startswith("/")
            or any(part in ("", ".", "..") for part in value.split("/"))
            or any(ord(char) < 32 or ord(char) == 127 for char in value)):
        raise ValueError("相对路径包含绝对路径或非法段")
    if value.startswith("generated/"):
        raise ValueError("生成目录不能作为编辑资产")
    return value


def unique_ids(items: list[StrictModel], label: str) -> None:
    ids = [item.id for item in items]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{label}ID重复")


class Rational(StrictModel):
    numerator: StrictInt
    denominator: Annotated[StrictInt, Field(gt=0)]

    @model_validator(mode="after")
    def reduced(self) -> Rational:
        if math.gcd(self.numerator, self.denominator) != 1:
            raise ValueError("有理数必须约分")
        return self


class Size(StrictModel):
    width: Annotated[StrictInt, Field(ge=1, le=8192)]
    height: Annotated[StrictInt, Field(ge=1, le=8192)]

    @model_validator(mode="after")
    def limited_area(self) -> Size:
        if self.width * self.height > 16_000_000:
            raise ValueError("画布面积超过1600万像素")
        return self


class Point(StrictModel):
    x: StrictInt
    y: StrictInt


class Scale(StrictModel):
    x: Annotated[float, Field(gt=0)]
    y: Annotated[float, Field(gt=0)]


class Playback(StrictModel):
    mode: Literal["constant-fps"]
    fps: FPS


class Transform(StrictModel):
    offset: Point
    scale: Scale
    rotationDegrees: float


class Extraction(StrictModel):
    startSeconds: Rational
    endSeconds: Rational
    fps: FPS

    @model_validator(mode="after")
    def valid_range(self) -> Extraction:
        if (self.startSeconds.numerator < 0 or
                self.startSeconds.numerator * self.endSeconds.denominator >=
                self.endSeconds.numerator * self.startSeconds.denominator):
            raise ValueError("抽帧时间范围无效")
        return self


class VideoSource(StrictModel):
    kind: Literal["video-extraction"]
    video: PATH | None
    sequenceId: ID
    extraction: Extraction

    @field_validator("video")
    @classmethod
    def video_path(cls, value: str | None) -> str | None:
        return safe_relative_path(value) if value is not None else None


class ImageSequenceSource(StrictModel):
    kind: Literal["image-sequence"]
    sequenceId: ID
    declaredFps: FPS


class FrameAssets(StrictModel):
    source: PATH
    mattingBase: PATH | None
    current: PATH | None

    @field_validator("source", "mattingBase", "current")
    @classmethod
    def asset_path(cls, value: str | None) -> str | None:
        return safe_relative_path(value) if value is not None else None


class FrameOrigin(StrictModel):
    sourceFrameId: str | None
    sourceFrameIndex: Annotated[StrictInt, Field(ge=0)] | None
    sourceTimeSeconds: Rational | None
    sourcePts: StrictInt | None
    sampleTimeSeconds: Rational | None = None
    sourceSampleDurationSeconds: Rational | None = None

    @field_validator("sourceFrameId")
    @classmethod
    def nonblank_source_id(cls, value: str | None) -> str | None:
        if value is not None and not value:
            raise ValueError("来源帧ID不能为空")
        return value


class ActionFrame(StrictModel):
    id: ID
    revision: REVISION
    enabled: StrictBool
    assets: FrameAssets
    source: FrameOrigin


class ActionEvent(StrictModel):
    id: ID
    frameId: ID
    type: ID
    parameters: dict

    @field_validator("parameters")
    @classmethod
    def limited_json(cls, value: dict) -> dict:
        if len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")) > 16 * 1024:
            raise ValueError("事件参数超过16KiB")
        return value


class Action(StrictModel):
    id: ID
    name: NAME
    revision: REVISION
    loop: StrictBool
    playback: Playback
    transform: Transform
    source: Annotated[VideoSource | ImageSequenceSource, Field(discriminator="kind")]
    frames: list[ActionFrame]
    events: list[ActionEvent]

    @model_validator(mode="after")
    def valid_references(self) -> Action:
        unique_ids(self.frames, "帧")
        unique_ids(self.events, "事件")
        enabled = {frame.id for frame in self.frames if frame.enabled}
        if any(event.frameId not in enabled for event in self.events):
            raise ValueError("事件必须引用同一动作中的启用帧")
        return self


class Character(StrictModel):
    id: ID
    name: NAME
    revision: REVISION
    referenceImage: PATH | None
    canvas: Size | None
    origin: Point | None
    scale: Scale
    actions: list[Action]

    @field_validator("referenceImage")
    @classmethod
    def reference_path(cls, value: str | None) -> str | None:
        return safe_relative_path(value) if value is not None else None

    @model_validator(mode="after")
    def valid_baseline(self) -> Character:
        unique_ids(self.actions, "动作")
        if (self.canvas is None) != (self.origin is None):
            raise ValueError("画布与原点必须同时填写或同时为空")
        if self.canvas is not None and self.origin is not None:
            if not (0 <= self.origin.x <= self.canvas.width and
                    0 <= self.origin.y <= self.canvas.height):
                raise ValueError("原点超出共享画布")
        for action in self.actions:
            prefix = f"assets/characters/{self.id}/actions/{action.id}/"
            paths = [path for frame in action.frames for path in
                     (frame.assets.source, frame.assets.mattingBase, frame.assets.current) if path]
            if action.source.kind == "video-extraction" and action.source.video:
                paths.append(action.source.video)
            if any(not path.startswith(prefix) for path in paths):
                raise ValueError("动作资产路径不属于当前角色与动作")
        if self.referenceImage and not self.referenceImage.startswith(
                f"assets/characters/{self.id}/reference/"):
            raise ValueError("参考图路径不属于当前角色")
        return self


class MigrationRecord(StrictModel):
    sourceFormatVersion: Literal[2, 3, 4]
    sourceSequenceId: ID
    sourceSha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    actionId: ID


class CharacterProject(StrictModel):
    formatVersion: Literal[1]
    kind: Literal["action-forge-project"]
    id: ID
    name: NAME
    revision: REVISION
    migrations: list[MigrationRecord] = Field(default_factory=list)
    characters: Annotated[list[Character], Field(min_length=1)]

    @model_validator(mode="after")
    def unique_project_ids(self) -> CharacterProject:
        unique_ids(self.characters, "角色")
        frames = [frame for character in self.characters for action in character.actions
                  for frame in action.frames]
        unique_ids(frames, "项目帧")
        sources = [(record.sourceSequenceId, record.sourceSha256) for record in self.migrations]
        if len(sources) != len(set(sources)):
            raise ValueError("迁移来源重复")
        action_ids = {action.id for character in self.characters for action in character.actions}
        if any(record.actionId not in action_ids for record in self.migrations):
            raise ValueError("迁移记录必须引用项目中的动作")
        return self


def validate_project_assets(project: CharacterProject, root: Path) -> None:
    """检查清单引用的实际资产；拒绝缺失、越根和坏图片。"""
    root = root.resolve(strict=True)
    for character in project.characters:
        paths: list[tuple[str, bool, bool]] = []
        if character.referenceImage:
            paths.append((character.referenceImage, True, False))
        for action in character.actions:
            if action.source.kind == "video-extraction" and action.source.video:
                paths.append((action.source.video, False, False))
            for frame in action.frames:
                paths.append((frame.assets.source, True, False))
                if frame.assets.mattingBase:
                    paths.append((frame.assets.mattingBase, True, True))
                if frame.assets.current:
                    paths.append((frame.assets.current, True, True))
        for relative, image_file, needs_alpha in paths:
            target = root / relative
            try:
                resolved = target.resolve(strict=True)
            except (OSError, RuntimeError) as exc:
                raise ValueError(f"项目素材缺失或不可访问：{relative}") from exc
            if not resolved.is_relative_to(root) or not resolved.is_file():
                raise ValueError(f"项目素材越界或不是文件：{relative}")
            if image_file:
                try:
                    with Image.open(resolved) as image:
                        image.verify()
                    with Image.open(resolved) as image:
                        if image.format != "PNG" or (needs_alpha and "A" not in image.getbands()):
                            raise ValueError(f"项目图片格式或透明通道无效：{relative}")
                except (OSError, ValueError) as exc:
                    raise ValueError(f"项目图片不可解码：{relative}") from exc

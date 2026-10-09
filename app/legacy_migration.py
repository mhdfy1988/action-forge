"""把已完成的旧单动作批次复制进可恢复角色项目。"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from typing import Callable

from pydantic import ValidationError

from .character_project_schema import Action, Character, CharacterProject, MigrationRecord
from .domain import DomainError
from .project_repository import ProjectRepository


@dataclass(frozen=True)
class MigrationSpec:
    project_id: str
    project_name: str
    character_id: str
    character_name: str
    action_id: str
    action_name: str
    fps: int


def _rational(value) -> dict | None:
    if value is None:
        return None
    try:
        number = Fraction(value)
    except (TypeError, ValueError, ZeroDivisionError) as exc:
        raise DomainError(f"旧来源时间无效：{value}") from exc
    return {"numerator": number.numerator, "denominator": number.denominator}


def _digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _asset_path(character_id: str, action_id: str, kind: str,
                index: int, digest: str) -> str:
    return (f"assets/characters/{character_id}/actions/{action_id}/{kind}/"
            f"frame_{index + 1:06d}.{digest[:16]}.png")


def _commit(repository: ProjectRepository, spec: MigrationSpec, action: Action,
            migration: MigrationRecord, assets: dict[str, Path]) -> dict:
    """把已映射动作原子写入新项目或现有项目。"""
    existing = None
    try:
        existing = repository.load(spec.project_id)
    except DomainError as exc:
        if str(exc) != "角色项目不存在":
            raise
    if existing is not None:
        for record in existing.migrations:
            if (record.sourceSequenceId == migration.sourceSequenceId and
                    record.sourceSha256 == migration.sourceSha256):
                return {"status": "already-imported", "project": existing,
                        "actionId": record.actionId}
        if any(record.sourceSequenceId == migration.sourceSequenceId
               for record in existing.migrations):
            raise DomainError("同一旧序列已有不同内容，拒绝覆盖")
        if len(existing.characters) != 1 or existing.characters[0].id != spec.character_id:
            raise DomainError("目标项目的角色与迁移目标不一致")
        if any(item.id == spec.action_id for item in existing.characters[0].actions):
            raise DomainError("目标动作ID已存在")
        draft = existing.model_copy(deep=True)
        draft.characters[0].actions.append(action)
        draft.migrations.append(migration)
        saved = repository.save(
            spec.project_id, existing.revision, draft, assets=assets,
            allow_migration_append=True,
        )
        return {"status": "added-action", "project": saved, "actionId": action.id}

    try:
        project = CharacterProject(
            formatVersion=1, kind="action-forge-project", id=spec.project_id,
            name=spec.project_name, revision=0, migrations=[migration],
            characters=[Character(
                id=spec.character_id, name=spec.character_name, revision=0,
                referenceImage=None, canvas=None, origin=None,
                scale={"x": 1, "y": 1}, actions=[action],
            )],
        )
    except ValidationError as exc:
        raise DomainError(f"项目或动作名称/ID无效：{exc}") from exc
    created = repository.create(project, assets=assets, preserve_frame_revisions=True)
    return {"status": "created", "project": created, "actionId": action.id}


def migrate_sequence(repository: ProjectRepository, sequence: dict, spec: MigrationSpec,
                     resolve_source: Callable[[str], Path]) -> dict:
    """迁移未抠图的抽帧 v2 或整理 v3；只登记源图，不伪造透明结果。"""
    version = sequence.get("formatVersion")
    if version not in {2, 3}:
        raise DomainError("源序列迁移只支持v2抽帧或v3整理结果")
    if not isinstance(spec.fps, int) or not 1 <= spec.fps <= 60:
        raise DomainError("动作帧率必须为1到60的整数")
    sequence_id = sequence.get("id")
    frames = sequence.get("frames")
    if not isinstance(sequence_id, str) or not isinstance(frames, list) or not frames:
        raise DomainError("不能迁移缺少身份或画面的源序列")

    assets: dict[str, Path] = {}
    frame_values = []
    fingerprint = hashlib.sha256(json.dumps(
        sequence, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8"))
    for index, frame in enumerate(frames):
        frame_id = frame.get("id")
        if not isinstance(frame_id, str) or not frame_id:
            raise DomainError("源序列存在无身份画面")
        source = resolve_source(frame_id)
        digest = _digest(source)
        fingerprint.update(frame_id.encode("utf-8"))
        fingerprint.update(bytes.fromhex(digest))
        relative = _asset_path(
            spec.character_id, spec.action_id, "source", index, digest,
        )
        assets[relative] = source
        frame_values.append({
            "id": frame_id, "revision": 0, "enabled": True,
            "assets": {"source": relative, "mattingBase": None, "current": None},
            "source": {
                "sourceFrameId": frame_id,
                "sourceFrameIndex": frame.get("sourceFrameIndex"),
                "sourceTimeSeconds": _rational(frame.get("sourceTimeSeconds")),
                "sourcePts": frame.get("sourcePts"),
                "sampleTimeSeconds": _rational(frame.get("sampleTimeSeconds")),
                "sourceSampleDurationSeconds": _rational(frame.get("durationSeconds")),
            },
        })

    extraction = (sequence.get("extraction") if version == 2
                  else sequence.get("originalExtraction")) or {}
    action_data = {
        "id": spec.action_id, "name": spec.action_name, "revision": 0,
        "loop": bool(sequence.get("loop", False)),
        "playback": {"mode": "constant-fps", "fps": spec.fps},
        "transform": {
            "offset": {"x": 0, "y": 0}, "scale": {"x": 1, "y": 1},
            "rotationDegrees": 0,
        },
        "source": {
            "kind": "video-extraction", "video": None, "sequenceId": sequence_id,
            "extraction": {
                "startSeconds": _rational(extraction.get("startSeconds")),
                "endSeconds": _rational(extraction.get("endSeconds")),
                "fps": extraction.get("fps"),
            },
        },
        "frames": frame_values, "events": [],
    }
    try:
        action = Action.model_validate(action_data)
        migration = MigrationRecord(
            sourceFormatVersion=version, sourceSequenceId=sequence_id,
            sourceSha256=fingerprint.hexdigest(), actionId=spec.action_id,
        )
    except (ValidationError, KeyError) as exc:
        raise DomainError(f"源序列不能映射为角色动作：{exc}") from exc
    return _commit(repository, spec, action, migration, assets)


def migrate_batch(repository: ProjectRepository, batch, spec: MigrationSpec,
                  resolve_frame: Callable[[str, str], Path]) -> dict:
    if batch.status != "done" or not batch.finished.is_set():
        raise DomainError("只能迁移完整完成的抠图结果")
    if batch.manifest.get("formatVersion") != 4 or batch.source_sequence.get("formatVersion") != 2:
        raise DomainError("迁移需要抠图v4结果及其原始抽帧v2清单")
    if not isinstance(spec.fps, int) or not 1 <= spec.fps <= 60:
        raise DomainError("动作帧率必须为1到60的整数")

    frames = batch.manifest.get("frames", [])
    if not frames:
        raise DomainError("不能迁移空动作")
    assets: dict[str, Path] = {}
    frame_values = []
    fingerprint = hashlib.sha256(json.dumps(
        {"source": batch.source_sequence, "order": [frame.get("id") for frame in frames]},
        ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8"))
    for index, frame in enumerate(frames):
        frame_id = frame.get("id")
        if frame_id not in batch.revisions:
            raise DomainError(f"旧批次缺少帧修订：{frame_id}")
        files = {kind: resolve_frame(frame_id, kind) for kind in ("source", "auto", "current")}
        digests = {kind: _digest(path) for kind, path in files.items()}
        for kind in ("source", "auto", "current"):
            fingerprint.update(kind.encode("ascii"))
            fingerprint.update(frame_id.encode("utf-8"))
            fingerprint.update(bytes.fromhex(digests[kind]))
        relative = {
            kind: _asset_path(spec.character_id, spec.action_id,
                              "matting" if kind == "auto" else kind, index, digests[kind])
            for kind in files
        }
        assets.update({relative[kind]: files[kind] for kind in files})
        frame_values.append({
            "id": frame_id, "revision": batch.revisions[frame_id], "enabled": True,
            "assets": {
                "source": relative["source"], "mattingBase": relative["auto"],
                "current": relative["current"],
            },
            "source": {
                "sourceFrameId": frame_id,
                "sourceFrameIndex": frame.get("sourceFrameIndex"),
                "sourceTimeSeconds": _rational(frame.get("sourceTimeSeconds")),
                "sourcePts": frame.get("sourcePts"),
                "sampleTimeSeconds": _rational(frame.get("sampleTimeSeconds")),
                "sourceSampleDurationSeconds": _rational(frame.get("durationSeconds")),
            },
        })
    source_hash = fingerprint.hexdigest()
    sequence = batch.source_sequence
    extraction = sequence.get("extraction") or {}
    action_data = {
        "id": spec.action_id, "name": spec.action_name, "revision": 0,
        "loop": bool(batch.manifest.get("loop", False)),
        "playback": {"mode": "constant-fps", "fps": spec.fps},
        "transform": {
            "offset": {"x": 0, "y": 0}, "scale": {"x": 1, "y": 1},
            "rotationDegrees": 0,
        },
        "source": {
            "kind": "video-extraction", "video": None, "sequenceId": sequence["id"],
            "extraction": {
                "startSeconds": _rational(extraction.get("startSeconds")),
                "endSeconds": _rational(extraction.get("endSeconds")),
                "fps": extraction.get("fps"),
            },
        },
        "frames": frame_values, "events": [],
    }
    try:
        action = Action.model_validate(action_data)
        migration = MigrationRecord(
            sourceFormatVersion=4, sourceSequenceId=sequence["id"],
            sourceSha256=source_hash, actionId=spec.action_id,
        )
    except (ValidationError, KeyError) as exc:
        raise DomainError(f"旧结果不能映射为角色动作：{exc}") from exc

    return _commit(repository, spec, action, migration, assets)

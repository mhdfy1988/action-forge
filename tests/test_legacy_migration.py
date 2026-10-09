import hashlib
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image

from app.domain import DomainError
from app.legacy_migration import MigrationSpec, migrate_batch, migrate_sequence
from app.project_repository import ProjectRepository


def make_batch(root: Path, sequence_id: str, color=(180, 40, 20)):
    root.mkdir(parents=True)
    frames = []
    files = {}
    for index in range(2):
        frame_id = f"{sequence_id}-{index + 1:06d}"
        frames.append({
            "id": frame_id, "sourceFrameIndex": index,
            "sourceTimeSeconds": f"{index}/12", "sourcePts": index * 1000,
            "sampleTimeSeconds": f"{index}/12", "durationSeconds": "1/12",
        })
        for kind, mode in (("source", "RGB"), ("auto", "RGBA"), ("current", "RGBA")):
            path = root / f"{kind}-{index}.png"
            Image.new(mode, (8, 8), color + ((255,) if mode == "RGBA" else ())).save(path)
            files[(frame_id, kind)] = path
    finished = threading.Event()
    finished.set()
    batch = SimpleNamespace(
        id="batch-1", status="done", finished=finished,
        source_sequence={
            "formatVersion": 2, "id": sequence_id, "name": "旧动作", "loop": False,
            "source": {"kind": "video", "name": "source.mp4"},
            "canvas": {"width": 8, "height": 8},
            "extraction": {"startSeconds": "0/1", "endSeconds": "1/6", "fps": 12},
            "frames": frames,
        },
        manifest={"formatVersion": 4, "loop": False, "frames": frames},
        revisions={frames[0]["id"]: 0, frames[1]["id"]: 2},
    )
    return batch, lambda frame_id, kind: files[(frame_id, kind)], files


def spec(action_id="run", action_name="跑步"):
    return MigrationSpec(
        project_id="hero-project", project_name="英雄动作",
        character_id="hero", character_name="英雄",
        action_id=action_id, action_name=action_name, fps=12,
    )


def test_create_add_second_action_restart_and_idempotence(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    first, resolve_first, first_files = make_batch(tmp_path / "first", "1" * 32)
    original_hashes = {key: hashlib.sha256(path.read_bytes()).hexdigest()
                       for key, path in first_files.items()}
    created = migrate_batch(repository, first, spec(), resolve_first)
    assert created["status"] == "created"
    assert created["project"].characters[0].canvas is None
    assert created["project"].characters[0].actions[0].frames[1].revision == 2
    again = migrate_batch(repository, first, spec(), resolve_first)
    assert again["status"] == "already-imported" and again["project"].revision == 0

    second, resolve_second, _ = make_batch(tmp_path / "second", "2" * 32, (30, 120, 210))
    added = migrate_batch(repository, second, spec("jump", "跳跃"), resolve_second)
    assert added["status"] == "added-action"
    reopened = ProjectRepository(repository.root).load("hero-project")
    assert [action.id for action in reopened.characters[0].actions] == ["run", "jump"]
    assert reopened.characters[0].actions[0].revision == 0
    assert reopened.characters[0].actions[1].revision == 0
    assert len(reopened.migrations) == 2
    assert original_hashes == {key: hashlib.sha256(path.read_bytes()).hexdigest()
                               for key, path in first_files.items()}


def test_same_sequence_changed_content_and_action_collision_fail(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    first, resolve_first, files = make_batch(tmp_path / "first", "1" * 32)
    migrate_batch(repository, first, spec(), resolve_first)
    Image.new("RGBA", (8, 8), (1, 2, 3, 255)).save(files[(f"{'1' * 32}-000001", "current")])
    with pytest.raises(DomainError, match="不同内容"):
        migrate_batch(repository, first, spec(), resolve_first)
    second, resolve_second, _ = make_batch(tmp_path / "second", "2" * 32)
    with pytest.raises(DomainError, match="动作ID已存在"):
        migrate_batch(repository, second, spec(), resolve_second)


def test_missing_asset_fails_without_creating_project(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    batch, resolve, files = make_batch(tmp_path / "first", "1" * 32)
    files[(f"{'1' * 32}-000001", "source")].unlink()
    with pytest.raises(FileNotFoundError):
        migrate_batch(repository, batch, spec(), resolve)
    assert repository.list() == []


@pytest.mark.parametrize("version", [2, 3])
def test_source_sequence_migration_keeps_unmatted_state(tmp_path, version):
    repository = ProjectRepository(tmp_path / f"projects-{version}")
    sequence_id = str(version) * 32
    frames = []
    files = {}
    for index in range(2):
        frame_id = f"{sequence_id}-{index + 1:06d}"
        path = tmp_path / f"v{version}-{index}.png"
        Image.new("RGB", (8, 8), (20 + index, 80, 160)).save(path)
        files[frame_id] = path
        frames.append({
            "id": frame_id, "image": f"frames/frame_{index + 1:06d}.png",
            "sourceFrameIndex": index, "sourceTimeSeconds": f"{index}/12",
            "sourcePts": index * 1000, "sampleTimeSeconds": f"{index}/12",
            "durationSeconds": "1/12",
        })
    extraction = {"startSeconds": "0/1", "endSeconds": "1/6", "fps": 12}
    sequence = {
        "formatVersion": version, "id": sequence_id, "name": "旧源序列",
        "loop": version == 3, "source": {"kind": "video", "name": "source.mp4"},
        "canvas": {"width": 8, "height": 8}, "frames": frames,
    }
    if version == 2:
        sequence["extraction"] = extraction
    else:
        sequence["originalExtraction"] = extraction
        sequence["derivation"] = {
            "kind": "manual-frame-organization", "parentSequenceId": "1" * 32,
            "parentFormatVersion": 2, "originalFrameCount": 2,
            "removedFrameIds": [], "durationPolicy": "retain-surviving-frame-durations",
        }
        sequence["durationSeconds"] = "1/6"
        sequence["durationMs"] = 1000 / 6

    result = migrate_sequence(repository, sequence, spec(), lambda frame_id: files[frame_id])
    assert result["status"] == "created"
    action = result["project"].characters[0].actions[0]
    assert action.loop is (version == 3)
    assert all(frame.assets.mattingBase is None and frame.assets.current is None
               for frame in action.frames)
    assert result["project"].migrations[0].sourceFormatVersion == version
    assert migrate_sequence(repository, sequence, spec(), lambda frame_id: files[frame_id])["status"] == "already-imported"

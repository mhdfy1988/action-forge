import json

import pytest
from filelock import FileLock

from app.character_project_schema import CharacterProject
from app.domain import DomainError
from app.project_repository import ProjectRepository


def project_data():
    return {
        "formatVersion": 1, "kind": "action-forge-project",
        "id": "hero-project", "name": "英雄动作", "revision": 99,
        "characters": [{
            "id": "hero", "name": "英雄", "revision": 99,
            "referenceImage": None, "canvas": None, "origin": None,
            "scale": {"x": 1, "y": 1},
            "actions": [action("run", "跑步", 12, True), action("jump", "跳跃", 8, False)],
        }],
    }


def action(action_id, name, fps, loop):
    return {
        "id": action_id, "name": name, "revision": 99, "loop": loop,
        "playback": {"mode": "constant-fps", "fps": fps},
        "transform": {
            "offset": {"x": 0, "y": 0}, "scale": {"x": 1, "y": 1},
            "rotationDegrees": 0,
        },
        "source": {"kind": "image-sequence", "sequenceId": action_id, "declaredFps": fps},
        "frames": [], "events": [],
    }


def test_create_restart_load_and_independent_action_revisions(tmp_path):
    root = tmp_path / "projects"
    repository = ProjectRepository(root)
    created = repository.create(CharacterProject.model_validate(project_data()))
    assert created.revision == 0
    assert [item.revision for item in created.characters[0].actions] == [0, 0]

    # 模拟服务重启：新仓库实例必须只靠磁盘恢复。
    reopened = ProjectRepository(root).load("hero-project")
    assert [item.id for item in reopened.characters[0].actions] == ["run", "jump"]
    draft = reopened.model_copy(deep=True)
    draft.characters[0].actions[1].playback.fps = 10
    saved = ProjectRepository(root).save("hero-project", 0, draft)
    assert saved.revision == 1 and saved.characters[0].revision == 1
    assert saved.characters[0].actions[0].revision == 0
    assert saved.characters[0].actions[1].revision == 1
    assert ProjectRepository(root).load("hero-project") == saved


def test_noop_save_and_stale_revision_do_not_write(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    created = repository.create(CharacterProject.model_validate(project_data()))
    manifest = repository.root / created.id / "project.json"
    before = manifest.read_bytes()
    assert repository.save(created.id, 0, created).revision == 0
    assert manifest.read_bytes() == before
    draft = created.model_copy(deep=True)
    draft.name = "改名"
    repository.save(created.id, 0, draft)
    with pytest.raises(DomainError, match="修订冲突"):
        repository.save(created.id, 0, draft)


def test_replace_failure_keeps_old_manifest(tmp_path, monkeypatch):
    repository = ProjectRepository(tmp_path / "projects")
    created = repository.create(CharacterProject.model_validate(project_data()))
    draft = created.model_copy(deep=True)
    draft.name = "不能落盘的名字"
    manifest = repository.root / created.id / "project.json"
    before = manifest.read_bytes()

    def fail_replace(source, target):
        raise PermissionError("simulated locked manifest")

    monkeypatch.setattr("app.project_repository.os.replace", fail_replace)
    with pytest.raises(PermissionError, match="simulated"):
        repository.save(created.id, 0, draft)
    assert manifest.read_bytes() == before
    assert not list(manifest.parent.glob("project.json.*.new"))


def test_interprocess_lock_conflict_is_explicit(tmp_path):
    repository = ProjectRepository(tmp_path / "projects", lock_timeout=0.01)
    created = repository.create(CharacterProject.model_validate(project_data()))
    held = FileLock(repository.locks / f"{created.id}.lock")
    held.acquire()
    try:
        with pytest.raises(DomainError, match="其他进程"):
            repository.save(created.id, 0, created)
    finally:
        held.release()


def test_invalid_existing_manifest_is_listed_but_not_loaded(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    bad = repository.root / "broken"
    bad.mkdir()
    (bad / "project.json").write_text("{}", encoding="utf-8")
    assert repository.list() == [{"id": "broken", "status": "invalid"}]
    with pytest.raises(DomainError, match="清单无效"):
        repository.load("broken")


def test_create_missing_asset_is_explicit_and_leaves_no_project(tmp_path):
    repository = ProjectRepository(tmp_path / "projects")
    data = project_data()
    data["characters"][0]["referenceImage"] = "assets/characters/hero/reference/missing.png"
    with pytest.raises(DomainError, match="素材缺失"):
        repository.create(CharacterProject.model_validate(data))
    assert not (repository.root / "hero-project").exists()

from fastapi.testclient import TestClient
from pathlib import Path
from types import SimpleNamespace
import hashlib
import io
import json
import threading
import time
import zipfile

from PIL import Image

from app.main import create_app


def test_project_page_create_two_actions_save_and_reopen(tmp_path):
    cache = tmp_path / "cache"
    projects = tmp_path / "projects"
    with TestClient(create_app(cache, projects=projects)) as client:
        assert client.get("/").status_code == 200
        page = client.get("/projects")
        assert page.status_code == 200 and "角色项目" in page.text
        created = client.post("/api/character-projects", json={
            "id": "hero-project", "name": "英雄动作",
            "characterId": "hero", "characterName": "英雄",
        })
        assert created.status_code == 200, created.text
        project = created.json()
        assert project["formatVersion"] == 2
        project["characters"][0]["actions"] = [
            action("run", "跑步", 12, True),
            action("jump", "跳跃", 8, False),
        ]
        saved = client.put("/api/character-projects/hero-project", json={
            "expectedRevision": 0, "project": project,
        })
        assert saved.status_code == 200, saved.text
        assert saved.json()["revision"] == 1
        assert [item["id"] for item in saved.json()["characters"][0]["actions"]] == ["run", "jump"]
        stale = client.put("/api/character-projects/hero-project", json={
            "expectedRevision": 0, "project": project,
        })
        assert stale.status_code == 400 and "修订冲突" in stale.json()["detail"]
    # 新应用实例只靠项目目录回读。
    with TestClient(create_app(tmp_path / "cache-2", projects=projects)) as client:
        listed = client.get("/api/character-projects").json()["projects"]
        assert listed == [{
            "id": "hero-project", "name": "英雄动作", "revision": 1,
            "characterCount": 1, "actionCount": 2, "status": "ready",
        }]
        reopened = client.get("/api/character-projects/hero-project").json()
        assert reopened["formatVersion"] == 2
        assert [(item["id"], item["playback"]["fps"], item["loop"])
                for item in reopened["characters"][0]["actions"]] == [
                    ("run", 12, True), ("jump", 8, False)
                ]


def test_project_delete_requires_current_revision(tmp_path):
    with TestClient(create_app(tmp_path / "cache", projects=tmp_path / "projects")) as client:
        created = client.post("/api/character-projects", json={
            "id": "delete-me", "name": "待删除项目",
            "characterId": "hero", "characterName": "英雄",
        }).json()
        stale = client.request("DELETE", "/api/character-projects/delete-me", json={
            "expectedRevision": created["revision"] + 1,
        })
        assert stale.status_code == 400 and "修订冲突" in stale.json()["detail"]
        deleted = client.request("DELETE", "/api/character-projects/delete-me", json={
            "expectedRevision": created["revision"],
        })
        assert deleted.status_code == 200 and deleted.json()["id"] == "delete-me"
        assert client.get("/api/character-projects/delete-me").status_code == 400


def test_completed_legacy_batch_migrates_through_api_and_serves_frame(tmp_path):
    projects_root = tmp_path / "projects"
    with TestClient(create_app(tmp_path / "cache", projects=projects_root)) as client:
        token = "b" * 32
        frame_id = f"{'a' * 32}-000001"
        directory = tmp_path / "cache" / f"batch-{token}"
        for folder in (directory / "result" / "auto", directory / "result" / "current"):
            folder.mkdir(parents=True, exist_ok=True)
            Image.new("RGBA", (8, 8), (120, 30, 20, 255)).save(folder / "frame_000001.png")
        source = tmp_path / "source.png"
        Image.new("RGB", (8, 8), (20, 180, 30)).save(source)
        finished = threading.Event();finished.set()
        sequence = {
            "formatVersion": 2, "id": "a" * 32, "name": "跑步", "loop": True,
            "source": {"kind": "video", "name": "run.mp4"},
            "canvas": {"width": 8, "height": 8},
            "extraction": {"startSeconds": "0/1", "endSeconds": "1/12", "fps": 12},
            "frames": [{
                "id": frame_id, "image": "frames/frame_000001.png",
                "sourceFrameIndex": 0, "sourceTimeSeconds": "0/1", "sourcePts": 0,
                "sampleTimeSeconds": "0/1", "durationSeconds": "1/12",
            }],
        }
        batch = SimpleNamespace(
            id=token, job_id="j" * 32, directory=directory,
            source_sequence=sequence,
            manifest={"formatVersion": 4, "loop": True, "frames": sequence["frames"]},
            source_paths=[source], status="done", finished=finished,
            revisions={frame_id: 1}, touched=time.monotonic(),
        )
        client.app.state.store.batches.items[token] = batch
        response = client.post(f"/api/matting-batches/{token}/migrate", json={
            "projectId": "hero-project", "projectName": "英雄动作",
            "characterId": "hero", "characterName": "英雄",
            "actionId": "run", "actionName": "跑步", "fps": 12,
        })
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "created"
        project = client.get("/api/character-projects/hero-project").json()
        assert project["characters"][0]["actions"][0]["frames"][0]["revision"] == 1
        frame = client.get(f"/api/character-projects/hero-project/frames/{frame_id}")
        assert frame.status_code == 200 and frame.headers["content-type"] == "image/png"

        action = project["characters"][0]["actions"][0]
        action["playback"] = {"mode": "per-frame"}
        action["frames"][0]["duration"] = {"numerator": 1, "denominator": 12}
        action["events"] = [{
            "id": "event-footstep", "frameId": frame_id,
            "type": "footstep", "parameters": {"foot": "left"},
        }]
        saved = client.put("/api/character-projects/hero-project", json={
            "expectedRevision": 0, "project": project,
        })
        assert saved.status_code == 200, saved.text
        assert saved.json()["characters"][0]["actions"][0]["events"][0]["frameId"] == frame_id
        manifest_before = (projects_root / "hero-project" / "project.json").read_bytes()
        exported = client.get("/api/character-projects/hero-project/export")
        assert exported.status_code == 200
        assert exported.headers["content-type"] == "application/zip"
        exported_frame_assets = project["characters"][0]["actions"][0]["frames"][0]["assets"]
        with zipfile.ZipFile(io.BytesIO(exported.content)) as archive:
            assert archive.testzip() is None
            expected_assets = {path for path in exported_frame_assets.values() if path}
            assert set(archive.namelist()) == {"project.json", *expected_assets}
            exported_project = json.loads(archive.read("project.json"))
            exported_action = exported_project["characters"][0]["actions"][0]
            assert exported_project["formatVersion"] == 2
            assert exported_action["playback"] == {"mode": "per-frame"}
            assert exported_action["frames"][0]["duration"] == {"numerator": 1, "denominator": 12}
            assert exported_action["events"][0]["type"] == "footstep"
        assert (projects_root / "hero-project" / "project.json").read_bytes() == manifest_before


def test_character_calibration_saves_and_reopens_without_touching_source_frames(tmp_path):
    projects_root = tmp_path / "projects"
    app = create_app(tmp_path / "cache", projects=projects_root)
    with TestClient(app) as client:
        created = client.post("/api/character-projects", json={
            "id": "calibration-project", "name": "校准验收",
            "characterId": "hero", "characterName": "英雄",
        })
        assert created.status_code == 200, created.text
        project = created.json()
        character = project["characters"][0]
        source_hashes = []
        for action_id, name, frame_id in (("run", "跑步", "run-frame"),
                                          ("jump", "跳跃", "jump-frame")):
            relative = f"assets/characters/hero/actions/{action_id}/source/frame.png"
            target = projects_root / "calibration-project" / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            Image.new("RGBA", (64, 96), (80, 100, 120, 255)).save(target)
            source_hashes.append(hashlib.sha256(target.read_bytes()).digest())
            item = action(action_id, name, 12, action_id == "run")
            item["frames"] = [{
                "id": frame_id, "revision": 0, "enabled": True,
                "assets": {"source": relative, "mattingBase": None, "current": None},
                "source": {"sourceFrameId": None, "sourceFrameIndex": 0,
                           "sourceTimeSeconds": None, "sourcePts": None},
            }]
            character["actions"].append(item)
        character.update({"canvas": {"width": 128, "height": 128},
                          "origin": {"x": 64, "y": 110},
                          "baseline": {"actionId": "run", "frameId": "run-frame"}})
        character["actions"][0]["anchor"] = {"frameId": "run-frame", "x": 0.5, "y": 0.9}
        character["actions"][1]["anchor"] = {"frameId": "jump-frame", "x": 0.5, "y": 0.88}
        character["actions"][1]["transform"]["scale"] = {"x": 1.15, "y": 1.15}
        character["actions"][1]["transform"]["offset"] = {"x": 3, "y": -4}
        saved = client.put("/api/character-projects/calibration-project", json={
            "expectedRevision": 0, "project": project,
        })
        assert saved.status_code == 200, saved.text
        assert [item["revision"] for item in saved.json()["characters"][0]["actions"]] == [0, 0]
        assert [hashlib.sha256((projects_root / "calibration-project" / item).read_bytes()).digest()
                for item in ("assets/characters/hero/actions/run/source/frame.png",
                             "assets/characters/hero/actions/jump/source/frame.png")] == source_hashes

    with TestClient(create_app(tmp_path / "cache-reopen", projects=projects_root)) as client:
        restored = client.get("/api/character-projects/calibration-project").json()
        character = restored["characters"][0]
        assert character["canvas"] == {"width": 128, "height": 128}
        assert character["origin"] == {"x": 64, "y": 110}
        assert character["baseline"] == {"actionId": "run", "frameId": "run-frame"}
        jump = character["actions"][1]
        assert jump["anchor"] == {"frameId": "jump-frame", "x": 0.5, "y": 0.88}
        assert jump["transform"]["scale"] == {"x": 1.15, "y": 1.15}
        assert jump["transform"]["offset"] == {"x": 3, "y": -4}


def test_v2_and_v3_source_migration_endpoints_keep_source_only(tmp_path):
    with TestClient(create_app(tmp_path / "cache", projects=tmp_path / "projects")) as client:
        job_id = "c" * 32
        frame_id = f"{'d' * 32}-000001"
        directory = tmp_path / "cache" / f"job-{job_id}"
        source_path = directory / "result" / "frames" / "frame_000001.png"
        source_path.parent.mkdir(parents=True)
        Image.new("RGB", (8, 8), (20, 80, 160)).save(source_path)
        finished = threading.Event();finished.set()
        sequence = {
            "formatVersion": 2, "id": "d" * 32, "name": "源动作", "loop": False,
            "source": {"kind": "video", "name": "source.mp4"},
            "canvas": {"width": 8, "height": 8},
            "extraction": {"startSeconds": "0/1", "endSeconds": "1/12", "fps": 12},
            "frames": [{
                "id": frame_id, "image": "frames/frame_000001.png",
                "sourceFrameIndex": 0, "sourceTimeSeconds": "0/1", "sourcePts": 0,
                "sampleTimeSeconds": "0/1", "durationSeconds": "1/12",
            }],
        }
        job = SimpleNamespace(
            id=job_id, video_id="e" * 32, directory=directory, request={},
            status="done", stage="完成", progress=100, error=None, result=sequence,
            finished=finished, cancel=threading.Event(), touched=time.monotonic(),
        )
        client.app.state.store.jobs[job_id] = job
        payload = {
            "projectId": "source-project", "projectName": "源项目",
            "characterId": "hero", "characterName": "英雄",
            "actionId": "run", "actionName": "跑步", "fps": 12,
        }
        v2 = client.post(f"/api/jobs/{job_id}/migrate", json=payload)
        assert v2.status_code == 200, v2.text
        assets = v2.json()["project"]["characters"][0]["actions"][0]["frames"][0]["assets"]
        assert assets["source"].endswith(".png")
        assert assets["mattingBase"] is None and assets["current"] is None

        session_id = "f" * 32
        client.app.state.store.edit_sessions[session_id] = {
            "jobId": job_id, "touched": time.monotonic(),
        }
        payload.update({
            "projectId": "organized-project", "projectName": "整理项目",
            "actionId": "jump", "actionName": "跳跃", "frameIds": [frame_id],
        })
        v3 = client.post(f"/api/edit-sessions/{session_id}/migrate", json=payload)
        assert v3.status_code == 200, v3.text
        assert v3.json()["project"]["migrations"][0]["sourceFormatVersion"] == 3


def action(action_id, name, fps, loop):
    return {
        "id": action_id, "name": name, "revision": 0, "loop": loop,
        "playback": {"mode": "constant-fps", "fps": fps},
        "transform": {
            "offset": {"x": 0, "y": 0}, "scale": {"x": 1, "y": 1},
            "rotationDegrees": 0,
        },
        "source": {
            "kind": "image-sequence", "sequenceId": action_id,
            "declaredFps": fps,
        },
        "frames": [], "events": [],
    }

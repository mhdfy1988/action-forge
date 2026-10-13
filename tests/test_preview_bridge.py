import hashlib

from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app


def test_preview_session_publishes_memory_snapshot_and_protects_frame_access(tmp_path):
    projects = tmp_path / "projects"
    app = create_app(tmp_path / "cache", projects=projects)
    with TestClient(app) as client:
        project = _ready_project(client, projects)
        manifest_before = (projects / "hero-project" / "project.json").read_bytes()
        created = client.post("/api/character-projects/hero-project/preview-sessions")
        assert created.status_code == 200, created.text
        session = created.json()
        assert session["protocolVersion"] == 2
        assert session["websocketUrl"].endswith(
            f"/api/preview-sessions/{session['sessionId']}/socket")
        headers = {"Authorization": f"Bearer {session['token']}"}

        changed = {**project}
        changed["characters"] = [dict(project["characters"][0])]
        changed["characters"][0]["actions"] = [
            dict(item) for item in project["characters"][0]["actions"]
        ]
        changed["characters"][0]["actions"][1]["transform"] = {
            "offset": {"x": 9, "y": -4},
            "scale": {"x": 1.2, "y": 1.2}, "rotationDegrees": 0,
        }
        changed["characters"][0]["actions"][1]["playback"] = {"mode": "per-frame"}
        changed["characters"][0]["actions"][1]["frames"][0]["duration"] = {
            "numerator": 1, "denominator": 8,
        }
        changed["characters"][0]["actions"][1]["events"] = [{
            "id": "event-landing", "frameId": "jump-frame", "type": "land",
            "parameters": {"surface": "ground"},
        }]
        body = {
            "project": changed, "activeCharacterId": "hero",
            "activeActionId": "jump", "activeFrameId": "jump-frame",
            "playing": False,
        }
        unauthorized = client.put(
            f"/api/preview-sessions/{session['sessionId']}/snapshot", json=body,
            headers={"Authorization": "Bearer wrong"},
        )
        assert unauthorized.status_code == 400

        with client.websocket_connect(
                f"/api/preview-sessions/{session['sessionId']}/socket",
                headers=headers) as socket:
            ready = socket.receive_json()
            assert ready["type"] == "session-ready"
            published = client.put(
                f"/api/preview-sessions/{session['sessionId']}/snapshot",
                json=body, headers=headers,
            )
            assert published.status_code == 200, published.text
            outgoing = socket.receive_json()
            assert outgoing["type"] == "snapshot"
            assert outgoing["activeActionId"] == "jump"
            assert outgoing["revision"] == 1
            assert outgoing["actions"][1]["transform"]["offset"] == {"x": 9, "y": -4}
            assert outgoing["actions"][1]["playback"] == {"mode": "per-frame"}
            assert outgoing["actions"][1]["frames"][0]["duration"] == {
                "numerator": 1, "denominator": 8,
            }
            assert outgoing["actions"][1]["events"] == [{
                "id": "event-landing", "frameId": "jump-frame", "type": "land",
                "parameters": {"surface": "ground"},
            }]
            assert published.json() == {"revision": 1, "status": "sent"}
            socket.send_json({
                "type": "ack", "protocolVersion": 2,
                "messageId": outgoing["messageId"], "revision": 1,
            })

        frame = client.get(
            f"/api/preview-sessions/{session['sessionId']}/frames/jump-frame",
            headers=headers,
        )
        assert frame.status_code == 200 and frame.headers["content-type"] == "image/png"
        assert hashlib.sha256(frame.content).digest() == hashlib.sha256(
            (projects / "hero-project" / "assets/characters/hero/actions/jump/source/frame.png").read_bytes()
        ).digest()
        status = client.get(f"/api/preview-sessions/{session['sessionId']}", headers=headers)
        assert status.status_code == 200
        assert status.json()["status"] == "synced"
        assert status.json()["acknowledgedRevision"] == 1
        denied_frame = client.get(
            f"/api/preview-sessions/{session['sessionId']}/frames/unknown",
            headers=headers,
        )
        assert denied_frame.status_code == 400
        assert (projects / "hero-project" / "project.json").read_bytes() == manifest_before
        restored = client.get("/api/character-projects/hero-project").json()
        assert restored["characters"][0]["actions"][1]["transform"]["offset"] == {"x": 0, "y": 0}


def test_preview_rejects_unpersisted_frame_topology_and_missing_auth(tmp_path):
    projects = tmp_path / "projects"
    app = create_app(tmp_path / "cache", projects=projects)
    with TestClient(app) as client:
        project = _ready_project(client, projects)
        session = client.post(
            "/api/character-projects/hero-project/preview-sessions").json()
        headers = {"Authorization": f"Bearer {session['token']}"}
        changed = {**project}
        changed["characters"] = [dict(project["characters"][0])]
        changed["characters"][0]["actions"] = [dict(item) for item in project["characters"][0]["actions"]]
        changed["characters"][0]["actions"][0]["frames"][0]["id"] = "run-frame-new"
        changed["characters"][0]["actions"][0]["anchor"]["frameId"] = "run-frame-new"
        changed["characters"][0]["baseline"]["frameId"] = "run-frame-new"
        response = client.put(
            f"/api/preview-sessions/{session['sessionId']}/snapshot",
            json={"project": changed, "activeCharacterId": "hero",
                  "activeActionId": "run", "activeFrameId": "run-frame-new", "playing": False},
            headers=headers,
        )
        assert response.status_code == 400 and "先保存" in response.json()["detail"]
        denied = client.get(
            f"/api/preview-sessions/{session['sessionId']}/frames/run-frame")
        assert denied.status_code == 400


def _ready_project(client, projects):
    created = client.post("/api/character-projects", json={
        "id": "hero-project", "name": "英雄动作",
        "characterId": "hero", "characterName": "英雄",
    })
    assert created.status_code == 200, created.text
    project = created.json()
    character = project["characters"][0]
    for action_id, name, frame_id, fps, loop in (
            ("run", "跑步", "run-frame", 12, True),
            ("jump", "跳跃", "jump-frame", 8, False)):
        relative = f"assets/characters/hero/actions/{action_id}/source/frame.png"
        path = projects / "hero-project" / relative
        path.parent.mkdir(parents=True)
        Image.new("RGBA", (16, 24), (220, 80, 30, 255)).save(path)
        character["actions"].append({
            "id": action_id, "name": name, "revision": 0, "loop": loop,
            "playback": {"mode": "constant-fps", "fps": fps},
            "transform": {
                "offset": {"x": 0, "y": 0}, "scale": {"x": 1.0, "y": 1.0},
                "rotationDegrees": 0.0,
            },
            "anchor": {"frameId": frame_id, "x": 0.5, "y": 0.9},
            "source": {"kind": "image-sequence", "sequenceId": action_id,
                       "declaredFps": fps},
            "frames": [{
                "id": frame_id, "revision": 0, "enabled": True,
                "assets": {"source": relative, "mattingBase": None, "current": None},
                "source": {"sourceFrameId": None, "sourceFrameIndex": 0,
                           "sourceTimeSeconds": None, "sourcePts": None},
            }],
            "events": [],
        })
    character.update({
        "canvas": {"width": 128, "height": 128}, "origin": {"x": 64, "y": 112},
        "baseline": {"actionId": "run", "frameId": "run-frame"},
    })
    response = client.put("/api/character-projects/hero-project", json={
        "expectedRevision": 0, "project": project,
    })
    assert response.status_code == 200, response.text
    return response.json()

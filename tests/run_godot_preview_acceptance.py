"""在隔离测试服务运行真实 Godot 原生预览客户端的纵向验收。"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def request_json(base: str, path: str, *, method="GET", payload=None, token=None):
    headers = {"Accept": "application/json"}
    body = None
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(base + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path}: HTTP {exc.code}: {detail}") from exc


def wait_for_status(base: str, session_id: str, token: str, revision: int,
                    expected: str, timeout=12):
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = request_json(base, f"/api/preview-sessions/{session_id}", token=token)
        if last["revision"] >= revision and last["status"] == expected and (
                expected != "synced" or last["acknowledgedRevision"] == revision):
            return last
        time.sleep(0.1)
    raise TimeoutError(f"等待预览状态 {expected}/r{revision} 超时，最后状态：{last}")


def wait_for_event(log_file: Path, marker: str, timeout=8):
    deadline = time.monotonic() + timeout
    log = ""
    while time.monotonic() < deadline:
        log = log_file.read_text(encoding="utf-8", errors="replace") if log_file.exists() else ""
        if marker in log:
            return
        time.sleep(0.1)
    raise TimeoutError(f"Godot未记录事件 {marker}；日志：\n{log}")


def run_godot(engine: Path, project: Path, url: str, token: str, *, exit_revision: int, log_file: Path):
    args = [
        str(engine), "--headless", "--path", str(project),
        "--log-file", str(log_file), "--",
        f"--preview-url={url}", f"--preview-token={token}",
        f"--preview-exit-after-revision={exit_revision}",
        "--preview-acceptance-mode",
    ]
    # Godot 的 Windows console 启动器会把标准输出重定向误判为已有实例转发；
    # 使用同版本 GUI 可执行文件的 headless 模式，并让它继承测试进程输出句柄。
    return subprocess.Popen(args)


def stop_godot(process):
    if process.poll() is not None:
        return
    subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                   capture_output=True, check=False)
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8898")
    parser.add_argument("--godot", required=True, type=Path)
    options = parser.parse_args()
    if not options.godot.is_file():
        raise FileNotFoundError(options.godot)
    project_id = "godot-preview-" + uuid.uuid4().hex[:12]

    request_json(options.base, "/__test/seed-r2-character-project", method="POST",
                 payload={"projectId": project_id})
    project = request_json(options.base, f"/api/character-projects/{project_id}")
    character = project["characters"][0]
    character["canvas"] = {"width": 512, "height": 512}
    character["origin"] = {"x": 256, "y": 460}
    character["baseline"] = {"actionId": "run", "frameId": "run-frame"}
    character["actions"][0]["anchor"] = {"frameId": "run-frame", "x": 0.5, "y": 0.9}
    character["actions"][1]["anchor"] = {"frameId": "jump-frame", "x": 0.5, "y": 0.9}
    project = request_json(options.base, f"/api/character-projects/{project_id}",
                           method="PUT", payload={"expectedRevision": 0, "project": project})
    manifest_path = ROOT / "output" / "r4-e2e" / "projects" / project_id / "project.json"
    manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()

    session = request_json(options.base, f"/api/character-projects/{project_id}/preview-sessions",
                           method="POST")
    session_id, token = session["sessionId"], session["token"]
    headers_path = f"/api/preview-sessions/{session_id}/snapshot"
    engine = options.godot.with_name(options.godot.name.replace("_console.exe", ".exe"))
    if not engine.is_file():
        raise FileNotFoundError(engine)
    client = run_godot(engine, ROOT / "integrations" / "godot-preview",
                       session["websocketUrl"], token, exit_revision=2,
                       log_file=ROOT / "output" / "r4-e2e" / "godot-run.log")
    try:
        try:
            wait_for_status(options.base, session_id, token, 0, "waiting-snapshot")
        except TimeoutError as exc:
            log = (ROOT / "output" / "r4-e2e" / "godot-run.log").read_text(encoding="utf-8", errors="replace")
            raise TimeoutError(f"{exc}\nGodot 退出码：{client.poll()}，日志：\n{log}") from exc

        snapshot = {
            "project": project, "activeCharacterId": "hero", "activeActionId": "run",
            "activeFrameId": "run-frame", "playing": True,
        }
        run_action = next(item for item in project["characters"][0]["actions"] if item["id"] == "run")
        run_action["playback"] = {"mode": "per-frame"}
        run_action["frames"][0]["duration"] = {"numerator": 1, "denominator": 12}
        run_action["events"] = [{"id": "event-footstep", "frameId": "run-frame",
                                 "type": "footstep", "parameters": {"foot": "left"}}]
        run_result = request_json(options.base, headers_path, method="PUT", payload=snapshot, token=token)
        if run_result["revision"] != 1:
            raise AssertionError(f"跑步快照修订错误：{run_result}")
        try:
            wait_for_status(options.base, session_id, token, 1, "synced")
        except TimeoutError as exc:
            log = (ROOT / "output" / "r4-e2e" / "godot-run.log").read_text(encoding="utf-8", errors="replace")
            raise TimeoutError(f"{exc}\nGodot 退出码：{client.poll()}，日志：\n{log}") from exc
        wait_for_event(ROOT / "output" / "r4-e2e" / "godot-run.log",
                       "ACTION_FORGE_EVENT|run|run-frame|footstep")

        preview_only_project = json.loads(json.dumps(project))
        jump = next(item for item in preview_only_project["characters"][0]["actions"]
                    if item["id"] == "jump")
        jump["transform"]["offset"] = {"x": 14, "y": -6}
        jump["transform"]["scale"] = {"x": 1.15, "y": 1.15}
        jump["playback"] = {"mode": "per-frame"}
        for frame in jump["frames"]:
            frame["duration"] = {"numerator": 1, "denominator": 8}
        jump["events"] = [{"id": "event-landing", "frameId": "jump-frame",
                           "type": "land", "parameters": {"surface": "ground"}}]
        update = {
            "project": preview_only_project, "activeCharacterId": "hero",
            "activeActionId": "jump", "activeFrameId": "jump-frame", "playing": True,
        }
        result = request_json(options.base, headers_path, method="PUT", payload=update, token=token)
        if result["revision"] != 2:
            raise AssertionError(f"跳跃快照修订错误：{result}")
        wait_for_status(options.base, session_id, token, 2, "synced")
        wait_for_event(ROOT / "output" / "r4-e2e" / "godot-run.log",
                       "ACTION_FORGE_EVENT|jump|jump-frame|land")
        client.wait(timeout=15)
    finally:
        stop_godot(client)
    if client.returncode != 0:
        raise RuntimeError(f"Godot 退出码 {client.returncode}")

    # 客户端退出后以相同的短期凭据重连，服务端必须补发当前最新完整快照。
    reconnected = run_godot(engine, ROOT / "integrations" / "godot-preview",
                            session["websocketUrl"], token, exit_revision=1,
                            log_file=ROOT / "output" / "r4-e2e" / "godot-reconnect.log")
    try:
        wait_for_status(options.base, session_id, token, 2, "synced")
        reconnected.wait(timeout=15)
    finally:
        stop_godot(reconnected)
    if reconnected.returncode != 0:
        raise AssertionError(f"Godot 重连退出码：{reconnected.returncode}")

    if hashlib.sha256(manifest_path.read_bytes()).hexdigest() != manifest_hash:
        raise AssertionError("Godot 预览意外修改了角色项目清单")
    restored = request_json(options.base, f"/api/character-projects/{project_id}")
    restored_jump = next(item for item in restored["characters"][0]["actions"]
                         if item["id"] == "jump")
    if restored_jump["transform"]["offset"] != {"x": 0, "y": 0}:
        raise AssertionError("预览编辑态变换被写回角色项目")
    print("Godot 4.x R4 acceptance passed: run/jump, per-frame duration, events, transform, PNG load, reconnect, read-only project.")
    print(f"Project={project_id}; Godot={options.godot}")


if __name__ == "__main__":
    main()

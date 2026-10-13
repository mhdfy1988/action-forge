"""仅本机HTTP入口：限制上传、隔离路径、禁止跨站调用。"""
import hashlib
import ipaddress
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from .config import CACHE, LIMITS, PROJECTS, ROOT, Limits
from .domain import DomainError, ExtractionRequest
from .character_project_schema import CharacterProject, Character
from .project_repository import ProjectRepository
from .preview_bridge import PROTOCOL_VERSION, EngineMessage, PreviewBridge, PreviewSnapshotRequest
from .legacy_migration import MigrationSpec, migrate_batch, migrate_sequence
from .media import binary
from .service import Store
from .video_upload import upload_video
from .workflow_extraction import router as workflow_extraction_router
from .workflow_matting import router as workflow_matting_router, close_uploads
from . import export_frames
from .organizer import HandoffRequest, EditExportRequest, edited_manifest
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError


class BatchStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sessionId: str = Field(pattern=r"^[a-f0-9]{32}$")
    frameIds: list[str] = Field(min_length=1, max_length=600)
    parentBatchId: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")


class BatchExport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    frameIds: list[str] = Field(min_length=1, max_length=600)


class WorkspaceReset(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sessionId: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    name: str = Field(min_length=1, max_length=80)
    characterId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    characterName: str = Field(min_length=1, max_length=80)


class ProjectSave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0, strict=True)
    project: CharacterProject


class ProjectDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedRevision: int = Field(ge=0, strict=True)


class BatchMigration(BaseModel):
    model_config = ConfigDict(extra="forbid")
    projectId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    projectName: str = Field(min_length=1, max_length=80)
    characterId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    characterName: str = Field(min_length=1, max_length=80)
    actionId: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")
    actionName: str = Field(min_length=1, max_length=80)
    fps: int = Field(ge=1, le=60, strict=True)


class OrganizedMigration(BatchMigration):
    frameIds: list[str] = Field(min_length=1, max_length=600)


def migration_spec(request: BatchMigration) -> MigrationSpec:
    return MigrationSpec(
        project_id=request.projectId, project_name=request.projectName,
        character_id=request.characterId, character_name=request.characterName,
        action_id=request.actionId, action_name=request.actionName, fps=request.fps,
    )


class ManagedDownload(FileResponse):
    """复用文件响应；传输成功、异常或断开均释放临时文件及占用。"""
    def __init__(self, path, cleanup, filename="organized-frames.zip", media_type="application/zip"):
        super().__init__(path, media_type=media_type, filename=filename)
        self.cleanup = cleanup

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            await run_in_threadpool(self.cleanup)


def require_loopback_client(request: Request) -> None:
    client_host = request.client.host if request.client else ""
    try:
        loopback = ipaddress.ip_address(client_host).is_loopback
    except ValueError:
        loopback = client_host == "testclient"
    if not loopback:
        raise DomainError("Godot 预览只允许本机连接")


def create_app(cache=CACHE, limits: Limits = LIMITS, projects=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(cache, limits)
        app.state.workflow_extraction = Store(Path(cache).with_name(Path(cache).name + "-workflow"), limits)
        app.state.workflow_matting = Store(Path(cache).with_name(Path(cache).name + "-workflow-matting"), limits)
        project_root = Path(projects).resolve() if projects is not None else (
            PROJECTS if Path(cache).resolve() == CACHE else Path(cache).resolve().parent / "projects"
        )
        app.state.projects = ProjectRepository(project_root)
        app.state.preview_bridge = PreviewBridge()
        yield
        app.state.preview_bridge.sessions.clear()
        await run_in_threadpool(app.state.store.close)
        await run_in_threadpool(app.state.workflow_extraction.close)
        close_uploads(app.state.workflow_matting)
        await run_in_threadpool(app.state.workflow_matting.close)

    app = FastAPI(title="动作工坊", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.include_router(workflow_extraction_router)
    app.include_router(workflow_matting_router)

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        host = request.headers.get("host", "")
        hostname = host.split(":")[0]
        origin = request.headers.get("origin")
        if hostname not in {"127.0.0.1", "localhost", "testserver"}:
            return JSONResponse({"detail": "仅允许本机访问"}, status_code=403)
        if origin and origin != f"http://{host}":
            return JSONResponse({"detail": "拒绝跨站请求"}, status_code=403)
        if request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "拒绝跨站请求"}, status_code=403)
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > limits.upload_bytes):
            return JSONResponse({"detail": "上传超过256MiB限制"}, status_code=413)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        ancestors = "'self'" if request.url.path == "/assets/matting/repair.html" else "'none'"
        response.headers["Content-Security-Policy"] = f"default-src 'self'; img-src 'self' blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors {ancestors}"
        return response

    @app.exception_handler(DomainError)
    async def domain_error(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=400)

    @app.exception_handler(KeyError)
    async def missing(request, exc):
        return JSONResponse({"detail": "素材或结果已过期，请重新导入"}, status_code=404)

    @app.get("/api/health")
    def health():
        available = {}
        for name in ("ffmpeg", "ffprobe"):
            try:
                binary(name)
                available[name] = True
            except DomainError:
                available[name] = False
        return {"ok": all(available.values()), "tools": available, "busy": app.state.store.busy is not None}

    @app.post("/api/videos")
    async def import_video(request: Request):
        return await upload_video(request, app.state.store)

    @app.get("/api/videos/{token}/source")
    def source(token: str):
        asset = app.state.store.asset(token)
        return FileResponse(asset.preview_path or asset.path, media_type={".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}[asset.path.suffix])

    @app.post("/api/jobs")
    def start(request: ExtractionRequest):
        return app.state.store.start(request)

    @app.post("/api/workspace/reset")
    def reset_workspace(request: WorkspaceReset):
        return app.state.store.reset_workspace(request.sessionId)

    @app.get("/api/jobs/{token}")
    def status(token: str):
        return app.state.store.snapshot(token)

    @app.post("/api/jobs/{token}/cancel")
    def cancel(token: str):
        return app.state.store.cancel_job(token)

    @app.get("/api/jobs/{token}/download")
    def download(token: str):
        return FileResponse(app.state.store.result_file(token, "frames.zip"), media_type="application/zip", filename="video-frames.zip")

    @app.get("/api/jobs/{token}/legacy-v1")
    def legacy(token: str):
        return JSONResponse(app.state.store.legacy(token), headers={"Content-Disposition": 'attachment; filename="frame-sequence-v1.json"'})

    @app.get("/api/jobs/{token}/frames/{index}")
    def frame(token: str, index: int, thumb: bool = False):
        job = app.state.store.snapshot(token)
        if job["status"] != "done" or not 1 <= index <= len(job["sequence"]["frames"]):
            raise DomainError("帧不存在或尚未完成")
        relative = f"thumbs/frame_{index:06d}.jpg" if thumb else f"frames/frame_{index:06d}.png"
        return FileResponse(app.state.store.result_file(token, relative), media_type="image/jpeg" if thumb else "image/png")

    @app.post("/api/edit-sessions")
    def handoff(request: HandoffRequest):
        return app.state.store.open_editor(request.jobId)

    @app.post("/api/edit-sessions/{token}/heartbeat")
    def heartbeat(token: str):
        app.state.store.editor_job(token)
        return {"ok": True}

    @app.delete("/api/edit-sessions/{token}")
    def release_editor(token: str):
        app.state.store.close_editor(token)
        return {"ok": True}

    @app.post("/api/edit-sessions/{token}/export")
    def edited_export(token: str, request: EditExportRequest):
        store = app.state.store
        archive, identity = store.export_editor(token, request.frameIds)
        return ManagedDownload(archive, lambda: store.finish_editor_export(archive, identity))

    @app.post("/api/matting-batches")
    def start_matting(request: BatchStart):
        return app.state.store.batches.start(request.sessionId, request.frameIds, request.parentBatchId)

    @app.get("/api/matting-batches/{token}")
    def matting_status(token: str):
        return app.state.store.batches.get(token).public()

    @app.post("/api/matting-batches/{token}/cancel")
    def cancel_matting(token: str):
        return app.state.store.batches.cancel(token)

    @app.get("/api/matting-batches/{token}/frames/{frame_id}/{variant}")
    def matting_frame(token: str, frame_id: str, variant: str):
        path = app.state.store.batches.frame_file(token, frame_id, variant)
        return FileResponse(path, media_type="image/png")

    @app.put("/api/matting-batches/{token}/frames/{frame_id}")
    async def save_matting_frame(token: str, frame_id: str, request: Request, revision: int):
        if request.headers.get("content-type") != "image/png":
            raise DomainError("精修结果必须为PNG")
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 50 * 1024**2:
                raise DomainError("精修PNG超过50MiB")
            chunks.append(chunk)
        data = b"".join(chunks)
        return await run_in_threadpool(app.state.store.batches.save_frame, token, frame_id, revision, data)

    @app.get("/api/matting-batches/{token}/download")
    def matting_download(token: str):
        store = app.state.store
        archive, identity = store.batches.export(token)
        return ManagedDownload(archive, lambda: store.batches.finish_export(archive, identity), "transparent-frames.zip")

    @app.post("/api/matting-batches/{token}/download")
    def matting_download_current(token: str, request: BatchExport):
        store = app.state.store
        archive, identity = store.batches.export(token, request.frameIds)
        return ManagedDownload(archive, lambda: store.batches.finish_export(archive, identity), "transparent-frames.zip")

    @app.get("/")
    def index():
        return FileResponse(ROOT / "web" / "index.html")

    @app.get("/projects")
    def projects_page():
        return FileResponse(ROOT / "web" / "projects.html")

    @app.get("/workflow")
    def workflow_page():
        return FileResponse(ROOT / "web" / "workflow.html")

    @app.get("/javascript-preview")
    def javascript_preview_page():
        return FileResponse(ROOT / "integrations" / "javascript" / "demo.html")

    @app.get("/api/character-projects")
    def list_projects():
        return {"projects": app.state.projects.list()}

    @app.post("/api/character-projects")
    def create_project(request: ProjectCreate):
        project = CharacterProject(
            formatVersion=2, kind="action-forge-project", id=request.id,
            name=request.name, revision=0,
            characters=[Character(
                id=request.characterId, name=request.characterName, revision=0,
                referenceImage=None, canvas=None, origin=None,
                scale={"x": 1, "y": 1}, actions=[],
            )],
        )
        return app.state.projects.create(project)

    @app.get("/api/character-projects/{project_id}")
    def load_project(project_id: str):
        return app.state.projects.load(project_id)

    @app.put("/api/character-projects/{project_id}")
    def save_project(project_id: str, request: ProjectSave):
        return app.state.projects.save(project_id, request.expectedRevision, request.project)

    @app.delete("/api/character-projects/{project_id}")
    def delete_project(project_id: str, request: ProjectDelete):
        app.state.projects.delete(project_id, request.expectedRevision)
        return {"ok": True, "id": project_id}

    @app.get("/api/character-projects/{project_id}/export")
    def export_character_project(project_id: str):
        archive = app.state.projects.export_archive(project_id)
        return ManagedDownload(archive, lambda: archive.unlink(missing_ok=True),
                               f"{project_id}-character-assets.zip")

    @app.get("/api/character-projects/{project_id}/frames/{frame_id}")
    def project_frame(project_id: str, frame_id: str):
        project = app.state.projects.load(project_id)
        for character in project.characters:
            for action in character.actions:
                for frame in action.frames:
                    if frame.id == frame_id:
                        relative = frame.assets.current or frame.assets.mattingBase or frame.assets.source
                        return FileResponse(
                            app.state.projects.root / project_id / relative,
                            media_type="image/png",
                        )
        raise DomainError("项目帧不存在")

    @app.post("/api/character-projects/{project_id}/preview-sessions")
    def create_preview_session(project_id: str, request: Request):
        require_loopback_client(request)
        project = app.state.projects.load(project_id)
        if not any(character.canvas and character.origin and character.baseline
                   for character in project.characters):
            raise DomainError("角色尚未设置共享画布、原点和基准帧")
        session, token = app.state.preview_bridge.create(project_id)
        port = request.url.port or (443 if request.url.scheme == "https" else 80)
        scheme = "wss" if request.url.scheme == "https" else "ws"
        return {
            "sessionId": session.id, "token": token,
            "websocketUrl": f"{scheme}://127.0.0.1:{port}/api/preview-sessions/{session.id}/socket",
            "expiresInSeconds": app.state.preview_bridge.ttl_seconds,
            "protocolVersion": PROTOCOL_VERSION,
        }

    @app.put("/api/preview-sessions/{session_id}/snapshot")
    async def publish_preview_snapshot(session_id: str, request: Request):
        require_loopback_client(request)
        session = app.state.preview_bridge.get(session_id, request.headers.get("authorization"))
        chunks = []
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > 8 * 1024 * 1024:
                return JSONResponse({"detail": "预览快照超过8MiB限制"}, status_code=413)
            chunks.append(chunk)
        try:
            snapshot = PreviewSnapshotRequest.model_validate_json(b"".join(chunks))
        except ValidationError as exc:
            errors = exc.errors(include_url=False, include_context=False, include_input=False)
            return JSONResponse({"detail": errors}, status_code=422)
        saved_project = await run_in_threadpool(app.state.projects.load, session.project_id)
        outgoing = app.state.preview_bridge.publish(session, snapshot, saved_project)
        await app.state.preview_bridge.send_latest(session)
        return {"revision": outgoing["revision"], "status": "sent" if session.websocket else "waiting"}

    @app.get("/api/preview-sessions/{session_id}")
    def preview_session_status(session_id: str, request: Request):
        require_loopback_client(request)
        session = app.state.preview_bridge.get(session_id, request.headers.get("authorization"))
        status = "waiting-connection" if not session.websocket else "waiting-snapshot"
        if session.snapshot:
            status = ("synced" if session.acknowledged_revision == session.revision
                     else "waiting-ack")
        return {
            "status": status, "revision": session.revision,
            "acknowledgedRevision": session.acknowledged_revision,
            "expiresInSeconds": max(0, int(session.expires_at - time.monotonic())),
        }

    @app.get("/api/preview-sessions/{session_id}/frames/{frame_id}")
    def preview_frame(session_id: str, frame_id: str, request: Request):
        require_loopback_client(request)
        session = app.state.preview_bridge.get(session_id, request.headers.get("authorization"))
        relative = session.asset_paths.get(frame_id)
        if relative is None:
            raise DomainError("预览帧不存在")
        try:
            root = (app.state.projects.root / session.project_id).resolve(strict=True)
            path = (root / relative).resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise DomainError("预览帧素材不存在或不可访问") from exc
        if not path.is_relative_to(root) or not path.is_file():
            raise DomainError("预览帧素材不存在")
        return FileResponse(path, media_type="image/png", headers={"Cache-Control": "no-store"})

    @app.websocket("/api/preview-sessions/{session_id}/socket")
    async def preview_socket(websocket: WebSocket, session_id: str):
        host = websocket.headers.get("host", "")
        hostname = host.rsplit(":", 1)[0].strip("[]") if host else ""
        client_host = websocket.client.host if websocket.client else ""
        origin = websocket.headers.get("origin")
        origin_host = urlsplit(origin).hostname if origin else None
        try:
            loopback_client = ipaddress.ip_address(client_host).is_loopback
        except ValueError:
            loopback_client = client_host == "testclient"
        if (hostname not in {"127.0.0.1", "localhost", "testserver"} or
                not loopback_client or
                (origin and origin_host not in {"127.0.0.1", "localhost"})):
            await websocket.close(code=1008, reason="仅允许本机预览连接")
            return
        try:
            session = app.state.preview_bridge.get(
                session_id, websocket.headers.get("authorization"))
        except DomainError as exc:
            await websocket.close(code=1008, reason=str(exc)[:120])
            return
        await websocket.accept()
        try:
            await app.state.preview_bridge.connect(session, websocket)
        except DomainError as exc:
            await websocket.close(code=1008, reason=str(exc)[:120])
            return
        try:
            await websocket.send_json({
                "type": "session-ready", "protocolVersion": PROTOCOL_VERSION,
                "messageId": "session-ready", "revision": session.revision,
            })
            if session.snapshot:
                await app.state.preview_bridge.send_latest(session)
            while True:
                raw_text = await websocket.receive_text()
                if len(raw_text.encode("utf-8")) > 4096:
                    await websocket.close(code=1009, reason="预览确认消息超过4KiB")
                    return
                try:
                    message = EngineMessage.model_validate_json(raw_text)
                    if message.protocolVersion != PROTOCOL_VERSION or message.type != "ack":
                        raise ValueError("不支持的预览消息")
                    if message.revision > session.revision:
                        raise ValueError("确认修订号尚未发布")
                    app.state.preview_bridge.acknowledge(session, message)
                    if session.acknowledged_revision == message.revision:
                        await websocket.send_json({
                            "type": "snapshot-acknowledged", "protocolVersion": PROTOCOL_VERSION,
                            "messageId": message.messageId, "revision": message.revision,
                        })
                except Exception as exc:
                    await websocket.send_json({
                        "type": "error", "protocolVersion": PROTOCOL_VERSION,
                        "code": "SNAPSHOT_INVALID", "detail": str(exc)[:200],
                    })
                    await websocket.close(code=1008, reason="协议消息无效")
                    return
        except WebSocketDisconnect:
            pass
        finally:
            app.state.preview_bridge.disconnect(session, websocket)

    @app.post("/api/jobs/{token}/migrate")
    def migrate_extracted_sequence(token: str, request: BatchMigration):
        snapshot = app.state.store.snapshot(token)
        if snapshot["status"] != "done" or "sequence" not in snapshot:
            raise DomainError("只能迁移完整完成的抽帧结果")
        frames = {frame["id"]: frame for frame in snapshot["sequence"]["frames"]}
        return migrate_sequence(
            app.state.projects, snapshot["sequence"], migration_spec(request),
            lambda frame_id: app.state.store.result_file(token, frames[frame_id]["image"]),
        )

    @app.post("/api/edit-sessions/{token}/migrate")
    def migrate_organized_sequence(token: str, request: OrganizedMigration):
        job = app.state.store.editor_job(token)
        identity = hashlib.sha256(
            f"{job.id}:{','.join(request.frameIds)}".encode("utf-8")
        ).hexdigest()[:32]
        sequence = edited_manifest(job.result, request.frameIds, identity)
        frames = {frame["id"]: frame for frame in job.result["frames"]}
        return migrate_sequence(
            app.state.projects, sequence, migration_spec(request),
            lambda frame_id: app.state.store.result_file(job.id, frames[frame_id]["image"]),
        )

    @app.post("/api/matting-batches/{token}/migrate")
    def migrate_matting_batch(token: str, request: BatchMigration):
        batch = app.state.store.batches.get(token, done=True)
        result = migrate_batch(
            app.state.projects, batch,
            migration_spec(request),
            lambda frame_id, variant: app.state.store.batches.frame_file(token, frame_id, variant),
        )
        return result

    @app.post("/api/export/analyze")
    def export_analyze(request: export_frames.ExportSource):
        return export_frames.analyze(app.state.store, request)

    @app.post("/api/export/preview")
    def export_preview(request: export_frames.PreviewSettings):
        return Response(export_frames.preview(app.state.store, request), media_type="image/png")

    @app.post("/api/export/download")
    def export_download(request: export_frames.ExportSettings):
        store=app.state.store
        path,token,name=export_frames.export(store,request)
        return ManagedDownload(path,lambda:export_frames.finish(store,path.parent,token),name+'.zip',media_type='application/zip')

    app.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
    # web/ 下的薄转发模块按源码目录关系引用共享实现；保留同构路径供浏览器解析。
    app.mount("/integrations/javascript", StaticFiles(directory=ROOT / "integrations" / "javascript"),
              name="javascript-integrations")
    app.mount("/javascript-runtime", StaticFiles(directory=ROOT / "integrations" / "javascript"),
              name="javascript-runtime")
    return app


app = create_app()

"""工作流抽帧适配：独立任务缓存，复用Store及FFmpeg处理核心。"""
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from .domain import DomainError, ExtractionRequest
from .video_upload import upload_video

router = APIRouter(prefix="/api/workflow-extraction")


@router.post("/videos")
async def upload(request: Request):
    result = await upload_video(request, request.app.state.workflow_extraction)
    # 原文件已在浏览器保存，不暴露旧Store的预览地址。
    result.pop("url", None)
    return result


def snapshot(store, token):
    result = store.snapshot(token)
    result.pop("downloadUrl", None)
    return result


@router.post("/jobs")
def start(payload: ExtractionRequest, request: Request):
    store = request.app.state.workflow_extraction
    return snapshot(store, store.start(payload)["id"])


@router.get("/jobs/{token}")
def status(token: str, request: Request):
    return snapshot(request.app.state.workflow_extraction, token)


@router.post("/jobs/{token}/cancel")
def cancel(token: str, request: Request):
    store = request.app.state.workflow_extraction
    store.cancel_job(token)
    return snapshot(store, token)


@router.get("/jobs/{token}/frames/{index}")
def frame(token: str, index: int, request: Request):
    store = request.app.state.workflow_extraction
    result = store.snapshot(token)
    if result["status"] != "done" or not 1 <= index <= len(result["sequence"]["frames"]):
        raise DomainError("帧不存在或尚未完成")
    return FileResponse(store.result_file(token, f"frames/frame_{index:06d}.png"), media_type="image/png")

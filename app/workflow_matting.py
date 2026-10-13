"""浏览器帧集适配器；复用批量模型/精修，不借用旧页抽帧会话。"""
import io
import threading
import uuid
from fractions import Fraction
from typing import Annotated

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from PIL import Image

from .batch_matting import Batch, PROCESSING_POLICY
from .domain import DomainError
from .media import directory_bytes

router = APIRouter(prefix='/api/workflow-matting')


class Frame(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    id: str = Field(pattern=r'^[a-f0-9]{32}-[0-9]{6}$')
    sourceIndex: int = Field(ge=0, strict=True)
    sourceTimeSeconds: str | None = Field(default=None, max_length=80)
    durationSeconds: str = Field(max_length=80)
    contentHash: str = Field(pattern=r'^[a-f0-9]{64}$')
    cached: bool = Field(default=False, strict=True)
    revision: int = Field(default=0, ge=0, strict=True)

    @model_validator(mode='after')
    def timing(self):
        try:
            if not 0 < Fraction(self.durationSeconds) <= 60:
                raise ValueError()
            if self.sourceTimeSeconds is not None and not 0 <= Fraction(self.sourceTimeSeconds) <= 600:
                raise ValueError()
        except (ValueError, ZeroDivisionError):
            raise ValueError('帧时间无效')
        return self


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=180)
    width: int = Field(ge=1, le=12000, strict=True)
    height: int = Field(ge=1, le=12000, strict=True)
    policy: str = Field(pattern='^model-local-despill-v1$')
    frames: list[Frame] = Field(min_length=1, max_length=600)

    @model_validator(mode='after')
    def unique(self):
        if len({frame.id for frame in self.frames}) != len(self.frames):
            raise ValueError('帧身份重复')
        if self.width * self.height > 12_000_000:
            raise ValueError('单帧不能超过1200万像素')
        return self


def store(request):
    return request.app.state.workflow_matting


@router.post('/jobs')
def begin(payload: Input, request: Request):
    target = store(request)
    if payload.width * payload.height * 4 * len(payload.frames) > target.limits.rgba_bytes:
        raise DomainError('批量RGBA预算超限')
    token = uuid.uuid4().hex
    target._reserve(token)
    directory = target.root / f'batch-{token}'
    try:
        directory.mkdir()
        (directory / 'upload').mkdir()
        frames = [dict(frame.model_dump(), image=f'frames/frame_{index+1:06d}.png', matting={'manual': frame.revision > 0, 'model': 'restored' if frame.cached else None}) for index, frame in enumerate(payload.frames)]
        manifest = {'formatVersion': 4, 'id': token, 'name': payload.name, 'canvas': {'width': payload.width, 'height': payload.height}, 'frames': frames, 'derivation': {'processingPolicy': PROCESSING_POLICY}}
        batch = Batch(token, token, directory, {}, manifest, [directory / 'upload' / f'{index}-source.png' for index in range(len(frames))], stage='上传原始帧', revisions={frame.id: frame.revision if frame.cached else 0 for frame in payload.frames}, modified={frame.id for frame in payload.frames if frame.cached and frame.revision})
        batch.upload_open = True
        batch.upload_bytes = 0
        batch.uploading = False
        batch.uploaded = set()
        batch.upload_timer = threading.Timer(900, expire, args=(target, batch))
        batch.upload_timer.daemon = True
        with target.lock:
            target.batches.items[token] = batch
        batch.upload_timer.start()
        return batch.public()
    except BaseException:
        target._remove(directory)
        with target.lock:
            target.busy = None
        raise


def expire(target, batch):
    with target.lock:
        if batch.upload_open:
            batch.upload_open = False
            batch.cancel.set()
            batch.status, batch.stage = 'cancelled', '上传已取消或超时'
            batch.finished.set()
            if target.busy == batch.id:
                target.busy = None


async def png_body(request):
    if request.headers.get('content-type') != 'image/png':
        raise DomainError('必须上传PNG')
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 50 * 1024**2:
            raise DomainError('单帧超过50 MiB')
    return bytes(data)


@router.put('/jobs/{token}/upload/{index}/{variant}')
async def upload(token: str, index: int, variant: str, request: Request):
    target = store(request)
    batch = target.batches.get(token)
    with target.lock:
        if not batch.upload_open or batch.uploading or not 0 <= index < len(batch.source_paths) or variant not in {'source', 'auto', 'current'}:
            raise DomainError('上传状态或帧无效')
        frame = batch.manifest['frames'][index]
        if variant != 'source' and not frame['cached']:
            raise DomainError('未声明恢复结果')
        if (index, variant) in batch.uploaded:
            raise DomainError('帧不可重复上传')
        batch.uploading = True
    try:
        data = await png_body(request)
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.format != 'PNG' or image.size != (batch.manifest['canvas']['width'], batch.manifest['canvas']['height']) or (variant != 'source' and image.mode != 'RGBA'):
                    raise DomainError('PNG尺寸或RGBA格式不一致')
                image.load()
        except (OSError, Image.DecompressionBombError) as exc:
            raise DomainError('PNG无法解码') from exc
        import hashlib
        if variant == 'source' and hashlib.sha256(data).hexdigest() != frame['contentHash']:
            raise DomainError('原始帧哈希不一致')
        with target.lock:
            if not batch.upload_open:
                raise DomainError('上传已取消')
            if batch.upload_bytes + len(data) > 256 * 1024**2 or directory_bytes(target.root) + len(data) > target.limits.cache_bytes:
                raise DomainError('帧集超过256 MiB或磁盘预算')
            path = batch.directory / 'upload' / f'{index}-{variant}.png'
            path.write_bytes(data)
            batch.upload_bytes += len(data)
            batch.uploaded.add((index, variant))
        return {'ok': True}
    finally:
        with target.lock:
            batch.uploading = False


@router.post('/jobs/{token}/run')
def run(token: str, request: Request):
    target = store(request)
    batch = target.batches.get(token)
    with target.lock:
        expected = {(index, variant) for index, frame in enumerate(batch.manifest['frames']) for variant in (('source', 'auto', 'current') if frame['cached'] else ('source',))}
        if not batch.upload_open or batch.uploading or batch.uploaded != expected:
            raise DomainError('原始帧或恢复结果尚未完整上传')
        batch.upload_open = False
        batch.upload_timer.cancel()
        batch.cached_paths = {frame['id']: {variant: batch.directory / 'upload' / f'{index}-{variant}.png' for variant in ('auto', 'current')} for index, frame in enumerate(batch.manifest['frames']) if frame['cached']}
        threading.Thread(target=target.batches._run, args=(batch,), daemon=True).start()
    return batch.public()


@router.get('/jobs/{token}')
def status(token: str, request: Request):
    return store(request).batches.get(token).public()


@router.post('/jobs/{token}/cancel')
def cancel(token: str, request: Request):
    target = store(request)
    batch = target.batches.get(token)
    if batch.upload_open:
        batch.upload_timer.cancel()
        expire(target, batch)
    return target.batches.cancel(token)


@router.get('/jobs/{token}/frames/{frame_id}/{variant}')
def frame(token: str, frame_id: str, variant: str, request: Request):
    return FileResponse(store(request).batches.frame_file(token, frame_id, variant), media_type='image/png', headers={'Cache-Control': 'no-store'})


@router.put('/jobs/{token}/frames/{frame_id}')
async def repair(token: str, frame_id: str, revision: int, request: Request):
    return store(request).batches.save_frame(token, frame_id, revision, await png_body(request))


def close_uploads(target):
    for batch in list(target.batches.items.values()):
        if getattr(batch, 'upload_open', False):
            batch.upload_timer.cancel()
            expire(target, batch)

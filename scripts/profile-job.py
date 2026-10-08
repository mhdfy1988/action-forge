"""自制小视频的有界性能诊断，不访问私人素材。"""
import cProfile
import hashlib
import pstats
import tempfile
from pathlib import Path
from app.domain import ExtractionRequest, choose_samples, targets
from app.service import Job, Store

source=Path(__file__).resolve().parents[1]/"output/fixtures/自制 动作测试.mp4"
with tempfile.TemporaryDirectory(prefix="frames-profile-") as temporary:
    store=Store(Path(temporary)/"cache")
    token,name,directory,path=store.begin_upload(source.name)
    path.write_bytes(source.read_bytes())
    store.finish_upload(token,name,directory,path,hashlib.sha256(path.read_bytes()).hexdigest())
    asset=store.asset(token)
    start,end,grid=targets(0,2,60,asset.video.duration,asset.video.width,asset.video.height)
    samples=choose_samples(grid,end,list(asset.video.frames))
    output=store.root/("job-"+"a"*32);output.mkdir()
    job=Job("a"*32,token,output,ExtractionRequest(videoId=token,start=0,end=2,fps=60).model_dump())
    profile=cProfile.Profile();profile.runcall(store._extract,job,asset,start,end,samples)
    print(job.status)
    pstats.Stats(profile).sort_stats("cumulative").print_stats(12)

"""本机真实接口验收，素材仅自制；不调用抠图或外部API。"""
import hashlib
import io
import json
import time
import zipfile
from pathlib import Path
from urllib.parse import quote
import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "output/fixtures/自制 动作测试.mp4"
client = httpx.Client(base_url="http://127.0.0.1:8897", timeout=40)
before = hashlib.sha256(source.read_bytes()).hexdigest()
response = client.post("/api/videos", content=source.read_bytes(), headers={"X-File-Name": quote(source.name)})
response.raise_for_status()
video = response.json()
started = time.monotonic()
response = client.post("/api/jobs", json={"videoId":video["id"],"start":0,"end":2,"fps":60})
response.raise_for_status()
job = response.json()
phases = []
last = None
while time.monotonic() - started < 40:
    response = client.get(f"/api/jobs/{job['id']}")
    response.raise_for_status()
    job = response.json()
    if job["stage"] != last:
        phases.append({"elapsed": round(time.monotonic()-started, 3), "stage": job["stage"], "progress": job["progress"]})
        last = job["stage"]
    if job["status"] in {"done", "failed", "cancelled"}:
        break
    time.sleep(.1)
assert job["status"] == "done", job
archive = client.get(job["downloadUrl"])
archive.raise_for_status()
with zipfile.ZipFile(io.BytesIO(archive.content)) as packed:
    assert len(packed.namelist()) == 121 and packed.testzip() is None
    sequence = json.loads(packed.read("frame-sequence.json"))
    for frame in sequence["frames"]:
        with Image.open(io.BytesIO(packed.read(frame["image"]))) as image:
            image.load()
            assert image.size == (320, 180)
assert hashlib.sha256(source.read_bytes()).hexdigest() == before
report = {"sourceSha256": before, "frames": len(sequence["frames"]), "duplicates": job["duplicateCount"], "phases": phases, "elapsed": round(time.monotonic()-started,3), "zipBytes":len(archive.content), "status":"passed"}
out = ROOT / "output/acceptance"
out.mkdir(parents=True, exist_ok=True)
(out / "live.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))

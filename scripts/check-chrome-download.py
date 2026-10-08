"""重读Chrome实际下载，与独立全帧解码对照，不用缩略图冒充PNG。"""
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from fractions import Fraction
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'output/fixtures/自制 动作测试.mp4'
archive=ROOT/'output/acceptance/chrome-frames.zip'
with tempfile.TemporaryDirectory(prefix='frames-chrome-check-') as temp:
    folder=Path(temp)
    subprocess.run(['ffmpeg','-v','error','-y','-threads','2','-filter_threads','2','-i',str(source),'-fps_mode','passthrough','-c:v','png','-threads','2','-pix_fmt','rgb24',str(folder/'%06d.png')],check=True,timeout=30)
    with zipfile.ZipFile(archive) as packed:
        assert packed.testzip() is None and len(packed.namelist())==13
        sequence=json.loads(packed.read('frame-sequence.json'))
        frames=sequence['frames']
        assert [frame['sourceFrameIndex'] for frame in frames]==list(range(6,30,2))
        assert sum(Fraction(frame['durationSeconds']) for frame in frames)==1
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        assert sequence['source']['sha256']==digest
        for frame in frames:
            with Image.open(io.BytesIO(packed.read(frame['image']))) as actual,Image.open(folder/f"{frame['sourceFrameIndex']+1:06d}.png") as expected:
                assert actual.mode=='RGB' and actual.size==(320,180)
                assert actual.tobytes()==expected.tobytes()
report={'status':'passed','frames':12,'zipEntries':13,'sourceSha256':digest,'durationSeconds':'1/1','pixelComparison':'independent full decode, all frames exact'}
(ROOT/'output/acceptance/chrome-download.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))

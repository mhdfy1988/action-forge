"""自制1080p夹具定向诊断，不使用私人视频。"""
import json
import subprocess
import sys
from pathlib import Path
from threading import Event

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from app.media import probe,decode_selected
from app.domain import DomainError
import app.media as media

folder=ROOT/'output'/'acceptance'/'decode-diagnostic'
folder.mkdir(parents=True,exist_ok=True)
def capture(args,*unused):
    result=subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace')
    (folder/'command.json').write_text(json.dumps(args,indent=2),encoding='utf-8')
    (folder/'stderr.txt').write_text(result.stderr,encoding='utf-8')
    print('exit',result.returncode)
    print(result.stderr[-3000:])
    if result.returncode:raise DomainError('诊断失败，日志已保存')
    return result.stdout,result.stderr
video=probe(ROOT/'output'/'fixtures'/'large.mp4')
media.run_process=capture
decode_selected(ROOT/'output'/'fixtures'/'large.mp4',video,list(range(120)),folder,Event(),30,lambda:None)

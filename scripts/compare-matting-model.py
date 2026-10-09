"""单帧模型诊断：固定正式后处理，分别保留原始蒙版和最终输出。"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
import numpy as np
from PIL import Image
import torch

parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path)
parser.add_argument('output',type=Path)
parser.add_argument('--model',choices=('toonout','hr'),required=True)
args=parser.parse_args()
torch.set_num_threads(4)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from model_config import resolve_model_runtime
sys.path.insert(0,str(resolve_model_runtime().root))
import app.engine as module
from app.refinement import refine

# 仅本实验进程固定路由，正式服务的选型规则不改。
module.select_model=lambda image:args.model
engine=module.GameArtEngine()
source=Image.open(args.source).convert('RGB')
rgb=np.asarray(source,dtype=float)/255
alpha=engine.predict_alpha(source)
args.output.mkdir(parents=True,exist_ok=True)
raw=np.dstack((np.asarray(source),np.round(alpha*255).astype(np.uint8)))
Image.fromarray(raw).save(args.output/f'{args.model}-raw.png')
result,details=refine(rgb,alpha)
result.save(args.output/f'{args.model}-processed.png')
details.update(engine._inference_details)
report={'model':args.model,'details':details,'regions':{}}
processed=np.asarray(result)
for name,area in {'text':(slice(610,720),slice(1020,1280)), 'groundWithBoot':(slice(650,720),slice(370,880))}.items():
    a=alpha[area];b=processed[area][...,3]
    report['regions'][name]={'rawVisible':int((a>0).sum()),'rawOpaque':int((a>=1).sum()),'processedVisible':int((b>0).sum()),'processedOpaque':int((b==255).sum())}
for pixels,label in ((raw,'raw'),(processed,'processed')):
    a=pixels[...,3,None]/255
    composed=np.round(pixels[...,:3]*a+242*(1-a)).astype(np.uint8)
    Image.fromarray(composed).save(args.output/f'{args.model}-{label}-white.png')
(args.output/f'{args.model}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

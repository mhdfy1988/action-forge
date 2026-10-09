"""只读诊断用户指定帧；保留源和正式结果，输出独立对比证据。"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('result', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--compare-engine', action='store_true')
args = parser.parse_args()
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from model_config import resolve_model_runtime
root = resolve_model_runtime().root
sys.path.insert(0, str(root))
from app.refinement import background_statistics

source = np.asarray(Image.open(args.source).convert('RGB'))
pixels = np.asarray(Image.open(args.result).convert('RGBA'))
background = background_statistics(source.astype(float)/255)
alpha = pixels[..., 3]
rgb = pixels[..., :3].astype(float)
green = (rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2]) > 30) & (alpha > 0)
source_rgb = source.astype(float)
source_green = (source_rgb[...,1]-np.maximum(source_rgb[...,0],source_rgb[...,2])>50)
report = {
    'sourceSize': [source.shape[1],source.shape[0]],
    'resultSize': [pixels.shape[1],pixels.shape[0]],
    'background': {'rgb': (background.color*255).tolist(), 'uniform':bool(background.uniform), 'tolerance':background.tolerance, 'channel':background.chroma_channel},
    'visibleGreenPixels': int(green.sum()),
    'opaqueGreenPixels': int((green & (alpha==255)).sum()),
    'softGreenPixels': int((green & (alpha<255)).sum()),
    'sourceGreenRetainedOpaque': int((source_green & (alpha==255)).sum()),
    'regions': {},
}
for name, area in {'bottomRight':(slice(610,720),slice(1020,1280)), 'ground':(slice(650,720),slice(370,880))}.items():
    a=alpha[area]
    report['regions'][name]={'visible':int((a>0).sum()),'opaque':int((a==255).sum()),'maxAlpha':int(a.max())}
args.output.mkdir(parents=True,exist_ok=True)
for color,name in ((255,'white'),(0,'black')):
    a=alpha[...,None]/255.
    composed=np.round(rgb*a+color*(1-a)).astype(np.uint8)
    Image.fromarray(composed).save(args.output/f'result-{name}.png')
if args.compare_engine:
    from app.engine import GameArtEngine
    import io
    engine=GameArtEngine()
    fresh=engine.cutout(Image.open(args.source))
    fresh_pixels=np.asarray(Image.open(io.BytesIO(fresh)).convert('RGBA'))
    report['freshEngineDetails']=engine.last_details
    report['freshByteDecodedEqual']=bool(np.array_equal(fresh_pixels,pixels))
    report['changedPixels']=int(np.any(fresh_pixels!=pixels,axis=2).sum())
    (args.output/'fresh-engine.png').write_bytes(fresh)
(args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

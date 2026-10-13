"""仅独立8898导出链路验收；合成处理器不是模型质量验收。"""
from pathlib import Path
import json
from tempfile import TemporaryDirectory

from app.batch_matting import BatchManager
from synthetic_matting import Shapes
original=BatchManager.__init__
def init(self,store,model_factory=None):
    original(self,store,Shapes)
BatchManager.__init__=init
from app.main import app


@app.post("/__test/seed-r2-character-project")
def seed_r2_character_project(payload: dict):
    """只供隔离浏览器验收构造带真实PNG文件的双动作项目。"""
    from PIL import Image, ImageDraw
    from app.character_project_schema import CharacterProject

    project_id=payload["projectId"]
    actions=[]
    asset_sources={}
    with TemporaryDirectory() as temporary:
        temp_root=Path(temporary)
        for action_id,name,fps,frame_ids,color in (
                ("run","跑步",12,["run-frame"],(174,81,61,255)),
                ("jump","跳跃",8,["jump-frame","jump-frame-2"],(49,106,180,255))):
            frames=[]
            for index,frame_id in enumerate(frame_ids):
                relative=f"assets/characters/hero/actions/{action_id}/source/frame-{index}.png"
                source=temp_root/f"{action_id}-{index}.png"
                image=Image.new("RGBA",(64,96),(0,0,0,0));draw=ImageDraw.Draw(image)
                draw.ellipse((19,8,45,36),fill=color)
                draw.polygon(((12,49),(32,39),(52,49),(46,71),(18,71)),fill=color)
                draw.line((23,68,14,91),fill=(53,68,59,255),width=8)
                draw.line((40,68,50,91),fill=(53,68,59,255),width=8)
                draw.line((45,49,59,42),fill=(209,138,58,255),width=7)
                image.save(source)
                asset_sources[relative]=source
                frames.append({"id":frame_id,"revision":0,"enabled":True,
                    "assets":{"source":relative,"mattingBase":None,"current":None},
                    "source":{"sourceFrameId":None,"sourceFrameIndex":index,
                              "sourceTimeSeconds":None,"sourcePts":None}})
            actions.append({"id":action_id,"name":name,"revision":0,"loop":True,
                "playback":{"mode":"constant-fps","fps":fps},
                "transform":{"offset":{"x":0,"y":0},"scale":{"x":1,"y":1},"rotationDegrees":0},
                "source":{"kind":"image-sequence","sequenceId":f"{action_id}-sequence","declaredFps":fps},
                "frames":frames,"events":[]})
        project=CharacterProject.model_validate({
            "formatVersion":1,"kind":"action-forge-project","id":project_id,
            "name":"跨动作校准验收","revision":0,"characters":[{
                "id":"hero","name":"英雄","revision":0,"referenceImage":None,
                "canvas":None,"origin":None,"baseline":None,"scale":{"x":1,"y":1},
                "actions":actions}],"migrations":[]})
        return app.state.projects.create(project,asset_sources).model_dump(mode="json")


@app.post("/__test/seed-r4-character-project")
def seed_r4_character_project(payload: dict):
    """建立v1磁盘清单及真实多帧PNG，供R4浏览器迁移/保存重开验收。"""
    from PIL import Image, ImageDraw
    from app.character_project_schema import CharacterProject
    from app.project_repository import ProjectRepository

    project_id=payload["projectId"]
    actions=[]
    asset_sources={}
    with TemporaryDirectory() as temporary:
        temp_root=Path(temporary)
        for action_id,name,fps,count,color in (
                ("run","跑步",12,6,(174,81,61,255)),
                ("jump","跳跃",8,4,(49,106,180,255))):
            frames=[]
            for index in range(count):
                frame_id=f"{action_id}-frame-{index+1:03d}"
                relative=f"assets/characters/hero/actions/{action_id}/source/{frame_id}.png"
                source=temp_root/f"{frame_id}.png"
                image=Image.new("RGBA",(64,96),(0,0,0,0));draw=ImageDraw.Draw(image)
                draw.ellipse((19,8+index%3,45,36+index%3),fill=color)
                draw.polygon(((12,49),(32,39),(52,49),(46,71),(18,71)),fill=color)
                draw.line((23,68,14,91),fill=(53,68,59,255),width=8)
                draw.line((40,68,50,91),fill=(53,68,59,255),width=8)
                image.save(source);asset_sources[relative]=source
                frames.append({"id":frame_id,"revision":0,"enabled":True,"duration":None,
                    "assets":{"source":relative,"mattingBase":None,"current":None},
                    "source":{"sourceFrameId":None,"sourceFrameIndex":index,
                              "sourceTimeSeconds":None,"sourcePts":None}})
            actions.append({"id":action_id,"name":name,"revision":0,"loop":True,
                "playback":{"mode":"constant-fps","fps":fps},
                "transform":{"offset":{"x":0,"y":0},"scale":{"x":1,"y":1},"rotationDegrees":0},
                "source":{"kind":"image-sequence","sequenceId":f"{action_id}-sequence","declaredFps":fps},
                "frames":frames,"events":[]})
        project=CharacterProject.model_validate({
            "formatVersion":1,"kind":"action-forge-project","id":project_id,
            "name":"R4多帧迁移验收","revision":0,"characters":[{
                "id":"hero","name":"英雄","revision":0,"referenceImage":None,
                "canvas":None,"origin":None,"baseline":None,"scale":{"x":1,"y":1},
                "actions":actions}],"migrations":[]})
        created=app.state.projects.create(project,asset_sources)
    raw=created.model_dump(mode="json")
    raw["formatVersion"]=1
    for character in raw["characters"]:
        for action in character["actions"]:
            for frame in action["frames"]:
                frame.pop("duration",None)
    manifest=Path(app.state.projects.root)/project_id/"project.json"
    manifest.write_text(json.dumps(raw,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return {"projectId":project_id,"frameCount":10,"formatVersionOnDisk":1}


@app.post("/__test/seed-r5-character-project")
def seed_r5_character_project(payload: dict):
    """建立已校准、已抠图并含两种播放模式/事件的R5真实导出项目。"""
    from PIL import Image, ImageDraw
    from app.character_project_schema import CharacterProject

    project_id=payload["projectId"]
    actions=[]
    asset_sources={}
    with TemporaryDirectory() as temporary:
        temp_root=Path(temporary)
        for action_id,name,loop,playback,count,color in (
                ("run","跑步",True,{"mode":"constant-fps","fps":10},4,(174,81,61,255)),
                ("jump","跳跃",False,{"mode":"per-frame"},3,(49,106,180,255))):
            frames=[]
            for index in range(count):
                frame_id=f"{action_id}-frame-{index+1:03d}"
                source_relative=f"assets/characters/hero/actions/{action_id}/source/{frame_id}.png"
                current_relative=f"assets/characters/hero/actions/{action_id}/current/{frame_id}.png"
                source=temp_root/f"{frame_id}-source.png"
                current=temp_root/f"{frame_id}-current.png"
                image=Image.new("RGBA",(96,128),(0,0,0,0));draw=ImageDraw.Draw(image)
                rise=(index if action_id=="jump" else index%2)*6
                draw.ellipse((33,12-rise,63,42-rise),fill=color)
                draw.polygon(((22,58-rise),(48,43-rise),(74,58-rise),(67,91-rise),(29,91-rise)),fill=color)
                draw.line((36,86-rise,22+index*4,118-rise),fill=(53,68,59,255),width=10)
                draw.line((60,86-rise,76-index*3,118-rise),fill=(53,68,59,255),width=10)
                image.save(source);image.save(current)
                asset_sources[source_relative]=source;asset_sources[current_relative]=current
                duration=None if action_id=="run" else ({"numerator":1,"denominator":5} if index<2 else {"numerator":2,"denominator":5})
                frames.append({"id":frame_id,"revision":1,"enabled":True,"duration":duration,
                    "assets":{"source":source_relative,"mattingBase":None,"current":current_relative},
                    "source":{"sourceFrameId":frame_id,"sourceFrameIndex":index,
                              "sourceTimeSeconds":None,"sourcePts":None}})
            events=[{"id":f"{action_id}-event","frameId":frames[1]["id"],
                     "type":"footstep" if action_id=="run" else "land",
                     "parameters":{"action":action_id}}]
            actions.append({"id":action_id,"name":name,"revision":1,"loop":loop,
                "playback":playback,
                "transform":{"offset":{"x":0,"y":-6 if action_id=="jump" else 0},
                             "scale":{"x":1.05 if action_id=="jump" else 1,
                                      "y":1.05 if action_id=="jump" else 1},"rotationDegrees":0},
                "anchor":{"frameId":frames[0]["id"],"x":0.5,"y":0.92},
                "source":{"kind":"image-sequence","sequenceId":f"{action_id}-sequence","declaredFps":10},
                "frames":frames,"events":events})
        project=CharacterProject.model_validate({
            "formatVersion":2,"kind":"action-forge-project","id":project_id,
            "name":"R5 JavaScript运行验收","revision":0,"characters":[{
                "id":"hero","name":"英雄","revision":0,"referenceImage":None,
                "canvas":{"width":256,"height":256},"origin":{"x":128,"y":224},
                "baseline":{"actionId":"run","frameId":"run-frame-001"},
                "scale":{"x":1,"y":1},"actions":actions}],"migrations":[]})
        created=app.state.projects.create(project,asset_sources)
    return {"projectId":created.id,"frameCount":sum(len(item.frames) for item in created.characters[0].actions),
            "formatVersion":created.formatVersion}

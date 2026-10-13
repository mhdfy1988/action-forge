"""工作流PNG适配、旧核心复用、恢复精修和有界失败契约。"""
import hashlib
import io
import time
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app.main import create_app
from test_batch_matting import FakeRunner


def png(alpha=255, size=(32, 24)):
    image=Image.new('RGBA',size,(30,140,50,alpha)); output=io.BytesIO(); image.save(output,format='PNG'); return output.getvalue()


def metadata(data, cached=False, revision=0):
    return {'name':'跑步','width':32,'height':24,'policy':'model-local-despill-v1','frames':[{'id':'a'*32+'-000001','sourceIndex':5,'sourceTimeSeconds':'1/2','durationSeconds':'1/12','contentHash':hashlib.sha256(data).hexdigest(),'cached':cached,'revision':revision}]}


def upload(client, spec, data, auto=None, current=None):
    response=client.post('/api/workflow-matting/jobs',json=spec);assert response.status_code==200,response.text
    token=response.json()['id'];base='/api/workflow-matting/jobs/'+token
    for variant,body in [('source',data),*([('auto',auto),('current',current)] if auto else [])]:
        response=client.put(base+'/upload/0/'+variant,content=body,headers={'content-type':'image/png'});assert response.status_code==200,response.text
    return base


def finish(client,base):
    response=client.post(base+'/run');assert response.status_code==200,response.text
    for _ in range(100):
        state=client.get(base).json()
        if state['status'] not in ('running','cancelling'):return state
        time.sleep(.03)
    raise AssertionError('未完成')


def test_workflow_pixels_repair_and_restore(tmp_path):
    source=png();spec=metadata(source);frame=spec['frames'][0]['id']
    with TestClient(create_app(tmp_path/'cache')) as client:
        client.app.state.workflow_matting.batches.model_factory=FakeRunner
        base=upload(client,spec,source);state=finish(client,base)
        assert state['status']=='done' and state['completed']==1
        auto=client.get(base+'/frames/'+frame+'/auto').content
        with Image.open(io.BytesIO(auto)) as image:
            assert image.mode=='RGBA' and image.getchannel('A').getextrema()==(180,180)
        current=png(0)
        saved=client.put(base+'/frames/'+frame+'?revision=0',content=current,headers={'content-type':'image/png'})
        assert saved.status_code==200 and saved.json()['revision']==1
        assert client.put(base+'/frames/'+frame+'?revision=0',content=current,headers={'content-type':'image/png'}).status_code==400
        assert client.get(base+'/frames/'+frame+'/source').content==source
        assert client.get(base+'/frames/'+frame+'/auto').content==auto
        assert client.app.state.store.batches.items=={} and client.app.state.workflow_extraction.batches.items=={}
    # 服务重启后以本机三份PNG恢复，不能重新调用模型覆盖精修。
    with TestClient(create_app(tmp_path/'cache')) as client:
        def forbidden():raise AssertionError('恢复不应调用模型')
        client.app.state.workflow_matting.batches.model_factory=forbidden
        base=upload(client,metadata(source,True,1),source,auto,current)
        assert finish(client,base)['status']=='done'
        assert client.get(base+'/frames/'+frame+'/current').content==current
        assert client.get(base+'/frames/'+frame+'/auto').content==auto


def test_invalid_upload_cancel_and_failure(tmp_path):
    source=png();spec=metadata(source)
    with TestClient(create_app(tmp_path/'cache')) as client:
        assert client.post('/api/workflow-matting/jobs',json={**spec,'frames':spec['frames']*2}).status_code==422
        response=client.post('/api/workflow-matting/jobs',json=spec);base='/api/workflow-matting/jobs/'+response.json()['id']
        assert client.post(base+'/run').status_code==400
        assert client.put(base+'/upload/0/source',content=png(size=(3,3)),headers={'content-type':'image/png'}).status_code==400
        assert client.put(base+'/upload/0/source',content=png(120),headers={'content-type':'image/png'}).status_code==400
        assert client.post(base+'/cancel').json()['status']=='cancelled'
        assert client.app.state.workflow_matting.busy is None
        client.app.state.workflow_matting.batches.model_factory=lambda:FakeRunner(fail=True)
        base=upload(client,spec,source);state=finish(client,base)
        assert state['status']=='failed' and state['sequence'] is None and state['failedFrameId']==spec['frames'][0]['id']
        assert client.get(base+'/frames/'+spec['frames'][0]['id']+'/current').status_code==400


def test_supplement_keeps_manual_pixels_and_only_calls_model_for_new_frame(tmp_path):
    source=png();auto=png(180);current=png(64);spec=metadata(source,True,3)
    spec['frames'].append({**spec['frames'][0],'id':'a'*32+'-000002','sourceIndex':6,'cached':False,'revision':0})
    calls=[]
    class CountRunner(FakeRunner):
        def cutout(self,source,target,batch):
            calls.append(source);return super().cutout(source,target,batch)
    with TestClient(create_app(tmp_path/'cache')) as client:
        client.app.state.workflow_matting.batches.model_factory=CountRunner
        base=upload(client,spec,source,auto,current)
        assert client.put(base+'/upload/1/source',content=source,headers={'content-type':'image/png'}).status_code==200
        state=finish(client,base)
        assert state['status']=='done' and len(calls)==1
        assert state['revisions'][spec['frames'][0]['id']]==3
        assert client.get(base+'/frames/'+spec['frames'][0]['id']+'/current').content==current


@pytest.mark.skipif(os.environ.get('FRAMES_REAL_MATTING') != '1', reason='真实模型需显式启用')
def test_workflow_real_model_cpu(tmp_path):
    assert os.environ.get('FRAMES_MATTING_CPU_ONLY') == '1'
    sample=Path(os.environ['FRAMES_MATTING_SAMPLE'])
    source=sample.read_bytes()
    with Image.open(io.BytesIO(source)) as image:
        width,height=image.size
    spec=metadata(source);spec.update(width=width,height=height)
    with TestClient(create_app(tmp_path/'cache')) as client:
        base=upload(client,spec,source)
        assert client.post(base+'/run').status_code==200
        for _ in range(360):
            state=client.get(base).json()
            if state['status'] not in ('running','cancelling'):break
            time.sleep(.5)
        assert state['status']=='done',state
        output=client.get(base+'/frames/'+spec['frames'][0]['id']+'/current').content
        with Image.open(io.BytesIO(output)) as image:
            image.load()
            assert image.mode=='RGBA' and image.size==(width,height)
            low,high=image.getchannel('A').getextrema()
            assert low==0 and high==255
            histogram=image.getchannel('A').histogram()
            assert image.getpixel((0,0))[3]==0
            assert histogram[0] > width*height*.5 and histogram[255] > width*height*.05
        # 输出只保存验收副本，不修改用户源素材。
        destination=Path('output/acceptance/workflow-matting-real.png')
        destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(output)

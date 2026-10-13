import io
import time
from urllib.parse import quote
from fastapi.testclient import TestClient
from PIL import Image
from app.main import create_app


def test_workflow_api_real_frames_and_old_store_isolation(fixtures, tmp_path):
    with TestClient(create_app(tmp_path / 'cache')) as client:
        response = client.post('/api/workflow-extraction/videos', content=fixtures['cfr'].read_bytes(), headers={'x-file-name': quote('动作.mp4')})
        assert response.status_code == 200, response.text
        video = response.json()
        assert 'url' not in video
        assert client.app.state.store.assets == {}
        assert client.post('/api/jobs', json={'videoId': video['id'], 'start': 0, 'end': 1, 'fps': 12}).status_code == 404
        assert client.post('/api/workflow-extraction/jobs', json={'videoId': video['id'], 'start': 2, 'end': 1, 'fps': 12}).status_code == 400
        response = client.post('/api/workflow-extraction/jobs', json={'videoId': video['id'], 'start': .25, 'end': 1.25, 'fps': 12})
        assert response.status_code == 200, response.text
        token = response.json()['id']
        for _ in range(300):
            job = client.get(f'/api/workflow-extraction/jobs/{token}').json()
            if job['status'] in {'done', 'failed', 'cancelled'}:
                break
            time.sleep(.02)
        assert job['status'] == 'done', job
        assert 'downloadUrl' not in job
        assert len(job['sequence']['frames']) == 12
        assert job['sequence']['frames'][0]['sourceTimeSeconds'] == '1/4'
        assert isinstance(job['sequence']['frames'][0]['sourcePts'], int)
        response = client.get(f'/api/workflow-extraction/jobs/{token}/frames/1')
        assert response.status_code == 200
        with Image.open(io.BytesIO(response.content)) as image:
            image.load()
            assert image.size == (job['sequence']['canvas']['width'], job['sequence']['canvas']['height'])
            assert image.mode == 'RGB'
        assert client.get(f'/api/workflow-extraction/jobs/{token}/frames/0').status_code == 400
        assert client.get(f'/api/jobs/{token}').status_code == 404


def test_workflow_cancel_isolated(fixtures, tmp_path):
    with TestClient(create_app(tmp_path / 'cache')) as client:
        video = client.post('/api/workflow-extraction/videos', content=fixtures['cfr'].read_bytes(), headers={'x-file-name': 'cancel.mp4'}).json()
        job = client.post('/api/workflow-extraction/jobs', json={'videoId': video['id'], 'start': 0, 'end': video['duration'], 'fps': 60}).json()
        response = client.post(f"/api/workflow-extraction/jobs/{job['id']}/cancel")
        assert response.status_code == 200
        assert response.json()['status'] in {'done', 'cancelling', 'cancelled'}
        assert client.app.state.store.busy is None

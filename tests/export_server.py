"""仅独立8898导出链路验收；合成处理器不是模型质量验收。"""
from app.batch_matting import BatchManager
from test_export_frames import Shapes
original=BatchManager.__init__
def init(self,store,model_factory=None):
    original(self,store,Shapes)
BatchManager.__init__=init
from app.main import app

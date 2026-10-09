from pathlib import Path
from model_config import resolve_model_runtime


def test_explicit_model_root_and_python(tmp_path):
    source = tmp_path / 'model'
    python = tmp_path / 'environment' / 'python.exe'
    config = resolve_model_runtime({'FRAMES_MATTING_ROOT':str(source), 'FRAMES_MODEL_PYTHON':str(python)})
    assert config.root == source.resolve()
    assert config.python == python.resolve()


def test_root_only_and_default_are_directory_independent(tmp_path):
    config = resolve_model_runtime({'FRAMES_MATTING_ROOT':str(tmp_path)})
    assert config.python == (tmp_path / '.venv' / 'Scripts' / 'python.exe').resolve()
    default = resolve_model_runtime({})
    assert default.root == Path(__file__).resolve().parents[2] / 'game-art-matting'

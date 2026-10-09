"""R0 项目清单协议回归；不触碰现有单动作服务。"""

from pathlib import Path

import pytest
from pydantic import ValidationError
from PIL import Image

from app.character_project_schema import CharacterProject, validate_project_assets


EXAMPLES = Path(__file__).resolve().parents[1] / "docs" / "examples"


def valid_project() -> CharacterProject:
    return CharacterProject.model_validate_json(
        (EXAMPLES / "character-asset-v1.valid.json").read_text(encoding="utf-8")
    )


def test_valid_two_action_project_round_trips():
    project = valid_project()
    assert [action.id for action in project.characters[0].actions] == ["run", "jump"]
    assert CharacterProject.model_validate_json(project.model_dump_json()) == project


@pytest.mark.parametrize("filename, reason", [
    ("character-asset-v1.invalid-duplicate-action.json", "动作ID重复"),
    ("character-asset-v1.invalid-parent-path.json", "相对路径包含绝对路径或非法段"),
])
def test_invalid_examples_fail(filename, reason):
    with pytest.raises(ValidationError, match=reason):
        CharacterProject.model_validate_json((EXAMPLES / filename).read_text(encoding="utf-8"))


def test_unknown_version_and_fields_fail():
    data = valid_project().model_dump()
    data["formatVersion"] = 2
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)
    data["formatVersion"] = 1
    data["surprise"] = True
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)


def test_unconfirmed_baseline_is_editable_but_half_baseline_fails():
    data = valid_project().model_dump()
    data["characters"][0]["referenceImage"] = None
    data["characters"][0]["canvas"] = None
    data["characters"][0]["origin"] = None
    assert CharacterProject.model_validate(data).characters[0].origin is None
    data["characters"][0]["canvas"] = {"width": 256, "height": 256}
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)


def test_cross_character_action_directory_and_disabled_event_fail():
    data = valid_project().model_dump()
    data["characters"][0]["actions"][0]["frames"][0]["assets"]["source"] = (
        "assets/characters/other/actions/run/source/frame.png"
    )
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)


def test_missing_and_escaped_assets_fail(tmp_path):
    project = valid_project()
    with pytest.raises(ValueError, match="缺失"):
        validate_project_assets(project, tmp_path)
    paths = set()
    for character in project.characters:
        paths.add((character.referenceImage, False))
        for action in character.actions:
            for frame in action.frames:
                paths.update(((frame.assets.source, False),
                              (frame.assets.mattingBase, True),
                              (frame.assets.current, True)))
    for relative, alpha in paths:
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGBA" if alpha else "RGB", (2, 2)).save(target)
    video = tmp_path / project.characters[0].actions[0].source.video
    video.parent.mkdir(parents=True, exist_ok=True)
    video.write_bytes(b"video-placeholder")
    validate_project_assets(project, tmp_path)
    data = valid_project().model_dump()
    data["characters"][0]["actions"][0]["frames"][1]["enabled"] = False
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)

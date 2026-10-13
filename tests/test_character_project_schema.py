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
    data["formatVersion"] = 3
    with pytest.raises(ValidationError):
        CharacterProject.model_validate(data)


def test_v1_cannot_claim_v2_playback_fields():
    data = valid_project().model_dump()
    action = data["characters"][0]["actions"][0]
    data["formatVersion"] = 1
    action["playback"] = {"mode": "per-frame"}
    for frame in action["frames"]:
        frame["duration"] = {"numerator": 1, "denominator": 12}
    with pytest.raises(ValidationError, match="v1只支持固定帧率"):
        CharacterProject.model_validate(data)


def test_v2_per_frame_durations_are_required_positive_and_canonical():
    data = valid_project().model_dump()
    data["formatVersion"] = 2
    action = data["characters"][0]["actions"][0]
    action["playback"] = {"mode": "per-frame"}
    for frame in action["frames"]:
        frame["duration"] = {"numerator": 1, "denominator": 12}
    CharacterProject.model_validate(data)
    del action["frames"][0]["duration"]
    with pytest.raises(ValidationError, match="每个启用帧都必须设置时长"):
        CharacterProject.model_validate(data)


def test_constant_fps_cannot_mix_per_frame_duration():
    data = valid_project().model_dump()
    data["formatVersion"] = 2
    data["characters"][0]["actions"][0]["frames"][0]["duration"] = {
        "numerator": 1, "denominator": 12,
    }
    with pytest.raises(ValidationError, match="固定帧率模式不能保存逐帧时长"):
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


def test_baseline_anchor_and_canvas_are_validated_and_round_trip():
    data = valid_project().model_dump()
    character = data["characters"][0]
    run = next(action for action in character["actions"] if action["id"] == "run")
    frame_id = run["frames"][0]["id"]
    character["canvas"] = {"width": 512, "height": 512}
    character["origin"] = {"x": 256, "y": 440}
    character["baseline"] = {"actionId": "run", "frameId": frame_id}
    run["anchor"] = {"frameId": frame_id, "x": 0.5, "y": 0.9}
    project = CharacterProject.model_validate(data)
    restored = CharacterProject.model_validate_json(project.model_dump_json())
    assert restored.characters[0].baseline.frameId == frame_id
    assert restored.characters[0].actions[0].anchor.y == 0.9


@pytest.mark.parametrize("change", ["unknown-action", "unknown-frame", "disabled-frame", "anchor-range"])
def test_invalid_baseline_and_anchor_references_fail(change):
    data = valid_project().model_dump()
    character = data["characters"][0]
    run = next(action for action in character["actions"] if action["id"] == "run")
    frame_id = run["frames"][0]["id"]
    character["canvas"] = {"width": 512, "height": 512}
    character["origin"] = {"x": 256, "y": 440}
    character["baseline"] = {"actionId": "run", "frameId": frame_id}
    run["anchor"] = {"frameId": frame_id, "x": 0.5, "y": 0.9}
    if change == "unknown-action":
        character["baseline"]["actionId"] = "missing"
    elif change == "unknown-frame":
        character["baseline"]["frameId"] = "missing"
    elif change == "disabled-frame":
        run["frames"][0]["enabled"] = False
    else:
        run["anchor"]["x"] = 1.1
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

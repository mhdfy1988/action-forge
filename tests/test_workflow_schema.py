from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.workflow_schema import (
    NODE_REGISTRY,
    WorkflowProject,
    inspect_execution,
    write_json_schema,
    write_node_registry,
)


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "docs" / "examples" / "workflow-project-v1.valid.json"


def load_example() -> dict:
    return json.loads(EXAMPLE.read_text(encoding="utf-8"))


def node(node_id: str, node_type: str, parameters: dict | None = None) -> dict:
    return {
        "id": node_id,
        "type": node_type,
        "definitionVersion": 1,
        "position": {"x": 0.0, "y": 0.0},
        "collapsed": False,
        "parameters": parameters or {},
    }


def project(nodes: list[dict], connections: list[dict]) -> dict:
    return {
        "formatVersion": 1,
        "kind": "action-forge-workflow",
        "id": "test-workflow",
        "name": "测试工作流",
        "revision": 0,
        "viewport": {"x": 0.0, "y": 0.0, "zoom": 1.0},
        "nodes": nodes,
        "connections": connections,
        "assets": [],
        "results": [],
    }


def connection(connection_id: str, source: str, source_port: str,
               target: str, target_port: str) -> dict:
    return {
        "id": connection_id,
        "fromNode": source,
        "fromPort": source_port,
        "toNode": target,
        "toPort": target_port,
    }


def test_valid_example_round_trips_without_changes() -> None:
    raw = load_example()
    parsed = WorkflowProject.model_validate(raw)
    assert parsed.model_dump(mode="json") == raw


def test_node_display_name_is_independent_and_optional_for_old_drafts() -> None:
    raw = load_example()
    raw["nodes"][0]["name"] = "跑步角色参考"
    parsed = WorkflowProject.model_validate(raw)
    assert parsed.nodes[0].name == "跑步角色参考"
    assert parsed.nodes[0].type == raw["nodes"][0]["type"]
    del raw["nodes"][0]["name"]
    assert WorkflowProject.model_validate(raw).nodes[0].name is None
    raw["nodes"][0]["name"] = "字" * 81
    with pytest.raises(ValidationError):
        WorkflowProject.model_validate(raw)


def test_committed_json_schema_matches_runtime_model(tmp_path: Path) -> None:
    generated = tmp_path / "workflow-project-v1.schema.json"
    write_json_schema(generated)
    committed = ROOT / "docs" / "schemas" / "workflow-project-v1.schema.json"
    assert generated.read_bytes() == committed.read_bytes()

    generated_registry = tmp_path / "workflow-node-registry.json"
    write_node_registry(generated_registry)
    committed_registry = ROOT / "web" / "workflow-node-registry.json"
    assert generated_registry.read_bytes() == committed_registry.read_bytes()


def test_registry_contains_merged_node_and_explicit_legacy_nodes() -> None:
    assert set(NODE_REGISTRY) == {
        "reference-image",
        "action-video",
        "extract-frames",
        "organize-frames",
        "process-frames",
        "remove-background",
        "build-action-clip",
        "assemble-character",
        "game-preview",
        "export-game-assets",
    }
    assert {definition.executionMode for definition in NODE_REGISTRY.values()} == {
        "source", "automatic", "interactive",
    }


def test_merged_sequence_video_input_and_source_output() -> None:
    raw = project([node("video", "action-video"), node("process", "process-frames"),
                   node("matting", "remove-background")],
                  [connection("a", "video", "video", "process", "source"),
                   connection("b", "process", "frames", "matting", "frames")])
    WorkflowProject.model_validate(raw)
    raw["nodes"][-1] = node("matting", "build-action-clip")
    with pytest.raises(ValidationError, match="类型不兼容"):
        WorkflowProject.model_validate(raw)


def test_unknown_port_and_incompatible_type_are_rejected() -> None:
    unknown_port = load_example()
    unknown_port["connections"][0]["fromPort"] = "missing"
    with pytest.raises(ValidationError, match="不存在输出端口"):
        WorkflowProject.model_validate(unknown_port)

    incompatible = load_example()
    target = next(item for item in incompatible["connections"] if item["toNode"] == "extract-run-frames")
    target["fromNode"] = "reference"
    target["fromPort"] = "image"
    with pytest.raises(ValidationError, match="类型不兼容"):
        WorkflowProject.model_validate(incompatible)


def test_single_input_connection_limit_is_enforced() -> None:
    raw = project(
        [
            node("video-a", "action-video"),
            node("video-b", "action-video"),
            node("extract", "extract-frames", {
                "startSeconds": 0.0, "endSeconds": 1.0, "fps": 12,
            }),
        ],
        [
            connection("a", "video-a", "video", "extract", "video"),
            connection("b", "video-b", "video", "extract", "video"),
        ],
    )
    with pytest.raises(ValidationError, match="连接数量超过限制"):
        WorkflowProject.model_validate(raw)


def test_dependency_cycle_is_rejected() -> None:
    raw = project(
        [node("organize-a", "organize-frames"), node("organize-b", "organize-frames")],
        [
            connection("a", "organize-a", "frames", "organize-b", "frames"),
            connection("b", "organize-b", "frames", "organize-a", "frames"),
        ],
    )
    with pytest.raises(ValidationError, match="不能包含依赖环"):
        WorkflowProject.model_validate(raw)


def test_organize_node_preserves_effective_frame_type() -> None:
    nodes = [
        node("video", "action-video"),
        node("extract", "extract-frames", {
            "startSeconds": 0.0, "endSeconds": 1.0, "fps": 12,
        }),
        node("organize", "organize-frames"),
        node("clip", "build-action-clip", {"name": "run", "loop": True, "fps": 12}),
    ]
    invalid = project(nodes, [
        connection("a", "video", "video", "extract", "video"),
        connection("b", "extract", "frames", "organize", "frames"),
        connection("c", "organize", "frames", "clip", "frames"),
    ])
    with pytest.raises(ValidationError, match="类型不兼容"):
        WorkflowProject.model_validate(invalid)

    valid = copy.deepcopy(invalid)
    valid["nodes"].insert(2, node("matting", "remove-background"))
    valid["connections"] = [
        connection("a", "video", "video", "extract", "video"),
        connection("b", "extract", "frames", "matting", "frames"),
        connection("c", "matting", "frames", "organize", "frames"),
        connection("d", "organize", "frames", "clip", "frames"),
    ]
    WorkflowProject.model_validate(valid)


def test_incomplete_draft_saves_but_execution_reports_structured_issues() -> None:
    raw = project(
        [
            node("reference", "reference-image"),
            node("generate", "action-video", {"prompt": "向右跑"}),
        ],
        [connection("a", "reference", "image", "generate", "reference")],
    )
    parsed = WorkflowProject.model_validate(raw)
    inspection = inspect_execution(parsed, "generate")
    assert inspection.nodeIds == ["reference", "generate"]
    assert {(issue.nodeId, issue.code, issue.field) for issue in inspection.issues} == {
        ("reference", "waiting-source", None),
        ("generate", "waiting-source", None),
    }


def test_execution_inspection_only_contains_target_upstream_closure() -> None:
    parsed = WorkflowProject.model_validate(load_example())
    inspection = inspect_execution(parsed, "export-character")
    assert inspection.nodeIds == [
        "reference",
        "generate-run-video",
        "extract-run-frames",
        "organize-run-frames",
        "remove-run-background",
        "build-run-clip",
        "assemble-character",
        "export-character",
    ]
    assert "preview-character" not in inspection.nodeIds
    assert {(issue.nodeId, issue.code) for issue in inspection.issues} >= {
        ("reference", "waiting-source"),
        ("generate-run-video", "waiting-source"),
        ("organize-run-frames", "waiting-interactive"),
        ("build-run-clip", "waiting-interactive"),
        ("assemble-character", "waiting-interactive"),
    }


def test_confirmed_result_must_reference_matching_asset_revision() -> None:
    raw = project([node("reference", "reference-image")], [])
    raw["assets"] = [{
        "id": "reference-asset",
        "type": "reference-image",
        "revision": 0,
        "path": "assets/reference/0000.png",
        "contentHash": "0" * 64,
    }]
    raw["results"] = [{
        "nodeId": "reference",
        "definitionVersion": 1,
        "resultSignature": "1" * 64,
        "confirmed": True,
        "outputs": [{
            "port": "image",
            "asset": {"id": "reference-asset", "revision": 0},
        }],
    }]
    parsed = WorkflowProject.model_validate(raw)
    assert inspect_execution(parsed, "reference").issues == []

    missing_output = copy.deepcopy(raw)
    missing_output["results"][0]["outputs"] = []
    with pytest.raises(ValidationError, match="确认结果缺少必填输出端口"):
        WorkflowProject.model_validate(missing_output)

    wrong_type = copy.deepcopy(raw)
    wrong_type["assets"][0]["type"] = "action-video"
    with pytest.raises(ValidationError, match="输出资产类型与端口不兼容"):
        WorkflowProject.model_validate(wrong_type)

    missing_asset = copy.deepcopy(raw)
    missing_asset["results"][0]["outputs"][0]["asset"]["id"] = "missing"
    with pytest.raises(ValidationError, match="不存在的资产修订"):
        WorkflowProject.model_validate(missing_asset)


def test_definition_parameters_and_asset_paths_are_strict() -> None:
    wrong_version = load_example()
    wrong_version["nodes"][0]["definitionVersion"] = 2
    with pytest.raises(ValidationError, match="定义版本2不受支持"):
        WorkflowProject.model_validate(wrong_version)

    invalid_parameters = load_example()
    invalid_parameters["nodes"][2]["parameters"]["fps"] = 0
    with pytest.raises(ValidationError, match="参数无效"):
        WorkflowProject.model_validate(invalid_parameters)

    invalid_path = project([node("reference", "reference-image")], [])
    invalid_path["assets"] = [{
        "id": "asset",
        "type": "reference-image",
        "revision": 0,
        "path": "../outside.png",
        "contentHash": "0" * 64,
    }]
    with pytest.raises(ValidationError, match="绝对路径或非法段"):
        WorkflowProject.model_validate(invalid_path)

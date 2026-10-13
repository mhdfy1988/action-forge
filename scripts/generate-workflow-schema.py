"""生成R6工作流项目JSON Schema。"""

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.workflow_schema import write_json_schema, write_node_registry


if __name__ == "__main__":
    write_json_schema(ROOT / "docs" / "schemas" / "workflow-project-v1.schema.json")
    write_node_registry(ROOT / "web" / "workflow-node-registry.json")

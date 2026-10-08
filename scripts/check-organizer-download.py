"""重读真实Chrome下载，对照M1原ZIP，不以API成功当作整理正确。"""
import hashlib
import json
import zipfile
from fractions import Fraction
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "output" / "acceptance"
expected = json.loads((root / "organized-order.json").read_text(encoding="utf-8"))
with zipfile.ZipFile(root / "organizer-source.zip") as source, zipfile.ZipFile(root / "organized-frames.zip") as packed:
    original = json.loads(source.read("frame-sequence.json"))
    current = json.loads(packed.read("frame-sequence.json"))
    assert original["formatVersion"] == 2 and current["formatVersion"] == 3
    assert "extraction" not in current
    assert current["originalExtraction"] == original["extraction"]
    assert current["source"] == original["source"]
    assert current["canvas"] == original["canvas"]
    assert [frame["id"] for frame in current["frames"]] == expected
    assert len(packed.namelist()) == len(expected)+1
    assert packed.testzip() is None
    by_id = {frame["id"]:frame for frame in original["frames"]}
    elapsed = Fraction(0)
    for frame in current["frames"]:
        reference = by_id[frame["id"]]
        assert Fraction(frame["sequenceTimeSeconds"]) == elapsed
        elapsed += Fraction(reference["durationSeconds"])
        for key in ("durationSeconds","sourcePts","sourceFrameIndex","sourceTimeSeconds","sampleTimeSeconds"):
            assert frame[key] == reference[key]
        assert hashlib.sha256(packed.read(frame["image"])).digest() == hashlib.sha256(source.read(reference["image"])).digest()
    assert Fraction(current["durationSeconds"]) == elapsed == Fraction(5,6)
    report = {"status":"passed","frames":len(expected),"durationSeconds":current["durationSeconds"],
              "images":"all retained PNG bytes identical to M1 ZIP","identityOrder":"exact","sourceTime":"unchanged"}
    print(json.dumps(report,ensure_ascii=False))
    (root / "organizer-download-check.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")

"""把多个动作 GLB 合并成一条连续动作（同骨架、按名称对齐）。

用法：python scripts/merge-actions.py 输出名.glb 片段1.glb 片段2.glb ...
"""
import json
import struct
import sys

FLOAT = 5126
TYPE_SIZE = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def parse_glb(path):
    data = open(path, "rb").read()
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67
    offset, gltf, binary = 12, None, b""
    while offset < length:
        clen, ctype = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8: offset + 8 + clen]
        if ctype == 0x4E4F534A:
            gltf = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:
            binary = chunk
        offset += 8 + clen
    return gltf, binary


def read_accessor(gltf, binary, index):
    acc = gltf["accessors"][index]
    bv = gltf["bufferViews"][acc["bufferView"]]
    comps = TYPE_SIZE[acc["type"]]
    start = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = bv.get("byteStride") or comps * 4
    out = []
    for i in range(acc["count"]):
        vals = struct.unpack_from("<" + "f" * comps, binary, start + i * stride)
        out.append(list(vals))
    return out


def pack(values):
    flat = [v for row in values for v in row]
    return struct.pack("<" + "f" * len(flat), *flat)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(1)
    out_name, clips = sys.argv[1], sys.argv[2:]

    parsed = [(clip, *parse_glb(clip)) for clip in clips]
    # 以节点最多的文件为基底（跳跃落地是 52 关节，其余是 22 关节）
    base_clip, base_gltf, base_bin = max(parsed, key=lambda item: len(item[1].get("nodes", [])))
    print("base:", base_clip, "nodes:", len(base_gltf.get("nodes", [])))
    node_index = {}
    for i, node in enumerate(base_gltf.get("nodes", [])):
        node_index.setdefault(node.get("name", ""), i)

    merged = {}          # (node, path) -> {"times": [...], "values": [...], "interp": str}
    offset = 0.0
    for clip, gltf, binary in parsed:
        anim = gltf["animations"][0]
        clip_duration = 0.0
        for channel in anim["channels"]:
            target = channel["target"]
            path = target["path"]
            node_name = gltf["nodes"][target["node"]].get("name", "")
            if node_name not in node_index:
                continue
            sampler = anim["samplers"][channel["sampler"]]
            times = [t[0] for t in read_accessor(gltf, binary, sampler["input"])]
            values = read_accessor(gltf, binary, sampler["output"])
            clip_duration = max(clip_duration, times[-1] if times else 0)
            key = (node_name, path)
            entry = merged.setdefault(key, {"times": [], "values": [], "interp": sampler.get("interpolation", "LINEAR")})
            entry["times"].extend([t + offset for t in times])
            entry["values"].extend(values)
        offset += clip_duration + 0.02   # 片段间留 1 帧左右的缝

    # 原地化：Hips 的 X/Z 固定为首帧
    hips = merged.get(("mixamorig:Hips", "translation"))
    if hips and hips["values"]:
        x0, _, z0 = hips["values"][0]
        for v in hips["values"]:
            v[0], v[2] = x0, z0

    # 追加 accessor / bufferView
    binary = bytearray(base_bin)
    while len(binary) % 4:
        binary.append(0)

    def add_accessor(values, type_name, comps):
        nonlocal binary
        data = pack(values)
        view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
        base_gltf["bufferViews"].append(view)
        acc = {
            "bufferView": len(base_gltf["bufferViews"]) - 1,
            "componentType": FLOAT,
            "count": len(values),
            "type": type_name,
        }
        if type_name == "SCALAR":
            flat = [v[0] for v in values]
            acc["min"] = [min(flat)]
            acc["max"] = [max(flat)]
        base_gltf["accessors"].append(acc)
        binary.extend(data)
        while len(binary) % 4:
            binary.append(0)
        return len(base_gltf["accessors"]) - 1

    channels, samplers = [], []
    for (node_name, path), entry in merged.items():
        times = [[t] for t in entry["times"]]
        time_acc = add_accessor(times, "SCALAR", 1)
        comps = len(entry["values"][0])
        type_name = {3: "VEC3", 4: "VEC4"}[comps]
        value_acc = add_accessor(entry["values"], type_name, comps)
        samplers.append({"input": time_acc, "output": value_acc, "interpolation": entry["interp"]})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": node_index[node_name], "path": path}})

    base_gltf["animations"] = [{"name": "combo", "channels": channels, "samplers": samplers}]
    base_gltf["buffers"] = [{"byteLength": len(binary)}]

    json_bytes = json.dumps(base_gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    out += struct.pack("<II", len(binary), 0x004E4942) + bytes(binary)
    open(out_name, "wb").write(out)
    print(f"{out_name}: {round(offset, 2)}s, {len(channels)} channels")


if __name__ == "__main__":
    main()

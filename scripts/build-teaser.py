"""把静帧渲染成 30 秒宣传片（无音轨），Ken Burns + 交叉溶解。
用 dsh 自带 Python（含 numpy / Pillow），ffmpeg 用 imageio-ffmpeg 的二进制。
"""
import math
import subprocess
from pathlib import Path

from PIL import Image

FFMPEG = r"C:\Users\Roy\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
ROOT = Path("report/video")
STILLS = ROOT / "stills"
W, H, FPS, DUR = 1920, 1080, 30, 30.0

SEGMENTS = [
    ("00-title.png", 0.0, 4.0, 1.00, 1.04),
    ("01-original.png", 4.0, 10.0, 1.02, 1.08),
    ("02-ceramic.png", 10.0, 16.0, 1.08, 1.02),
    ("03-ai-metal.png", 16.0, 22.0, 1.02, 1.08),
    ("05-side.png", 22.0, 26.0, 1.04, 1.10),
    ("00-title.png", 26.0, 30.0, 1.04, 1.00),
]
FADE = 0.8


def cover(img: Image.Image) -> Image.Image:
    """按宽度铺满、上下留黑边，保留完整 UI。"""
    iw, ih = img.size
    scale = W / iw
    fitted = img.resize((W, max(1, int(ih * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), (7, 3, 2))
    canvas.paste(fitted, (0, (H - fitted.size[1]) // 2))
    return canvas


def frame_at(img: Image.Image, p: float, z0: float, z1: float) -> Image.Image:
    base = cover(img)
    z = z0 + (z1 - z0) * p
    sw, sh = int(W * z), int(H * z)
    scaled = base.resize((sw, sh), Image.LANCZOS)
    left = (sw - W) // 2
    top = (sh - H) // 2
    return scaled.crop((left, top, left + W, top + H))


def main() -> None:
    images = {}
    for name, *_ in SEGMENTS:
        images[name] = Image.open(STILLS / name).convert("RGB")

    total = int(FPS * DUR)
    silent = ROOT / "teaser-silent.mp4"
    cmd = [
        FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", str(silent),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for i in range(total):
        t = i / FPS
        layers = []
        for name, start, end, z0, z1 in SEGMENTS:
            if start - FADE <= t < end:
                p = min(1.0, max(0.0, (t - start) / (end - start)))
                img = frame_at(images[name], p, z0, z1)
                if t < start:
                    alpha = 0.0
                elif t > end - FADE:
                    alpha = max(0.0, (end - t) / FADE)
                else:
                    alpha = 1.0
                layers.append((img, alpha))

        if not layers:
            frame = Image.new("RGB", (W, H), (8, 3, 2))
        elif len(layers) == 1:
            frame = layers[0][0]
        else:
            base = layers[0][0]
            top = layers[1][0]
            a = layers[1][1]
            frame = Image.blend(base, top, a)

        proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    proc.wait()
    print("silent video:", silent, silent.stat().st_size)


if __name__ == "__main__":
    main()

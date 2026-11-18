"""把静帧渲染成 21 秒 demo（无音轨）。"""
import subprocess
from pathlib import Path

from PIL import Image

FFMPEG = r"C:\Users\Roy\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
ROOT = Path("report/demo20")
W, H, FPS, DUR = 1920, 1080, 30, 21.0

SEGMENTS = [
    ("00-title.png", 0.0, 2.5, 1.00, 1.03),
    ("01-clay.png", 2.5, 7.0, 1.02, 1.07),
    ("02-metal.png", 7.0, 11.5, 1.07, 1.02),
    ("03-street.png", 11.5, 16.0, 1.02, 1.06),
    ("04-pano.png", 16.0, 19.0, 1.06, 1.02),
    ("05-end.png", 19.0, 21.0, 1.03, 1.00),
]
FADE = 0.6


def cover(img):
    iw, ih = img.size
    scale = W / iw
    fitted = img.resize((W, max(1, int(ih * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), (7, 3, 2))
    canvas.paste(fitted, (0, (H - fitted.size[1]) // 2))
    return canvas


def frame_at(img, p, z0, z1):
    base = cover(img)
    z = z0 + (z1 - z0) * p
    sw, sh = int(W * z), int(H * z)
    scaled = base.resize((sw, sh), Image.LANCZOS)
    left, top = (sw - W) // 2, (sh - H) // 2
    return scaled.crop((left, top, left + W, top + H))


def main():
    images = {name: Image.open(ROOT / name).convert("RGB") for name, *_ in SEGMENTS}
    total = int(FPS * DUR)
    out = ROOT / "demo20-silent.mp4"
    cmd = [FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-pix_fmt", "yuv420p", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for i in range(total):
        t = i / FPS
        layers = []
        for name, start, end, z0, z1 in SEGMENTS:
            if start - FADE <= t < end:
                p = min(1.0, max(0.0, (t - start) / (end - start)))
                img = frame_at(images[name], p, z0, z1)
                alpha = 0.0 if t < start else (max(0.0, (end - t) / FADE) if t > end - FADE else 1.0)
                layers.append((img, alpha))
        if not layers:
            frame = Image.new("RGB", (W, H), (8, 3, 2))
        elif len(layers) == 1:
            frame = layers[0][0]
        else:
            frame = Image.blend(layers[0][0], layers[1][0], layers[1][1])
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    proc.wait()
    print("silent:", out, round(out.stat().st_size / 1024 / 1024, 1), "MB")


if __name__ == "__main__":
    main()

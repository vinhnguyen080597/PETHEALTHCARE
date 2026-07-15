"""VoiceLab - a small local web app around OmniVoice.

Pure-Python FastAPI backend: loads the OmniVoice model once, exposes a REST API
for text-to-speech / voice design / voice cloning, and serves a static frontend.
No Node, no Electron, no license server -- meant to run locally for personal use.

Run (this machine -- keep runtime artifacts off the small C: drive):
    set VOICELAB_DATA=D:\\omnivoice\\rundata
    D:\\omnivoice\\.venv\\Scripts\\python.exe server.py --port 8850
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
import uuid
from pathlib import Path

# Model weights live next to the venv; keep everything self-contained on D:.
MODEL_PATH = os.environ.get("VOICELAB_MODEL", r"D:\omnivoice\model")
# Avoid the flaky HF Xet backend (see setup notes) for any incidental fetch.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
# Runtime data (voices/history/generated audio/clone prompts) can live outside
# the source tree via VOICELAB_DATA -- handy when the code is committed to a git
# repo on a small disk but the heavy artifacts belong on another drive.
DATA_ROOT = Path(os.environ.get("VOICELAB_DATA", str(APP_DIR)))
DATA_DIR = DATA_ROOT / "data"
OUTPUTS_DIR = DATA_ROOT / "outputs"
REFS_DIR = DATA_ROOT / "refs"          # uploaded reference audio clips
PROMPTS_DIR = DATA_ROOT / "prompts"    # saved VoiceClonePrompt .pt files
for d in (DATA_DIR, OUTPUTS_DIR, REFS_DIR, PROMPTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

VOICES_PATH = DATA_DIR / "voices.json"
HISTORY_PATH = DATA_DIR / "history.json"

import numpy as np
import soundfile as sf
import torch
import uvicorn
from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from omnivoice import OmniVoice

# --- global model state -----------------------------------------------------
# Generation is not thread-safe and is CPU-heavy; serialize every call behind
# one lock so concurrent browser requests can't corrupt or thrash the model.
_model: OmniVoice | None = None
_sampling_rate: int = 24000
_gen_lock = threading.Lock()
_clone_prompts: dict[str, object] = {}  # voiceId -> loaded VoiceClonePrompt

# Voice-design attribute options (mirrors omnivoice.utils.voice_design).
DESIGN_OPTIONS = {
    "gender": ["male", "female"],
    "age": ["child", "teenager", "young adult", "middle-aged", "elderly"],
    "pitch": ["very low pitch", "low pitch", "moderate pitch", "high pitch", "very high pitch"],
    "accent": [
        "american accent", "british accent", "australian accent", "indian accent",
        "canadian accent", "japanese accent", "korean accent", "chinese accent",
        "russian accent", "portuguese accent",
    ],
}
LANGUAGES = {
    "": "Auto (tự nhận)",
    "Vietnamese": "Tiếng Việt",
    "English": "English",
    "Chinese": "中文",
    "Japanese": "日本語",
    "Korean": "한국어",
    "French": "Français",
}


def _read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def _write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _save_prompt(prompt, path: Path):
    # omnivoice 0.2.0's VoiceClonePrompt is a plain dataclass with no .save()
    # (that method only exists on the unreleased master branch), so persist its
    # fields ourselves as a small dict and rebuild the dataclass on load.
    torch.save(
        {
            "ref_audio_tokens": prompt.ref_audio_tokens,
            "ref_text": prompt.ref_text,
            "ref_rms": prompt.ref_rms,
        },
        str(path),
    )


def _load_prompt(path: Path):
    from omnivoice.models.omnivoice import VoiceClonePrompt

    d = torch.load(str(path), map_location="cpu", weights_only=False)
    return VoiceClonePrompt(**d)


def load_model(device: str = "cpu"):
    global _model, _sampling_rate
    if _model is not None:
        return
    print(f"[VoiceLab] Loading OmniVoice from {MODEL_PATH} on {device} ...", flush=True)
    t0 = time.time()
    # float16 matmul is unsupported on CPU in PyTorch, so use float32 there;
    # keep float16 for CUDA where it is both supported and much faster.
    dtype = torch.float16 if device.startswith("cuda") else torch.float32
    _model = OmniVoice.from_pretrained(
        MODEL_PATH,
        device_map=device,
        dtype=dtype,
        load_asr=False,  # ASR (Whisper) only needed to auto-transcribe ref audio
    )
    _sampling_rate = int(getattr(_model, "sampling_rate", 24000))
    # Restore any previously saved clone prompts into memory.
    for v in _read_json(VOICES_PATH, []):
        pt = PROMPTS_DIR / f"{v['id']}.pt"
        if v.get("type") == "cloned" and pt.exists():
            try:
                _clone_prompts[v["id"]] = _load_prompt(pt)
            except Exception as e:  # noqa: BLE001
                print(f"[VoiceLab] Could not restore clone prompt {v['id']}: {e}", flush=True)
    print(f"[VoiceLab] Model ready in {time.time() - t0:.1f}s (sr={_sampling_rate}).", flush=True)


def _run_generate(**kwargs) -> np.ndarray:
    """Serialized, blocking call into the model. Returns a 1-D float32 waveform."""
    with _gen_lock:
        audios = _model.generate(**kwargs)
    return audios[0]


# --- FastAPI app ------------------------------------------------------------
app = FastAPI(title="VoiceLab")


class TTSRequest(BaseModel):
    text: str
    language: str = "Vietnamese"
    mode: str = "auto"           # "auto" | "design" | "clone"
    instruct: str | None = None  # for design mode
    voiceId: str | None = None   # for clone mode
    speed: float | None = None
    num_step: int = 32


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None, "sampling_rate": _sampling_rate}


@app.get("/api/options")
def options():
    return {
        "design": DESIGN_OPTIONS,
        "languages": LANGUAGES,
        "voices": _read_json(VOICES_PATH, []),
    }


@app.get("/api/voices")
def list_voices():
    return _read_json(VOICES_PATH, [])


@app.get("/api/history")
def list_history():
    return list(reversed(_read_json(HISTORY_PATH, [])))


def _add_history(entry: dict):
    hist = _read_json(HISTORY_PATH, [])
    hist.append(entry)
    _write_json(HISTORY_PATH, hist[-200:])


@app.post("/api/tts")
def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "Thiếu văn bản")
    if _model is None:
        raise HTTPException(503, "Model chưa nạp xong, thử lại sau giây lát")

    kwargs: dict = {"text": text, "num_step": max(4, min(64, req.num_step))}
    if req.language:
        kwargs["language"] = req.language
    if req.speed:
        kwargs["speed"] = float(req.speed)

    voice_name = "Auto"
    if req.mode == "design" and req.instruct and req.instruct.strip():
        kwargs["instruct"] = req.instruct.strip()
        voice_name = req.instruct.strip()
    elif req.mode == "clone":
        prompt = _clone_prompts.get(req.voiceId or "")
        if prompt is None:
            raise HTTPException(400, "Không tìm thấy giọng clone đã chọn")
        kwargs["voice_clone_prompt"] = prompt
        voices = {v["id"]: v for v in _read_json(VOICES_PATH, [])}
        voice_name = voices.get(req.voiceId, {}).get("name", "Clone")

    t0 = time.time()
    try:
        waveform = _run_generate(**kwargs)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Lỗi sinh giọng: {type(e).__name__}: {e}")
    elapsed = time.time() - t0

    out_id = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
    out_name = f"{out_id}.wav"
    audio_int16 = (np.clip(waveform, -1.0, 1.0) * 32767).astype(np.int16)
    sf.write(str(OUTPUTS_DIR / out_name), audio_int16, _sampling_rate, subtype="PCM_16")

    duration = round(len(waveform) / _sampling_rate, 2)
    entry = {
        "id": out_id,
        "text": text,
        "textPreview": text[:120] + ("…" if len(text) > 120 else ""),
        "mode": req.mode,
        "voiceName": voice_name,
        "language": req.language,
        "audioUrl": f"/outputs/{out_name}",
        "duration": duration,
        "genSeconds": round(elapsed, 1),
        "createdAt": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    _add_history(entry)
    return entry


@app.post("/api/clone")
async def clone(
    name: str = Form(...),
    refText: str = Form(""),
    audioFile: UploadFile = File(...),
):
    name = name.strip()
    if not name:
        raise HTTPException(400, "Thiếu tên giọng")
    if not refText.strip():
        raise HTTPException(400, "Cần nhập nội dung của audio mẫu (ref text) vì bản này chưa bật tự phiên âm")
    if _model is None:
        raise HTTPException(503, "Model chưa nạp xong, thử lại sau giây lát")

    vid = f"clone_{uuid.uuid4().hex[:10]}"
    ext = os.path.splitext(audioFile.filename or "")[1].lower() or ".wav"
    ref_path = REFS_DIR / f"{vid}{ext}"
    ref_path.write_bytes(await audioFile.read())

    try:
        with _gen_lock:
            prompt = _model.create_voice_clone_prompt(
                ref_audio=str(ref_path), ref_text=refText.strip()
            )
        _save_prompt(prompt, PROMPTS_DIR / f"{vid}.pt")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Lỗi tạo giọng clone: {type(e).__name__}: {e}")

    _clone_prompts[vid] = prompt
    voices = _read_json(VOICES_PATH, [])
    voice = {
        "id": vid,
        "name": name,
        "type": "cloned",
        "refText": refText.strip(),
        "createdAt": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    voices.append(voice)
    _write_json(VOICES_PATH, voices)
    return voice


@app.delete("/api/voices/{vid}")
def delete_voice(vid: str):
    voices = _read_json(VOICES_PATH, [])
    voices = [v for v in voices if v["id"] != vid]
    _write_json(VOICES_PATH, voices)
    _clone_prompts.pop(vid, None)
    for p in (PROMPTS_DIR / f"{vid}.pt",):
        try:
            p.unlink()
        except FileNotFoundError:
            pass
    return {"success": True}


@app.delete("/api/history/{hid}")
def delete_history(hid: str):
    hist = _read_json(HISTORY_PATH, [])
    entry = next((h for h in hist if h["id"] == hid), None)
    if entry:
        try:
            (OUTPUTS_DIR / os.path.basename(entry["audioUrl"])).unlink()
        except FileNotFoundError:
            pass
    _write_json(HISTORY_PATH, [h for h in hist if h["id"] != hid])
    return {"success": True}


@app.delete("/api/history")
def clear_history():
    for h in _read_json(HISTORY_PATH, []):
        try:
            (OUTPUTS_DIR / os.path.basename(h["audioUrl"])).unlink()
        except FileNotFoundError:
            pass
    _write_json(HISTORY_PATH, [])
    return {"success": True}


# Static files: generated audio + the SPA frontend. Mount frontend last at "/".
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


def main():
    parser = argparse.ArgumentParser(description="VoiceLab local TTS web app")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8850)
    parser.add_argument("--device", default=None, help="cpu | cuda:0 (auto if unset)")
    args = parser.parse_args()

    device = args.device or ("cuda:0" if torch.cuda.is_available() else "cpu")
    load_model(device=device)

    print(f"[VoiceLab] http://{args.host}:{args.port}", flush=True)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()

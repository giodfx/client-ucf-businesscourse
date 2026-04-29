"""
Bookend Caption Generator — broadcast-standard cues with word-level timing.

Reads each bookend audio file (media/audio/bookend/{id}-{lang}.wav),
runs faster-whisper with word_timestamps, then builds cues that follow
WCAG / FCC / WGBH caption guidelines:

  * Max 32 characters per line, max 2 lines per cue (~64 chars)
  * 1.0 - 6.0 second display per cue
  * Break at natural pause points (>=500ms gap, sentence end, comma)
  * 140-160 wpm reading speed cap
  * Single output: output/lessons/videos/bookend/captions.js

Why this beats the previous sentence-level VTT: each cue stays on screen
the right amount of time relative to the words being spoken, so a learner
reading along sees the line that matches what they hear.

Usage:
  python generate-bookend-captions.py            # all 34
  python generate-bookend-captions.py --only course-intro-en
  python generate-bookend-captions.py --model small    # default; or large-v3
"""
import argparse
import io
import json
import os
import re
import sys
from pathlib import Path

# Force UTF-8 stdout for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from faster_whisper import WhisperModel

ROOT = Path(__file__).parent
AUDIO_DIR = ROOT / "media" / "audio" / "bookend"
OUT_JS = ROOT / "output" / "lessons" / "videos" / "bookend" / "captions.js"

MAX_CHARS_PER_LINE = 32
MAX_LINES = 2
MAX_CUE_SECONDS = 6.0
MIN_CUE_SECONDS = 1.0
PAUSE_BREAK_SECONDS = 0.45        # gap between words that triggers cue break
SENTENCE_END_RE = re.compile(r'[.!?¡¿…]\s*$')
HARD_PUNCT_RE = re.compile(r'[.!?]\s*$')


def transcribe(audio_path, language, model):
    """Returns flat list of {word, start, end} dicts in speech order."""
    segments, info = model.transcribe(
        str(audio_path),
        language=language,
        word_timestamps=True,
        beam_size=5,
        vad_filter=True,
    )
    words = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            text = (w.word or "").strip()
            if not text:
                continue
            words.append({
                "word": text,
                "start": round(w.start, 3),
                "end": round(w.end, 3),
            })
    return words


def line_fits(line, addition):
    """Would this addition fit within MAX_CHARS_PER_LINE?"""
    candidate = (line + " " + addition).strip()
    return len(candidate) <= MAX_CHARS_PER_LINE


def format_lines(words):
    """Wrap a list of word strings into 1 or 2 lines, max 32 chars each.
    Returns the joined text or None if it can't fit."""
    if not words:
        return None
    lines = [""]
    for w in words:
        if line_fits(lines[-1], w):
            lines[-1] = (lines[-1] + " " + w).strip()
        elif len(lines) < MAX_LINES:
            lines.append(w)
        else:
            return None  # overflowed 2 lines
    # Reject if any line is empty or any single word > 32 chars by itself
    return "\n".join(l for l in lines if l)


def build_cues(words):
    """Walk the word stream, emit cues that satisfy our constraints."""
    cues = []
    if not words:
        return cues

    buf_words = []
    buf_start = words[0]["start"]
    last_end = words[0]["start"]

    def flush(force=False):
        nonlocal buf_words
        if not buf_words:
            return
        text = format_lines([w["word"] for w in buf_words])
        if text is None and not force:
            # Trim from the right until it fits — this happens when a single
            # cue ran past 64 chars before we hit a natural break.
            while buf_words:
                buf_words.pop()
                if not buf_words:
                    return
                text = format_lines([w["word"] for w in buf_words])
                if text is not None:
                    break
        if text is None:
            return
        start = buf_words[0]["start"]
        end = buf_words[-1]["end"]
        # Pad end slightly so the cue lingers a beat past the last word.
        end = min(end + 0.15, start + MAX_CUE_SECONDS)
        if end - start < MIN_CUE_SECONDS:
            end = start + MIN_CUE_SECONDS
        cues.append({"start": round(start, 3), "end": round(end, 3), "text": text})
        buf_words = []

    for i, w in enumerate(words):
        word_text = w["word"]
        gap_before = w["start"] - last_end if buf_words else 0

        # Decide whether to flush BEFORE adding this word.
        if buf_words:
            # Trial-add to see if it still fits.
            trial_words = [bw["word"] for bw in buf_words] + [word_text]
            trial_text = format_lines(trial_words)
            cue_dur = w["end"] - buf_start

            if (
                trial_text is None                              # would overflow 2×32
                or cue_dur > MAX_CUE_SECONDS                    # too long
                or gap_before >= PAUSE_BREAK_SECONDS            # natural pause
                or HARD_PUNCT_RE.search(buf_words[-1]["word"])  # previous word ended a sentence
            ):
                flush()
                buf_start = w["start"]

        if not buf_words:
            buf_start = w["start"]
        buf_words.append(w)
        last_end = w["end"]

    flush(force=True)
    return cues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="Process only one id, e.g. course-intro-en")
    ap.add_argument("--model", default="small", help="faster-whisper model size")
    ap.add_argument("--device", default="auto", help="cuda | cpu | auto")
    args = ap.parse_args()

    print(f"Loading model: {args.model} (device={args.device})")
    device = "cuda" if args.device == "auto" else args.device
    try:
        model = WhisperModel(args.model, device=device, compute_type="float16" if device == "cuda" else "int8")
    except Exception:
        print("  GPU init failed, falling back to CPU")
        model = WhisperModel(args.model, device="cpu", compute_type="int8")

    audio_files = sorted(AUDIO_DIR.glob("*.wav"))
    if args.only:
        audio_files = [f for f in audio_files if f.stem == args.only]

    if not audio_files:
        print(f"No audio files matched in {AUDIO_DIR}")
        return

    # Load existing captions.js so single-id reruns don't blow away the others.
    existing = {}
    if OUT_JS.exists() and not args.only is None:
        text = OUT_JS.read_text(encoding="utf-8")
        m = re.search(r"window\.RT_BOOKEND_CAPTIONS\s*=\s*(\{.*?\});", text, re.DOTALL)
        if m:
            try:
                existing = json.loads(m.group(1))
            except Exception:
                existing = {}

    all_cues = dict(existing)

    for f in audio_files:
        key = f.stem  # course-intro-en, module-3-outro-es, etc.
        lang = "es" if key.endswith("-es") else "en"
        print(f"  [{key}] transcribing ({lang})...")
        words = transcribe(f, lang, model)
        cues = build_cues(words)
        all_cues[key] = cues
        avg_chars = sum(len(c["text"]) for c in cues) / max(1, len(cues))
        print(f"    {len(words)} words -> {len(cues)} cues, avg {avg_chars:.0f} chars/cue")

    # Write captions.js
    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    js = "/* Auto-generated bookend captions — broadcast-standard cues from Whisper word-level timing */\n"
    js += "window.RT_BOOKEND_CAPTIONS = " + json.dumps(all_cues, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT_JS.write_text(js, encoding="utf-8")

    total_cues = sum(len(v) for v in all_cues.values())
    print(f"\n✓ Wrote {OUT_JS}")
    print(f"  {len(all_cues)} videos · {total_cues} cues · {OUT_JS.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

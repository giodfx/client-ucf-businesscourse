#!/usr/bin/env python3
"""
Spanish TTS batch generation using Qwen3-TTS ICL mode (with language='Spanish').
Reads from *-video-data-es.json, outputs to media/audio/scenes-es/.

Usage:
  python regenerate-tts-batch-es.py                        # All lessons with -es.json
  python regenerate-tts-batch-es.py --lesson lesson-0-1    # Single lesson
  python regenerate-tts-batch-es.py --start lesson-3-1     # Resume from specific
"""

import sys
import os
import json
import argparse
import subprocess
import time
import warnings
import io
import logging
from pathlib import Path

# ─── Paths ───────────────────────────────────────────────────────────────────

COURSE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = COURSE_DIR.parent.parent.parent
VOICES_DIR = PROJECT_ROOT / 'voices'

# ─── Voice References (same English refs — Qwen3-TTS speaks Spanish with them) ─

VOICE_REFS = {
    'female': {
        'audio': str(VOICES_DIR / 'FemaleJessica.mp3').replace('\\', '/'),
        'text': "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.",
    },
    'male': {
        'audio': str(VOICES_DIR / 'MaleAmerican.mp3').replace('\\', '/'),
        'text': "It allows you to easily download YouTube videos as MP3 or MP4 files. The service is completely free and does not require any sign-up",
    }
}

# ─── Lesson Roster ───────────────────────────────────────────────────────────

LESSONS = [
    ('lesson-0-1', 'female'), ('lesson-1-1', 'male'), ('lesson-1-2', 'female'), ('lesson-1-3', 'male'),
    ('lesson-2-1', 'female'), ('lesson-2-2', 'male'), ('lesson-2-3', 'female'),
    ('lesson-3-1', 'male'), ('lesson-3-2', 'female'), ('lesson-3-3', 'male'),
    ('lesson-4-1', 'female'), ('lesson-4-2', 'male'), ('lesson-4-3', 'female'),
    ('lesson-5-1', 'male'), ('lesson-5-2', 'female'),
    ('lesson-6-1', 'male'), ('lesson-6-2', 'female'), ('lesson-6-3', 'male'),
    ('lesson-7-1', 'female'), ('lesson-7-2', 'male'), ('lesson-7-3', 'female'),
    ('lesson-7-4', 'male'), ('lesson-7-5', 'male'),
    ('lesson-8-1', 'female'), ('lesson-8-2', 'male'), ('lesson-8-3', 'female'),
]

# ─── TTS Engine ──────────────────────────────────────────────────────────────

_model = None

def get_model():
    global _model
    if _model is None:
        # Suppress import noise
        warnings.filterwarnings('ignore')
        from qwen_tts import Qwen3TTSModel
        logging.basicConfig(level=logging.WARNING)
        print('  Loading Qwen3-TTS 1.7B model...')
        _model = Qwen3TTSModel("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device="cuda:0", dtype="bfloat16",
                                max_memory={0: "20GiB"})
        print('  Model loaded.')
    return _model


def generate_tts_spanish(text, presenter, output_path):
    """Generate Spanish TTS using ICL mode with language='Spanish'."""
    voice = VOICE_REFS[presenter]
    model = get_model()

    import soundfile as sf
    import numpy as np

    audio_arrays, sample_rate = model.generate_voice_clone(
        text=text,
        language='Spanish',
        ref_audio=voice['audio'],
        ref_text=voice['text'],
        x_vector_only_mode=False,
    )

    # Concatenate and save
    audio_data = np.concatenate(audio_arrays) if isinstance(audio_arrays, list) else audio_arrays
    sf.write(output_path, audio_data, sample_rate)
    return os.path.exists(output_path)


def resample_to_16k(input_path, output_path):
    subprocess.run(
        ['ffmpeg', '-y', '-i', str(input_path), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', str(output_path)],
        capture_output=True, check=True
    )


def get_audio_duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)],
        capture_output=True, text=True
    )
    try:
        return float(json.loads(result.stdout)['format']['duration'])
    except:
        return 0


def process_lesson(lesson_id, presenter):
    """Generate Spanish TTS for all scenes in a lesson."""
    vd_path = COURSE_DIR / f'video-scripts/{lesson_id}-video-data-es.json'
    if not vd_path.exists():
        print(f'    [SKIP] No Spanish video-data: {lesson_id}')
        return 'skip'

    with open(vd_path, encoding='utf-8') as f:
        vd = json.load(f)

    audio_dir = COURSE_DIR / f'media/audio/scenes-es/{lesson_id}'
    audio_dir.mkdir(parents=True, exist_ok=True)

    scene_count = 0
    for scene in vd['scenes']:
        narration = scene.get('narration', '').strip()
        if len(narration) < 10:
            continue

        raw_path = str(audio_dir / f'{lesson_id}-scene-{scene["sceneNumber"]}-raw.wav')
        final_path = str(audio_dir / f'{lesson_id}-scene-{scene["sceneNumber"]}.wav')

        if os.path.exists(final_path) and os.path.getsize(final_path) > 1000:
            dur = get_audio_duration(final_path)
            scene['duration'] = dur
            print(f'    [SKIP] Scene {scene["sceneNumber"]} ({dur:.1f}s)')
            scene_count += 1
            continue

        print(f'    Scene {scene["sceneNumber"]}: {len(narration)} chars...', end='', flush=True)
        t0 = time.time()

        try:
            ok = generate_tts_spanish(narration, presenter, raw_path)
            if not ok:
                print(f' FAILED: no output')
                return False

            resample_to_16k(raw_path, final_path)
            dur = get_audio_duration(final_path)
            scene['duration'] = dur
            elapsed = time.time() - t0
            if os.path.exists(raw_path):
                os.unlink(raw_path)
            print(f' OK ({dur:.1f}s) [{elapsed:.0f}s]')
            scene_count += 1
        except Exception as e:
            print(f' FAILED: {e}')
            return False

    total = sum(s.get('duration', 0) for s in vd['scenes'])
    vd['totalDuration'] = total
    with open(vd_path, 'w', encoding='utf-8') as f:
        json.dump(vd, f, indent=2, ensure_ascii=False)

    print(f'    Total: {total:.1f}s ({total/60:.1f} min), {scene_count} scenes')
    return True


def main():
    parser = argparse.ArgumentParser(description='Spanish TTS batch generation')
    parser.add_argument('--lesson', type=str, help='Single lesson (e.g., lesson-0-1)')
    parser.add_argument('--start', type=str, help='Start from lesson (e.g., lesson-3-1)')
    args = parser.parse_args()

    print('\n' + '=' * 60)
    print('  SPANISH TTS — Qwen3-TTS ICL Mode (Direct Python)')
    print('=' * 60)

    # Free ComfyUI VRAM
    try:
        import urllib.request
        req = urllib.request.Request(
            'http://127.0.0.1:8188/free',
            data=json.dumps({'unload_models': True, 'free_memory': True}).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=5)
        print('  ComfyUI models unloaded — VRAM freed')
    except Exception:
        print('  ComfyUI not running or already unloaded')

    # Find lessons with Spanish data
    if args.lesson:
        targets = [(lid, p) for lid, p in LESSONS if lid == args.lesson]
        if not targets:
            print(f'  ERROR: Unknown lesson {args.lesson}')
            sys.exit(1)
    else:
        targets = [(lid, p) for lid, p in LESSONS
                    if (COURSE_DIR / f'video-scripts/{lid}-video-data-es.json').exists()]
        if args.start:
            start_idx = next((i for i, (lid, _) in enumerate(targets) if lid == args.start), 0)
            targets = targets[start_idx:]

    print(f'  Lessons with Spanish data: {len(targets)}')
    if not targets:
        print('  No Spanish video-data files found.')
        return

    completed = 0
    skipped = 0
    failed = []
    overall_start = time.time()

    for i, (lesson_id, presenter) in enumerate(targets):
        print(f'\n  [{i+1}/{len(targets)}] {lesson_id} | {presenter}')
        lesson_start = time.time()

        result = process_lesson(lesson_id, presenter)
        elapsed = time.time() - lesson_start

        if result == 'skip':
            skipped += 1
        elif result:
            completed += 1
            print(f'    Done in {elapsed/60:.1f}min')
        else:
            failed.append(lesson_id)
            print(f'    FAILED after {elapsed/60:.1f}min')

    total_time = time.time() - overall_start
    print('\n' + '=' * 60)
    print(f'  COMPLETE: {completed}/{len(targets)} lessons in {total_time/60:.1f} min')
    if skipped:
        print(f'  Skipped (no data): {skipped}')
    if failed:
        print(f'  FAILED: {", ".join(failed)}')
    print('=' * 60 + '\n')


if __name__ == '__main__':
    main()

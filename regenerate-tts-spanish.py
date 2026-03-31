#!/usr/bin/env python3
"""
Spanish TTS generation for UCF Business Course demo (3 lessons).
Uses HombreColombiaWarm voice via Qwen3-TTS ICL mode.
Loads engine ONCE in-process (no subprocess per scene).

Usage:
  python regenerate-tts-spanish.py                     # All 3 demo lessons
  python regenerate-tts-spanish.py --lesson lesson-1-1  # Single lesson
  python regenerate-tts-spanish.py --force              # Regenerate existing
"""

import sys
import os
import json
import argparse
import subprocess
import time
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'

# ─── Paths ───────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
COURSE_DIR = Path(__file__).resolve().parent
VOICES_DIR = PROJECT_ROOT / 'voices'

# ─── Voice Reference (ICL mode) ─────────────────────────────────────────────

VOICE_REF = {
    # Use SHORT reference (12s) — long references (46s) cause model to generate massive audio
    'audio': str(VOICES_DIR / 'HombreColombiaWarm-short.mp3').replace('\\', '/'),
    'text': "Bienvenido. Imagínate sentado detrás del volante, estacionado en la rampa de entrada de la Interestatal 4, la autopista que atraviesa el corazón del corredor empresarial del centro de Florida.",
    'instruction': 'cálido y profesional, ritmo natural conversacional'
}

# ─── Lessons ─────────────────────────────────────────────────────────────────

LESSONS = ['lesson-0-1', 'lesson-1-1', 'lesson-1-2']

# ─── TTS Engine (loaded once, reused across all scenes) ─────────────────────

_engine = None

def get_engine():
    global _engine
    if _engine is not None:
        return _engine

    print('    Loading Qwen3-TTS engine (one-time)...', end='', flush=True)
    t0 = time.time()

    # Import the generator class from the project
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'qwen3_tts_gen',
        str(PROJECT_ROOT / 'src' / 'ai' / 'audio' / 'qwen3-tts-generator.py')
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    _engine = mod.Qwen3TTSGenerator(mode='clone')
    print(f' ready ({time.time() - t0:.0f}s)', flush=True)
    return _engine


def generate_tts(text, output_path):
    """Generate TTS using the in-process engine (no subprocess)."""
    engine = get_engine()
    result = engine.generate_audio_clone(
        text=text,
        reference_audio_path=VOICE_REF['audio'],
        reference_text=VOICE_REF['text'],
        output_path=output_path.replace('\\', '/'),
        instruction=VOICE_REF['instruction'],
    )
    return result.get('success', False), result.get('error', '')


def resample_to_16k(input_path, output_path):
    """Resample to 16kHz mono for InfinityTalk compatibility."""
    subprocess.run(
        ['ffmpeg', '-y', '-i', str(input_path), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', str(output_path)],
        capture_output=True, check=True
    )


def get_audio_duration(path):
    """Get duration in seconds via ffprobe."""
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)],
        capture_output=True, text=True
    )
    try:
        return float(json.loads(result.stdout)['format']['duration'])
    except:
        return 0


def process_lesson(lesson_id, force=False):
    """Generate Spanish TTS for all scenes in a lesson."""
    vd_path = COURSE_DIR / f'video-scripts/{lesson_id}-video-data-es.json'
    if not vd_path.exists():
        print(f'    [ERROR] Missing: {vd_path}')
        return False

    with open(vd_path, encoding='utf-8') as f:
        vd = json.load(f)

    audio_dir = COURSE_DIR / f'media/audio/scenes-es/{lesson_id}'
    audio_dir.mkdir(parents=True, exist_ok=True)

    scene_count = 0
    total_dur = 0

    for scene in vd['scenes']:
        narration = scene.get('narration', '').strip()
        if len(narration) < 10:
            continue

        scene_num = scene['sceneNumber']
        raw_path = str(audio_dir / f'{lesson_id}-scene-{scene_num}-raw.wav')
        final_path = str(audio_dir / f'{lesson_id}-scene-{scene_num}.wav')

        if not force and os.path.exists(final_path) and os.path.getsize(final_path) > 1000:
            dur = get_audio_duration(final_path)
            total_dur += dur
            print(f'    [SKIP] Scene {scene_num} ({dur:.1f}s)')
            scene_count += 1
            continue

        print(f'    Scene {scene_num}: {len(narration)} chars...', end='', flush=True)
        t0 = time.time()

        try:
            ok, err = generate_tts(narration, raw_path)
            if not ok:
                print(f' FAILED: {err}')
                return False

            resample_to_16k(raw_path, final_path)
            dur = get_audio_duration(final_path)
            total_dur += dur
            elapsed = time.time() - t0
            if os.path.exists(raw_path):
                os.unlink(raw_path)
            print(f' OK ({dur:.1f}s) [{elapsed:.0f}s]')
            scene_count += 1
        except Exception as e:
            print(f' FAILED: {e}')
            import traceback
            traceback.print_exc()
            return False

    print(f'    Done: {scene_count} scenes, {total_dur:.1f}s ({total_dur/60:.1f}m)')
    return True


def main():
    parser = argparse.ArgumentParser(description='Generate Spanish TTS for UCF demo')
    parser.add_argument('--lesson', help='Single lesson ID (e.g., lesson-1-1)')
    parser.add_argument('--force', action='store_true', help='Regenerate even if files exist')
    args = parser.parse_args()

    lessons = [args.lesson] if args.lesson else LESSONS

    print(f'\n=== Spanish TTS Generation (HombreColombiaWarm) ===')
    print(f'Voice: {VOICE_REF["audio"]}')
    print(f'Lessons: {", ".join(lessons)}\n')

    for lesson_id in lessons:
        print(f'[{lesson_id}]')
        ok = process_lesson(lesson_id, force=args.force)
        if not ok:
            print(f'    FAILED - stopping')
            sys.exit(1)
        print()

    print('=== All done! ===')


if __name__ == '__main__':
    main()

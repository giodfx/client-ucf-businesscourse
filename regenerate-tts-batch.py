#!/usr/bin/env python3
"""
Batch TTS regeneration using Qwen3-TTS ICL mode (with reference text transcription).
Calls qwen3-tts-generator.py per scene (proven subprocess approach).

Usage:
  python regenerate-tts-batch.py                     # All lessons (skips 0-1, 1-1)
  python regenerate-tts-batch.py --lesson lesson-2-1  # Single lesson
  python regenerate-tts-batch.py --start lesson-3-1   # Resume from specific lesson
"""

import sys
import os
import json
import argparse
import subprocess
import time
from pathlib import Path

# ─── Paths ───────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
COURSE_DIR = Path(__file__).resolve().parent
VOICES_DIR = PROJECT_ROOT / 'voices'
TTS_GENERATOR = PROJECT_ROOT / 'src' / 'ai' / 'audio' / 'qwen3-tts-generator.py'

# ─── Voice References (ICL mode — with transcription for consistent cloning) ─

VOICE_REFS = {
    'female': {
        'audio': str(VOICES_DIR / 'FemaleJessica.mp3').replace('\\', '/'),
        'text': "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.",
        'instruction': 'warm and professional, clear pace'
    },
    'male': {
        'audio': str(VOICES_DIR / 'MaleAmerican.mp3').replace('\\', '/'),
        'text': "It allows you to easily download YouTube videos as MP3 or MP4 files. The service is completely free and does not require any sign-up",
        'instruction': 'confident and encouraging, conversational'
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

SKIP_LESSONS = {'lesson-0-1', 'lesson-1-1', 'lesson-7-1'}  # Already have ICL audio


def generate_tts_icl(text, presenter, output_path):
    """Generate TTS using ICL mode via subprocess (proven approach)."""
    voice = VOICE_REFS[presenter]
    config = {
        'text': text,
        'mode': 'clone',
        'referenceAudio': voice['audio'],
        'referenceText': voice['text'],
        'instruction': voice['instruction'],
        'outputPath': output_path.replace('\\', '/'),
    }

    env = os.environ.copy()
    env['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'

    result = subprocess.run(
        ['python', str(TTS_GENERATOR), json.dumps(config)],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT), env=env
    )

    if result.returncode != 0:
        stderr_tail = result.stderr[-500:] if result.stderr else 'no stderr'
        return False, f'returncode={result.returncode}: {stderr_tail}'

    try:
        out = json.loads(result.stdout.strip().split('\n')[-1])
        return out.get('success', False), out.get('error', '')
    except:
        return os.path.exists(output_path), ''


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


def process_lesson(lesson_id, presenter):
    """Generate TTS for all scenes in a lesson."""
    vd_path = COURSE_DIR / f'video-scripts/{lesson_id}-video-data.json'
    if not vd_path.exists():
        print(f'    [ERROR] Missing video-data: {vd_path}')
        return False

    with open(vd_path) as f:
        vd = json.load(f)

    audio_dir = COURSE_DIR / f'media/audio/scenes/{lesson_id}'
    audio_dir.mkdir(parents=True, exist_ok=True)

    scene_count = 0
    for scene in vd['scenes']:
        narration = scene.get('narration', '').strip()
        if len(narration) < 10:
            continue

        raw_path = str(audio_dir / f'{lesson_id}-scene-{scene["sceneNumber"]}-raw.wav')
        final_path = str(audio_dir / f'{lesson_id}-scene-{scene["sceneNumber"]}.wav')

        # Skip if already exists and is valid
        if os.path.exists(final_path) and os.path.getsize(final_path) > 1000:
            dur = get_audio_duration(final_path)
            scene['duration'] = dur
            print(f'    [SKIP] Scene {scene["sceneNumber"]} ({dur:.1f}s)')
            scene_count += 1
            continue

        print(f'    Scene {scene["sceneNumber"]}: {len(narration)} chars...', end='', flush=True)
        t0 = time.time()

        try:
            ok, err = generate_tts_icl(narration, presenter, raw_path)
            if not ok:
                print(f' FAILED: {err}')
                return False

            resample_to_16k(raw_path, final_path)
            dur = get_audio_duration(final_path)
            scene['duration'] = dur
            elapsed = time.time() - t0
            # Clean up raw
            if os.path.exists(raw_path):
                os.unlink(raw_path)
            print(f' OK ({dur:.1f}s) [{elapsed:.0f}s]')
            scene_count += 1
        except Exception as e:
            print(f' FAILED: {e}')
            return False

    # Update video-data with new durations
    total = sum(s.get('duration', 0) for s in vd['scenes'])
    vd['totalDuration'] = total
    with open(vd_path, 'w') as f:
        json.dump(vd, f, indent=2)

    print(f'    Total: {total:.1f}s ({total/60:.1f} min), {scene_count} scenes')
    return True


def main():
    parser = argparse.ArgumentParser(description='Batch TTS regeneration with ICL mode')
    parser.add_argument('--lesson', type=str, help='Process single lesson (e.g., lesson-1-1)')
    parser.add_argument('--start', type=str, help='Start from specific lesson (e.g., lesson-3-1)')
    args = parser.parse_args()

    print('\n' + '=' * 60)
    print('  BATCH TTS REGENERATION — Qwen3-TTS ICL Mode')
    print('  (subprocess approach — loads model per scene)')
    print('=' * 60)

    # Free ComfyUI VRAM before TTS (CRITICAL — both need GPU)
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

    # Determine which lessons to process
    if args.lesson:
        targets = [(lid, p) for lid, p in LESSONS if lid == args.lesson]
        if not targets:
            print(f'  ERROR: Unknown lesson {args.lesson}')
            sys.exit(1)
    else:
        targets = [(lid, p) for lid, p in LESSONS if lid not in SKIP_LESSONS]
        if args.start:
            start_idx = next((i for i, (lid, _) in enumerate(targets) if lid == args.start), 0)
            targets = targets[start_idx:]

    print(f'  Lessons to process: {len(targets)}')
    print(f'  Skipping: {SKIP_LESSONS}')
    print(f'  Generator: {TTS_GENERATOR}')

    # Process lessons
    completed = 0
    failed = []
    overall_start = time.time()

    for i, (lesson_id, presenter) in enumerate(targets):
        print(f'\n  [{i+1}/{len(targets)}] {lesson_id} | {presenter}')
        lesson_start = time.time()

        ok = process_lesson(lesson_id, presenter)

        elapsed = time.time() - lesson_start
        if ok:
            completed += 1
            print(f'    Done in {elapsed/60:.1f}min')
        else:
            failed.append(lesson_id)
            print(f'    FAILED after {elapsed/60:.1f}min')

    # Summary
    total_time = time.time() - overall_start
    print('\n' + '=' * 60)
    print(f'  COMPLETE: {completed}/{len(targets)} lessons in {total_time/60:.1f} min')
    if failed:
        print(f'  FAILED: {", ".join(failed)}')
    print('=' * 60 + '\n')


if __name__ == '__main__':
    main()

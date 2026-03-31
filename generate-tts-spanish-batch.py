#!/usr/bin/env python3
"""
Spanish TTS batch — uses qwen3-tts-generator.py subprocess (proven approach).
Colombian voice references: HombreColombiano (male), MujeColombiana (female).

Usage:
  python generate-tts-spanish-batch.py                        # All with -es.json
  python generate-tts-spanish-batch.py --lesson lesson-0-1    # Single lesson
"""

import sys, os, json, argparse, subprocess, time
from pathlib import Path

COURSE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = COURSE_DIR.parent.parent.parent
TTS_GENERATOR = PROJECT_ROOT / 'src' / 'ai' / 'audio' / 'qwen3-tts-generator.py'
VOICES_DIR = PROJECT_ROOT / 'voices'

VOICE_REFS = {
    'female': {
        'audio': str(VOICES_DIR / 'MujeColombiana-Neutral.mp3').replace('\\', '/'),
        'text': '',  # No transcription yet — will use x_vector_only mode
    },
    'male': {
        'audio': str(VOICES_DIR / 'HombreColombiano-Neutral.mp3').replace('\\', '/'),
        'text': '',  # No transcription yet
    }
}

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


def get_audio_duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)],
        capture_output=True, text=True
    )
    try:
        return float(json.loads(result.stdout)['format']['duration'])
    except:
        return 0


def generate_scene(text, presenter, output_path):
    voice = VOICE_REFS[presenter]
    config = {
        'text': text,
        'mode': 'clone',
        'language': 'Spanish',
        'referenceAudio': voice['audio'],
        'referenceText': voice['text'],
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
    subprocess.run(
        ['ffmpeg', '-y', '-i', str(input_path), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', str(output_path)],
        capture_output=True, check=True
    )


def process_lesson(lesson_id, presenter):
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

        ok, err = generate_scene(narration, presenter, raw_path)
        if not ok:
            print(f' FAILED: {err}')
            return False

        resample_to_16k(raw_path, final_path)
        dur = get_audio_duration(final_path)
        scene['duration'] = dur
        elapsed = time.time() - t0
        if os.path.exists(raw_path):
            os.unlink(raw_path)
        print(f' OK ({dur:.1f}s) [{elapsed:.0f}s]')
        scene_count += 1

    total = sum(s.get('duration', 0) for s in vd['scenes'])
    vd['totalDuration'] = total
    with open(vd_path, 'w', encoding='utf-8') as f:
        json.dump(vd, f, indent=2, ensure_ascii=False)

    print(f'    Total: {total:.1f}s ({total/60:.1f} min), {scene_count} scenes')
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lesson', type=str)
    parser.add_argument('--start', type=str)
    args = parser.parse_args()

    print('\n' + '=' * 60)
    print('  SPANISH TTS — Colombian Voices (subprocess)')
    print('=' * 60)
    print(f'  Male: HombreColombiano-Neutral.mp3')
    print(f'  Female: MujeColombiana-Neutral.mp3')

    # Free ComfyUI VRAM
    try:
        import urllib.request
        req = urllib.request.Request('http://127.0.0.1:8188/free',
            data=json.dumps({'unload_models': True, 'free_memory': True}).encode(),
            headers={'Content-Type': 'application/json'}, method='POST')
        urllib.request.urlopen(req, timeout=5)
        print('  ComfyUI VRAM freed')
    except:
        print('  ComfyUI not running or freed')

    if args.lesson:
        targets = [(lid, p) for lid, p in LESSONS if lid == args.lesson]
    else:
        targets = [(lid, p) for lid, p in LESSONS
                    if (COURSE_DIR / f'video-scripts/{lid}-video-data-es.json').exists()]
        if args.start:
            idx = next((i for i, (lid, _) in enumerate(targets) if lid == args.start), 0)
            targets = targets[idx:]

    print(f'  Lessons: {len(targets)}')
    print(f'  Targets: {", ".join(t[0] for t in targets)}')

    completed = 0
    failed = []
    t_start = time.time()

    for i, (lid, presenter) in enumerate(targets):
        print(f'\n  [{i+1}/{len(targets)}] {lid} | {presenter}')
        t0 = time.time()
        result = process_lesson(lid, presenter)
        elapsed = (time.time() - t0) / 60

        if result == 'skip':
            pass
        elif result:
            completed += 1
            print(f'    Done in {elapsed:.1f}min')
        else:
            failed.append(lid)
            print(f'    FAILED after {elapsed:.1f}min')

    total = (time.time() - t_start) / 60
    print('\n' + '=' * 60)
    print(f'  COMPLETE: {completed}/{len(targets)} in {total:.1f} min')
    if failed:
        print(f'  FAILED: {", ".join(failed)}')
    print('=' * 60 + '\n')


if __name__ == '__main__':
    main()

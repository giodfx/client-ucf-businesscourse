#!/usr/bin/env python3
"""
Regenerate TTS for a single lesson using ICL mode (with reference text transcription).
This provides much more consistent voice across scenes.
"""

import sys
import os
import json
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
COURSE_DIR = os.path.dirname(os.path.abspath(__file__))

VOICE_REFS = {
    'female': {
        'audio': os.path.join(PROJECT_ROOT, 'voices/FemaleJessica.mp3'),
        'text': "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.",
        'instruction': 'warm and professional, clear pace'
    },
    'male': {
        'audio': os.path.join(PROJECT_ROOT, 'voices/MaleAmerican.mp3'),
        'text': "It allows you to easily download YouTube videos as MP3 or MP4 files. The service is completely free and does not require any sign-up",
        'instruction': 'confident and encouraging, conversational'
    }
}

PRESENTER_MAP = {
    'lesson-0-1': 'female', 'lesson-1-1': 'male', 'lesson-1-2': 'female', 'lesson-1-3': 'male',
    'lesson-2-1': 'female', 'lesson-2-2': 'male', 'lesson-2-3': 'female',
    'lesson-3-1': 'male', 'lesson-3-2': 'female', 'lesson-3-3': 'male',
    'lesson-4-1': 'female', 'lesson-4-2': 'male', 'lesson-4-3': 'female',
    'lesson-5-1': 'male', 'lesson-5-2': 'female',
    'lesson-6-1': 'male', 'lesson-6-2': 'female', 'lesson-6-3': 'male',
    'lesson-7-1': 'female', 'lesson-7-2': 'male', 'lesson-7-3': 'female', 'lesson-7-4': 'male', 'lesson-7-5': 'male',
    'lesson-8-1': 'female', 'lesson-8-2': 'male', 'lesson-8-3': 'female',
}


def generate_tts_icl(text, presenter, output_path):
    """Generate TTS using ICL mode with reference text transcription."""
    voice = VOICE_REFS[presenter]
    config = {
        'text': text,
        'mode': 'clone',
        'referenceAudio': voice['audio'].replace('\\', '/'),
        'referenceText': voice['text'],  # THIS IS THE KEY FIX — enables ICL mode
        'instruction': voice['instruction'],
        'outputPath': output_path.replace('\\', '/'),
    }

    result = subprocess.run(
        ['python', os.path.join(PROJECT_ROOT, 'src/ai/audio/qwen3-tts-generator.py'), json.dumps(config)],
        capture_output=True, text=True, cwd=PROJECT_ROOT
    )

    if result.returncode != 0:
        print(f'  ERROR: {result.stderr[-300:]}')
        return False

    try:
        out = json.loads(result.stdout.strip().split('\n')[-1])
        return out.get('success', False)
    except:
        return os.path.exists(output_path)


def resample_to_16k(input_path, output_path):
    """Resample to 16kHz mono for InfinityTalk compatibility."""
    subprocess.run(
        ['ffmpeg', '-y', '-i', input_path, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', output_path],
        capture_output=True
    )


def get_audio_duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', path],
        capture_output=True, text=True
    )
    try:
        return float(json.loads(result.stdout)['format']['duration'])
    except:
        return 0


def main():
    lesson_id = sys.argv[1] if len(sys.argv) > 1 else 'lesson-0-1'
    presenter = PRESENTER_MAP.get(lesson_id, 'female')

    print(f'\n=== Regenerating TTS for {lesson_id} ({presenter}) using ICL mode ===\n')

    vd_path = os.path.join(COURSE_DIR, f'video-scripts/{lesson_id}-video-data.json')
    with open(vd_path) as f:
        vd = json.load(f)

    audio_dir = os.path.join(COURSE_DIR, f'media/audio/scenes/{lesson_id}')
    os.makedirs(audio_dir, exist_ok=True)

    for scene in vd['scenes']:
        narration = scene.get('narration', '').strip()
        if len(narration) < 10:
            print(f'  Scene {scene["sceneNumber"]}: [SKIP] no narration')
            continue

        raw_path = os.path.join(audio_dir, f'{lesson_id}-scene-{scene["sceneNumber"]}-raw.wav')
        final_path = os.path.join(audio_dir, f'{lesson_id}-scene-{scene["sceneNumber"]}.wav')

        print(f'  Scene {scene["sceneNumber"]}: generating ({len(narration)} chars)...', end='', flush=True)
        ok = generate_tts_icl(narration, presenter, raw_path)

        if ok and os.path.exists(raw_path):
            # Resample to 16kHz
            resample_to_16k(raw_path, final_path)
            dur = get_audio_duration(final_path)
            print(f' OK ({dur:.1f}s)')

            # Update video-data duration
            scene['duration'] = dur
        else:
            print(' FAILED')

    # Save updated video-data with new durations
    with open(vd_path, 'w') as f:
        json.dump(vd, f, indent=2)

    print(f'\n  Video-data updated with new durations.')

    # Show summary
    total = sum(s.get('duration', 0) for s in vd['scenes'])
    print(f'  Total duration: {total:.1f}s ({total/60:.1f} min)')
    print(f'  Done!\n')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Bookend audio generator — UCF Business Course bookend videos (Modules 0-5 only).

Reads bookend-scripts.json, generates EN+ES audio per video using Qwen3-TTS in ICL mode.

CHUNKING STRATEGY (per MEMORY.md "Audio must be per-scene: scene-sized chunks (not one long file).
Long TTS degrades quality."):
  Each script is split into ~40-80 word chunks at sentence boundaries.
  Each chunk is generated as a separate TTS call with the same voice reference.
  Chunks are concatenated via FFmpeg with a small natural pause (200ms) between them.
  This preserves Qwen3-TTS quality and natural pacing.

Usage:
  python generate-bookend-audio.py --samples       # 4 samples (course-intro + module-1-intro, EN+ES)
  python generate-bookend-audio.py --video <id>    # Single video EN+ES
  python generate-bookend-audio.py --all           # All in-scope videos (Modules 0-5)
  python generate-bookend-audio.py --lang en       # Restrict to one language
  python generate-bookend-audio.py --max-chunk N   # Override max words per chunk (default 60)

Output:
  media/audio/bookend/{video-id}-{lang}.wav         (final concatenated, 24kHz native)
  media/audio/bookend/{video-id}-{lang}-16k.wav     (16kHz mono for InfinityTalk video render)
  media/audio/bookend/.chunks/{video-id}-{lang}/    (per-chunk audio files; preserved for debugging)
"""
import sys, os, re, json, argparse, subprocess, time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
COURSE_DIR = Path(__file__).resolve().parent
TTS_GENERATOR = PROJECT_ROOT / 'src' / 'ai' / 'audio' / 'qwen3-tts-generator.py'
SCRIPTS_FILE = COURSE_DIR / 'bookend-scripts.json'
OUT_DIR = COURSE_DIR / 'media' / 'audio' / 'bookend'
CHUNKS_DIR = OUT_DIR / '.chunks'

# Default chunking: ~60 words per chunk, sentence-aware
DEFAULT_MAX_WORDS_PER_CHUNK = 60
INTER_CHUNK_GAP_MS = 200  # natural pause between concatenated chunks


def load_scripts():
    with open(SCRIPTS_FILE, encoding='utf-8') as f:
        return json.load(f)


def chunk_script(text, max_words=DEFAULT_MAX_WORDS_PER_CHUNK):
    """Split a long script into chunks of ~max_words words at sentence boundaries.

    Strategy:
      1. Split text into sentences using period/question/exclamation as boundary
         (Spanish: also handle ¿ ¡ at start of sentences).
      2. Greedily pack sentences into chunks until next sentence would exceed max_words.
      3. If a single sentence exceeds max_words, split it further at commas/dashes.
    """
    text = text.strip()
    if not text:
        return []

    # Split into sentences. Respect Spanish punctuation. Use lookahead to keep punctuation.
    # Sentence ends at ., !, ?, ;, : followed by whitespace + capital/inverted-punct.
    sentence_pattern = re.compile(r'(?<=[\.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])', re.UNICODE)
    sentences = sentence_pattern.split(text)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    current = []
    current_words = 0

    for sent in sentences:
        sent_words = len(sent.split())

        # If a single sentence is huge, split it at commas as a fallback
        if sent_words > max_words:
            sub_parts = re.split(r'(?<=,)\s+', sent)
            for sp in sub_parts:
                sp_words = len(sp.split())
                if current_words + sp_words > max_words and current:
                    chunks.append(' '.join(current).strip())
                    current = [sp]
                    current_words = sp_words
                else:
                    current.append(sp)
                    current_words += sp_words
            continue

        if current_words + sent_words > max_words and current:
            chunks.append(' '.join(current).strip())
            current = [sent]
            current_words = sent_words
        else:
            current.append(sent)
            current_words += sent_words

    if current:
        chunks.append(' '.join(current).strip())

    return [c for c in chunks if c]


def generate_tts_icl(text, voice_ref, output_path):
    """Generate TTS using Qwen3-TTS ICL clone mode (with referenceText)."""
    audio_abs = str(COURSE_DIR / voice_ref['audio']).replace('\\', '/')
    config = {
        'text': text,
        'mode': 'clone',
        'referenceAudio': audio_abs,
        'referenceText': voice_ref['transcription'],
        'instruction': voice_ref['instruction'],
        'outputPath': str(output_path).replace('\\', '/'),
    }

    env = os.environ.copy()
    env['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
    env['PYTHONIOENCODING'] = 'utf-8'

    result = subprocess.run(
        ['python', str(TTS_GENERATOR), json.dumps(config, ensure_ascii=False)],
        capture_output=True, text=True, encoding='utf-8', errors='replace',
        cwd=str(PROJECT_ROOT), env=env
    )

    if result.returncode != 0:
        return False, f'returncode={result.returncode}: {(result.stderr or "")[-500:]}'

    try:
        last_line = result.stdout.strip().split('\n')[-1]
        out = json.loads(last_line)
        return out.get('success', False), out.get('error', '')
    except Exception as e:
        return os.path.exists(output_path), f'parse error: {e}'


def concat_chunks_with_gap(chunk_paths, output_path, gap_ms=INTER_CHUNK_GAP_MS):
    """Concatenate WAV chunks with a small silent gap between each."""
    if len(chunk_paths) == 1:
        # No gap needed; just copy
        subprocess.run(['ffmpeg', '-y', '-i', str(chunk_paths[0]), '-c', 'copy', str(output_path)],
                       capture_output=True, check=True)
        return

    # Build concat filter: each chunk + silence pad
    inputs = []
    filter_parts = []
    for i, path in enumerate(chunk_paths):
        inputs.extend(['-i', str(path)])
        filter_parts.append(f'[{i}:a]apad=pad_dur={gap_ms/1000.0}[c{i}]')

    # Trim final pad — last chunk shouldn't have trailing silence
    filter_str = ';'.join(filter_parts) + ';' + ''.join(f'[c{i}]' for i in range(len(chunk_paths))) + f'concat=n={len(chunk_paths)}:v=0:a=1[out]'

    cmd = ['ffmpeg', '-y'] + inputs + ['-filter_complex', filter_str, '-map', '[out]', '-c:a', 'pcm_s16le', str(output_path)]
    subprocess.run(cmd, capture_output=True, check=True)


def resample_to_16k(input_path, output_path):
    subprocess.run(
        ['ffmpeg', '-y', '-i', str(input_path),
         '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', str(output_path)],
        capture_output=True, check=True
    )


def get_audio_duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)],
        capture_output=True, text=True
    )
    try:
        return float(json.loads(result.stdout)['format']['duration'])
    except Exception:
        return 0.0


def generate_one(video, lang, voice_refs, max_words=DEFAULT_MAX_WORDS_PER_CHUNK, force=False):
    """Generate a chunked + concatenated audio file for one video in one language."""
    voice_key = video[f'voice_{lang}']
    voice_ref = voice_refs[voice_key]
    script_text = video[f'script_{lang}']

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chunks_subdir = CHUNKS_DIR / f'{video["id"]}-{lang}'
    chunks_subdir.mkdir(parents=True, exist_ok=True)

    out_native = OUT_DIR / f'{video["id"]}-{lang}.wav'
    out_16k = OUT_DIR / f'{video["id"]}-{lang}-16k.wav'

    if not force and out_16k.exists() and out_16k.stat().st_size > 1000:
        dur = get_audio_duration(out_16k)
        print(f'    SKIP — already exists: {out_16k.name} ({dur:.1f}s)')
        return 'skipped', dur

    # Chunk the script
    chunks = chunk_script(script_text, max_words=max_words)
    print(f'    Script: {len(script_text)} chars, {len(script_text.split())} words -> {len(chunks)} chunks')

    # Generate each chunk
    chunk_paths = []
    for i, chunk_text in enumerate(chunks, 1):
        chunk_path = chunks_subdir / f'chunk-{i:02d}.wav'
        if not force and chunk_path.exists() and chunk_path.stat().st_size > 1000:
            print(f'      [{i}/{len(chunks)}] SKIP {chunk_path.name} ({len(chunk_text.split())}w)')
            chunk_paths.append(chunk_path)
            continue
        words = len(chunk_text.split())
        print(f'      [{i}/{len(chunks)}] Generating ({words}w, {len(chunk_text)} chars)...')
        t0 = time.time()
        ok, err = generate_tts_icl(chunk_text, voice_ref, chunk_path)
        if not ok:
            print(f'      [{i}/{len(chunks)}] FAILED: {err[:200]}')
            return 'error', 0.0
        chunk_dur = get_audio_duration(chunk_path)
        print(f'      [{i}/{len(chunks)}] {time.time()-t0:.1f}s gen -> {chunk_dur:.1f}s audio')
        chunk_paths.append(chunk_path)

    # Concatenate all chunks
    print(f'    Concatenating {len(chunk_paths)} chunks -> {out_native.name}...')
    try:
        concat_chunks_with_gap(chunk_paths, out_native)
    except subprocess.CalledProcessError as e:
        print(f'    FAILED concat: {e}')
        return 'error', 0.0

    # Resample to 16kHz mono for InfinityTalk
    try:
        resample_to_16k(out_native, out_16k)
    except subprocess.CalledProcessError as e:
        print(f'    FAILED resample: {e}')
        return 'error', 0.0

    duration = get_audio_duration(out_16k)
    size_kb = out_16k.stat().st_size / 1024
    print(f'    DONE — {duration:.1f}s total, {size_kb:.0f}KB (16kHz mono)')
    return 'success', duration


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', action='store_true')
    parser.add_argument('--video', type=str)
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--lang', type=str, choices=['en', 'es'])
    parser.add_argument('--max-chunk', type=int, default=DEFAULT_MAX_WORDS_PER_CHUNK,
                        help='Max words per chunk (default 60)')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    data = load_scripts()
    voice_refs = data['_meta']['voice_refs']
    videos = data['videos']

    if args.samples:
        targets = [v for v in videos if v['id'] in ('course-intro', 'module-1-intro')]
    elif args.video:
        targets = [v for v in videos if v['id'] == args.video]
        if not targets:
            print(f'ERROR: no video with id={args.video}')
            sys.exit(1)
    elif args.all:
        targets = [v for v in videos if v.get('approved')]
    else:
        print('Specify --samples, --video <id>, or --all')
        sys.exit(1)

    langs = [args.lang] if args.lang else ['en', 'es']

    print('=' * 70)
    print('UCF Bookend Audio Generation (CHUNKED)')
    print('=' * 70)
    print(f'Output:        {OUT_DIR}')
    print(f'Targets:       {len(targets)} video(s) x {len(langs)} lang = {len(targets) * len(langs)} audios')
    print(f'Chunk size:    ~{args.max_chunk} words max per chunk')
    print(f'Inter-chunk:   {INTER_CHUNK_GAP_MS}ms natural gap')
    print(f'Force re-gen:  {args.force}')
    print('=' * 70)

    success = errors = skipped = 0
    total_duration = 0.0

    for video in targets:
        print(f'\n=== {video["label"]} (id={video["id"]}) ===')
        print(f'    Module {video["module"]}, voice={video["voice_en"]}/{video["voice_es"]}')
        for lang in langs:
            print(f'  --- {lang.upper()} ---')
            status, dur = generate_one(video, lang, voice_refs, max_words=args.max_chunk, force=args.force)
            if status == 'success':
                success += 1
                total_duration += dur
            elif status == 'skipped':
                skipped += 1
                total_duration += dur
            else:
                errors += 1

    print('\n' + '=' * 70)
    print(f'Done: {success} success, {skipped} skipped, {errors} errors')
    print(f'Total audio duration: {total_duration:.1f}s ({total_duration/60:.1f} min)')
    print('=' * 70)
    if errors > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()

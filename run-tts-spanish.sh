#!/bin/bash
# Generate Spanish TTS for 3 demo lessons using HombreColombiaWarm voice
# Run this directly in a terminal: bash run-tts-spanish.sh
set -e

COURSE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$COURSE_DIR/../../../.." && pwd)"
TTS_GEN="$PROJECT_ROOT/src/ai/audio/qwen3-tts-generator.py"
VOICE_REF="$PROJECT_ROOT/voices/HombreColombiaWarm.mp3"
VOICE_TEXT="$(cat "$PROJECT_ROOT/voices/hombre_transcription.txt")"

export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

LESSONS="lesson-0-1 lesson-1-1 lesson-1-2"
TOTAL_SCENES=0
TOTAL_DUR=0

echo ""
echo "=== Spanish TTS Generation (HombreColombiaWarm) ==="
echo "Voice: $VOICE_REF"
echo ""

for LESSON in $LESSONS; do
    VD_FILE="$COURSE_DIR/video-scripts/${LESSON}-video-data-es.json"
    AUDIO_DIR="$COURSE_DIR/media/audio/scenes-es/$LESSON"
    mkdir -p "$AUDIO_DIR"

    echo "[$LESSON]"

    # Get scene numbers and narrations
    SCENE_DATA=$(python -c "
import json, sys
with open('$VD_FILE', encoding='utf-8') as f:
    d = json.load(f)
for s in d['scenes']:
    n = s.get('narration','').strip()
    if len(n) >= 10:
        print(f'{s[\"sceneNumber\"]}|{len(n)}')
" 2>/dev/null)

    while IFS='|' read -r SCENE_NUM CHAR_COUNT; do
        FINAL="$AUDIO_DIR/${LESSON}-scene-${SCENE_NUM}.wav"
        RAW="$AUDIO_DIR/${LESSON}-scene-${SCENE_NUM}-raw.wav"
        CONFIG="$AUDIO_DIR/_tts_config.json"

        # Skip if already exists and is valid (regenerated with HombreColombiaWarm)
        # Check if file was modified after 18:00 today (new generation)
        if [ -f "$FINAL" ] && [ "$(stat -c %Y "$FINAL" 2>/dev/null || stat -f %m "$FINAL" 2>/dev/null)" -gt "$(date -d '18:00' +%s 2>/dev/null || echo 0)" ]; then
            DUR=$(ffprobe -v quiet -print_format json -show_format "$FINAL" 2>/dev/null | python -c "import json,sys; print(json.load(sys.stdin)['format']['duration'])" 2>/dev/null || echo "0")
            echo "    [SKIP] Scene $SCENE_NUM (${DUR}s)"
            TOTAL_SCENES=$((TOTAL_SCENES + 1))
            continue
        fi

        echo -n "    Scene $SCENE_NUM: ${CHAR_COUNT} chars..."

        # Write config
        python -c "
import json
with open('$VD_FILE', encoding='utf-8') as f:
    d = json.load(f)
scene = [s for s in d['scenes'] if s['sceneNumber'] == $SCENE_NUM][0]
config = {
    'text': scene['narration'].strip(),
    'mode': 'clone',
    'referenceAudio': '$VOICE_REF'.replace('\\\\', '/'),
    'referenceText': open('$PROJECT_ROOT/voices/hombre_transcription.txt', encoding='utf-8').read().strip(),
    'instruction': 'cálido y profesional, ritmo natural conversacional',
    'outputPath': '$RAW'.replace('\\\\', '/'),
}
with open('$CONFIG', 'w', encoding='utf-8') as f:
    json.dump(config, f, ensure_ascii=False)
" 2>/dev/null

        START=$(date +%s)
        python "$TTS_GEN" "$CONFIG" > /dev/null 2>&1

        # Resample to 16kHz mono
        ffmpeg -y -i "$RAW" -ar 16000 -ac 1 -c:a pcm_s16le "$FINAL" > /dev/null 2>&1

        # Get duration
        DUR=$(ffprobe -v quiet -print_format json -show_format "$FINAL" 2>/dev/null | python -c "import json,sys; print(json.load(sys.stdin)['format']['duration'])" 2>/dev/null || echo "0")
        ELAPSED=$(($(date +%s) - START))

        # Clean up
        rm -f "$RAW" "$CONFIG"

        echo " OK (${DUR}s) [${ELAPSED}s]"
        TOTAL_SCENES=$((TOTAL_SCENES + 1))

    done <<< "$SCENE_DATA"
    echo ""
done

echo "=== Done! $TOTAL_SCENES scenes generated ==="

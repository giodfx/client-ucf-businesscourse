#!/usr/bin/env node
/**
 * Multi-shot avatar video generator — lesson-0-1 (female, highway theme)
 *
 * Generates 18s segments at 1280x720, cycling through 5 different camera angles.
 * Each segment uses a SHOT-SPECIFIC LTX prompt that accurately describes what's
 * in that particular shot image and explicitly instructs lip-sync speaking.
 *
 * The LTX-2.3 workflow has an AI prompt enhancer (node 340:342) that "sees" the
 * input image — our prompts steer it in the right direction while the enhancer
 * adds visual detail from the actual image content.
 *
 * Final assembly uses crossfade dissolves between segments.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

const SEG_DURATION = 18;
const CROSSFADE = 1.5;
const EFFECTIVE_DUR = SEG_DURATION - CROSSFADE;

// ═══════════════════════════════════════════════════════════════════════════════
// SHOT-SPECIFIC LTX PROMPTS
// Each shot gets a unique prompt that describes exactly what's visible in that
// image. Every prompt MUST instruct active speaking with visible lip movements.
// ═══════════════════════════════════════════════════════════════════════════════

// IMPORTANT: Avoid left/right directional references for object positions.
// The AI prompt enhancer (node 340:342) SEES the actual image and will describe
// positions correctly. If our text says "car to her left" but the image shows it
// on the other side, the conflicting signals cause hallucinations (this is what
// caused the coffee shop in seg-001). Instead, describe objects generically
// ("beside her", "nearby", "behind her") and let the enhancer handle specifics.

const SHOT_PROMPTS = {
  // Shot 1: WIDE — waist up, sedan beside her, highway behind
  1: `scene: Golden hour Florida highway at sunset, warm amber lighting, open road stretching into the distance, a dark sedan parked beside the woman, warm evening sky with orange and gold clouds, cinematic digital painting
character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, wearing a smart casual navy blue V-neck top with a thin gold necklace, standing beside a car
action: She is actively speaking and talking to the camera with clear visible lip movements synchronized to her speech, her mouth opens and closes naturally forming words, subtle natural head movements, hair gently swaying in a light evening breeze, steady composed posture with relaxed shoulders
camera: Wide shot from waist up, steady locked-off composition, slight depth of field on the highway background`,

  // Shot 2: MEDIUM — chest up, car partially visible behind, hand gesturing
  2: `scene: Golden hour Florida highway at sunset, warm amber lighting, a dark sedan partially visible behind her, dramatic orange and gold sunset clouds, open road fading into the background
character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, wearing a smart casual navy blue V-neck top with a thin gold necklace, one hand extended in a natural open-palm conversational gesture
action: She is actively speaking and talking to the camera with clear visible lip movements synchronized to her speech, her mouth opens and closes naturally forming words, occasional hand gestures for emphasis, subtle natural head movements, hair gently swaying in a light breeze
camera: Medium shot from chest up, steady locked-off composition, slight depth of field`,

  // Shot 3: CLOSE-UP — face and shoulders filling the frame, soft bokeh background
  3: `scene: Warm golden hour lighting, soft blurred bokeh background of sunset sky and distant landscape, intimate warm atmosphere, out-of-focus golden and amber tones
character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, wearing a navy blue top, thin gold necklace visible at her collarbone, warm golden light illuminating her face and catching highlights in her hair
action: She is actively speaking and talking directly to the camera with clear visible lip movements synchronized to her speech, her mouth opens and closes naturally forming words, warm engaging eye contact with the viewer, subtle natural micro-expressions and small smiles between phrases, minimal head movement
camera: Close-up shot of face and shoulders filling the frame, steady locked-off composition, shallow depth of field with softly blurred warm background`,

  // Shot 4: THREE-QUARTER ANGLE — slight angle, hand gesturing, car nearby
  4: `scene: Golden hour Florida highway at sunset, warm amber lighting, a dark sedan visible nearby, open road stretching into the distance behind her, dramatic orange and gold sunset sky
character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, seen from a slight three-quarter angle, wearing a smart casual navy blue top with a thin gold necklace, one hand raised in a natural conversational gesture
action: She is actively speaking and talking toward the camera with clear visible lip movements synchronized to her speech, her mouth opens and closes naturally forming words, natural hand gestures emphasizing her points, subtle head turns toward the camera, hair gently swaying in a light breeze
camera: Medium shot at a slight three-quarter angle, steady locked-off composition, slight depth of field`,

  // Shot 5: MEDIUM-WIDE — hips up, standing near car, dramatic red/orange sky
  5: `scene: Dramatic golden hour Florida highway at sunset, intense warm amber and red-orange lighting, a dark sedan beside her, vast open road stretching into the distance, dramatic red and orange sunset sky with layered clouds
character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, wearing a smart casual navy blue top, standing casually near a car with relaxed confident posture
action: She is actively speaking and talking to the camera with clear visible lip movements synchronized to her speech, her mouth opens and closes naturally forming words, relaxed natural body language, subtle weight shifts, hair gently moving in an evening breeze, warm confident demeanor
camera: Medium-wide shot from hips up, steady locked-off composition, depth of field showing the dramatic sky and road behind her`
};

// Enhanced negative prompt — includes anti-text AND anti-static-face terms
const NEG_PROMPT = [
  'text, words, letters, subtitles, captions, watermark, logo, title card',
  'lower third, typography, writing, signage, banner, label, name tag, credit',
  'overlay graphics, HUD, UI elements, progress bar',
  'closed mouth, static face, frozen expression, mannequin, wax figure, puppet',
  'pc game, console game, video game, cartoon, childish, anime',
  'ugly, blurry, distorted face, deformed mouth, asymmetric eyes, uncanny valley',
  'extra fingers, mutated hands, poorly drawn face, mutation, deformed'
].join(', ');

// Shot cycle — natural camera flow avoiding same-shot repeats
// Wide(1) → Medium(2) → Close(3) → Angle(4) → Medium(2) → MedWide(5) → Close(3) → Angle(4) → ...
const SHOT_CYCLE = [1, 2, 3, 4, 2, 5, 3, 4, 2, 1, 3, 2, 5, 4, 3, 2, 1, 5, 2, 3, 4, 2, 5, 3];

const SHOT_DIR = path.join(COURSE_DIR, 'media/images/avatars/shots/lesson-0-1');
const FULL_AUDIO = path.join(COMFYUI_INPUT, 'ucf-lesson-0-1-full.wav');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getAudioDuration(wavPath) {
  const out = execSync(`ffprobe -v quiet -print_format json -show_format "${wavPath}"`, { encoding: 'utf-8' });
  return parseFloat(JSON.parse(out).format.duration);
}

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Submit error: ${data.error}`);
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error(`Node errors: ${JSON.stringify(data.node_errors)}`);
  }
  return data.prompt_id;
}

async function pollCompletion(promptId, timeoutMs = 900000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const data = await res.json();
      if (data[promptId]) {
        const status = data[promptId].status?.status_str;
        if (status === 'success') return data[promptId];
        if (status === 'error') throw new Error(`Execution error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function main() {
  // Verify full audio exists
  if (!fs.existsSync(FULL_AUDIO)) {
    // Concatenate scene audio files into full audio
    const audioDir = path.join(COURSE_DIR, 'media/audio/scenes/lesson-0-1');
    const scenes = [1, 2, 3, 4, 5, 6].map(n =>
      path.join(audioDir, `lesson-0-1-scene-${n}.wav`)
    );
    const concatList = scenes.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    const listFile = path.join(audioDir, 'concat-full.txt');
    fs.writeFileSync(listFile, concatList);
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -ar 16000 -ac 1 -c:a pcm_s16le "${FULL_AUDIO}"`,
      { stdio: 'pipe' }
    );
    console.log('  Created full concatenated audio');
  }

  const totalDuration = getAudioDuration(FULL_AUDIO);
  const numSegments = Math.ceil(totalDuration / EFFECTIVE_DUR);

  console.log(`\n═══ Lesson 0-1 Multi-Shot Video Generation ═══`);
  console.log(`  Total audio: ${totalDuration.toFixed(1)}s → ${numSegments} segments`);
  console.log(`  Resolution: 1280x720 | Seg: ${SEG_DURATION}s | Crossfade: ${CROSSFADE}s`);
  console.log(`  Per-shot prompts: 5 unique camera angle descriptions`);
  console.log(`  Negative prompt includes anti-text + anti-static-face terms\n`);

  const segDir = path.join(COURSE_DIR, 'media/video/avatars/segments/lesson-0-1-multishot');
  if (!fs.existsSync(segDir)) fs.mkdirSync(segDir, { recursive: true });

  const segmentPaths = [];
  const startTime = Date.now();

  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * EFFECTIVE_DUR;
    const segDur = Math.min(SEG_DURATION, totalDuration - offset);
    if (segDur < 2) break;

    const segVideoPath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}.mp4`);

    // Skip if already exists (resume support)
    if (fs.existsSync(segVideoPath) && fs.statSync(segVideoPath).size > 0) {
      console.log(`  [SKIP] seg${seg} exists`);
      segmentPaths.push(segVideoPath);
      continue;
    }

    // Pick shot for this segment
    const shotNum = SHOT_CYCLE[seg % SHOT_CYCLE.length];
    const shotImage = path.join(SHOT_DIR, `shot-${shotNum}.png`);

    if (!fs.existsSync(shotImage)) {
      console.error(`  ✗ Missing shot image: shot-${shotNum}.png`);
      continue;
    }

    // Get the shot-specific prompt
    const shotPrompt = SHOT_PROMPTS[shotNum];

    // Copy shot image to ComfyUI input
    const imageFilename = `ucf-lesson-0-1-multishot-seg${seg}.png`;
    fs.copyFileSync(shotImage, path.join(COMFYUI_INPUT, imageFilename));

    // Trim audio for this segment
    const audioFilename = `ucf-lesson-0-1-multishot-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${FULL_AUDIO}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, audioFilename)}"`,
      { stdio: 'pipe' }
    );

    // Load and configure workflow
    const workflow = JSON.parse(fs.readFileSync(
      path.join(PROJECT_ROOT, 'workflows/comfyui/video_ltx2_3_ia2v.json'), 'utf-8'
    ));

    workflow['269'].inputs.image = imageFilename;
    workflow['276'].inputs.audio = audioFilename;
    workflow['276'].inputs.audioUI = '';
    workflow['340:330'].inputs.value = 1280;          // Width
    workflow['340:324'].inputs.value = 720;            // Height
    workflow['340:331'].inputs.value = segDur;          // Duration (seconds)
    workflow['340:334'].inputs.img_compression = 5;     // Image fidelity (5 = moderate freedom)
    workflow['340:325'].inputs.strength = 0.75;         // Image-to-video strength
    workflow['340:293'].inputs.strength_model = 0.4;    // Distilled LoRA strength
    workflow['340:314'].inputs.text = NEG_PROMPT;       // Negative prompt
    workflow['340:319'].inputs.value = shotPrompt;       // SHOT-SPECIFIC positive prompt
    workflow['340:286'].inputs.noise_seed = Math.floor(Math.random() * 1e15);
    workflow['341'].inputs.filename_prefix = `video/ucf-lesson-0-1-ms-seg${seg}`;

    console.log(`  Seg ${seg + 1}/${numSegments}: shot-${shotNum}, ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s`);
    console.log(`    Prompt: ${shotPrompt.split('\n')[0].substring(0, 80)}...`);
    const segStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      const outputs = result.outputs?.['341'];
      if (outputs?.images?.[0]) {
        const vid = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, vid.subfolder || '', vid.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, segVideoPath);
          segmentPaths.push(segVideoPath);
          const elapsed = ((Date.now() - segStart) / 1000).toFixed(0);
          console.log(`  ✓ seg${seg} done (${elapsed}s) — shot-${shotNum}`);
        }
      }
    } catch (e) {
      console.error(`  ✗ seg${seg} FAILED: ${e.message}`);
    }

    // Brief GPU rest between segments
    if (seg < numSegments - 1) await sleep(5000);
  }

  // ═══ ASSEMBLE with crossfade ═══
  console.log(`\nAssembling ${segmentPaths.length} segments with ${CROSSFADE}s crossfade...`);

  if (segmentPaths.length === 0) {
    console.error('No segments generated!');
    process.exit(1);
  }

  const outputPath = path.join(COURSE_DIR, 'media/video/avatars/lesson-0-1-multishot-test.mp4');

  if (segmentPaths.length === 1) {
    fs.copyFileSync(segmentPaths[0], outputPath);
  } else {
    // Build ffmpeg xfade filter chain for smooth dissolves
    let filterParts = [];
    let currentInput = '[0:v]';

    for (let i = 1; i < segmentPaths.length; i++) {
      const nextInput = `[${i}:v]`;
      const outputLabel = i < segmentPaths.length - 1 ? `[v${i}]` : '[vout]';
      // xfade offset: each transition starts at i * EFFECTIVE_DUR
      const offset = (i * SEG_DURATION - i * CROSSFADE).toFixed(2);
      filterParts.push(`${currentInput}${nextInput}xfade=transition=fade:duration=${CROSSFADE}:offset=${offset}${outputLabel}`);
      currentInput = outputLabel;
    }

    // Audio crossfade
    let audioFilterParts = [];
    let currentAudioInput = '[0:a]';

    for (let i = 1; i < segmentPaths.length; i++) {
      const nextAudioInput = `[${i}:a]`;
      const audioOutputLabel = i < segmentPaths.length - 1 ? `[a${i}]` : '[aout]';
      const offset = (i * SEG_DURATION - i * CROSSFADE).toFixed(2);
      audioFilterParts.push(`${currentAudioInput}${nextAudioInput}acrossfade=d=${CROSSFADE}:c1=tri:c2=tri${audioOutputLabel}`);
      currentAudioInput = audioOutputLabel;
    }

    const inputArgs = segmentPaths.map(p => `-i "${p}"`).join(' ');
    const filterComplex = filterParts.join(';') + ';' + audioFilterParts.join(';');
    const cmd = `ffmpeg -y ${inputArgs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    } catch (e) {
      // Fallback: simple concat with trim to avoid audio crossfade complexity
      console.log('  Complex crossfade failed, using simple concat...');
      const trimmedPaths = [];
      for (let i = 0; i < segmentPaths.length; i++) {
        const trimmed = path.join(segDir, `trimmed-${String(i).padStart(3, '0')}.mp4`);
        if (i === 0) {
          execSync(`ffmpeg -y -i "${segmentPaths[i]}" -t ${SEG_DURATION - 0.5} -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${trimmed}"`, { stdio: 'pipe' });
        } else {
          execSync(`ffmpeg -y -i "${segmentPaths[i]}" -ss 0.75 -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${trimmed}"`, { stdio: 'pipe' });
        }
        trimmedPaths.push(trimmed);
      }
      const concatList = path.join(segDir, 'concat-list.txt');
      fs.writeFileSync(concatList, trimmedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
      execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${outputPath}"`, { stdio: 'pipe' });
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const fileSize = fs.existsSync(outputPath) ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1) : '?';
  const videoDuration = getAudioDuration(outputPath);
  console.log(`\n═══ COMPLETE ═══`);
  console.log(`  lesson-0-1-multishot-test.mp4`);
  console.log(`  ${segmentPaths.length} segments, ${videoDuration.toFixed(0)}s, ${fileSize}MB`);
  console.log(`  Total generation time: ${totalElapsed}min\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

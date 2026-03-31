#!/usr/bin/env node
/**
 * Test single segment generation for LTX-2.3 parameter tuning.
 * Generates ONE segment so you can review before committing to a full run.
 *
 * Usage: node test-single-segment.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

// === TEST CONFIGURATION ===
const LESSON_ID = 'lesson-0-1';
const SEG_INDEX = 5;           // Which segment to generate (0-indexed)
const SHOT_NUM = 5;            // Shot 5 = Medium-wide (front-facing, hips up, untested)
const SEG_DURATION = 18;
const EFFECTIVE_DUR = 16.5;
const AUDIO_OFFSET = SEG_INDEX * EFFECTIVE_DUR;  // 82.5s

// EXACT same prompt that worked for seg-002 — testing if audio offset matters
const FOUR_SECTION_PROMPT = [
  'scene: Golden hour Florida highway at sunset, warm amber lighting, a dark sedan partially visible behind, dramatic orange and gold sunset clouds',
  'character: A confident Latina woman in her early 30s with dark shoulder-length wavy hair, wearing a smart casual navy blue V-neck top with a thin gold necklace',
  'action: She is speaking directly to the camera with clear natural lip movements synchronized to her speech, warm expressive delivery, hair gently swaying in a light breeze',
  'camera: Fixed medium shot, chest-up framing, steady with slight depth of field',
].join('\n');

const NEG_PROMPT = 'pc game, console game, video game, cartoon, childish, ugly, blurry, distorted face, deformed mouth, asymmetric eyes, uncanny valley';

// === UTILITIES ===
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Submit error: ${JSON.stringify(data.error).substring(0, 500)}`);
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error(`Node errors: ${JSON.stringify(data.node_errors).substring(0, 500)}`);
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
  throw new Error('Timeout waiting for ComfyUI');
}

// === MAIN ===
async function main() {
  console.log('=== LTX-2.3 SINGLE SEGMENT TEST — 4-SECTION PROMPT ===');
  console.log(`Lesson: ${LESSON_ID}, Segment: ${SEG_INDEX}, Image: shot-2 (same as working seg-002)`);
  console.log(`Audio offset: ${AUDIO_OFFSET}s, Duration: ${SEG_DURATION}s`);
  console.log();

  // Check ComfyUI
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!res.ok) throw new Error('Not ok');
    console.log('ComfyUI: Connected');
  } catch {
    console.error('ERROR: ComfyUI not reachable at', COMFYUI_URL);
    process.exit(1);
  }

  // Prepare audio segment
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments/${LESSON_ID}-multishot`);
  const fullAudioPath = path.join(segDir, 'full-audio-original.wav');
  if (!fs.existsSync(fullAudioPath)) {
    console.error('ERROR: Missing full-audio-original.wav');
    process.exit(1);
  }

  const audioFilename = `ucf-test-seg${SEG_INDEX}.wav`;
  execSync(
    `ffmpeg -y -i "${fullAudioPath}" -ss ${AUDIO_OFFSET} -t ${SEG_DURATION} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, audioFilename)}"`,
    { stdio: 'pipe' }
  );
  console.log(`Audio: extracted ${SEG_DURATION}s from offset ${AUDIO_OFFSET}s`);

  // Use shot-2 (Medium) — exact same image that worked for seg-002
  const shotImage = path.join(COURSE_DIR, `media/images/avatars/shots/${LESSON_ID}/shot-2.png`);
  if (!fs.existsSync(shotImage)) {
    console.error(`ERROR: Missing shot-2.png`);
    process.exit(1);
  }
  const imageFilename = `ucf-test-seg${SEG_INDEX}.png`;
  fs.copyFileSync(shotImage, path.join(COMFYUI_INPUT, imageFilename));
  console.log(`Image: shot-2.png (Medium) — same as working seg-002`);

  // Load and configure workflow
  const ltxWorkflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/video_ltx2_3_ia2v.json');
  const workflow = JSON.parse(fs.readFileSync(ltxWorkflowPath, 'utf-8'));

  workflow['269'].inputs.image = imageFilename;
  workflow['276'].inputs.audio = audioFilename;
  workflow['276'].inputs.audioUI = '';
  workflow['340:330'].inputs.value = 1280;
  workflow['340:324'].inputs.value = 720;
  workflow['340:331'].inputs.value = SEG_DURATION;

  // 4-section prompt → enhancer ON (default) rewrites this into detailed generation instructions
  // This is the ORIGINAL format that produced working lip-sync in the pipeline
  workflow['340:319'].inputs.value = FOUR_SECTION_PROMPT;

  // WORKFLOW DEFAULTS — no overrides! Let LTX use its own tuned values.
  // Default img_compression=18 gives the model MORE freedom to animate the face.
  // Previous tests with img_compression=5 all failed lip-sync (too constrained).
  // cfg stays at workflow default of 1.0
  // strength stays at workflow default of 0.7
  // strength_model (distilled LoRA) stays at workflow default of 0.5
  // Prompt enhancer stays ON (default) — required for lip-sync

  // Negative prompt (original simpler version from working pipeline)
  workflow['340:314'].inputs.text = NEG_PROMPT;

  // Random seed
  workflow['340:286'].inputs.noise_seed = Math.floor(Math.random() * 1e15);
  workflow['341'].inputs.filename_prefix = `video/ucf-test-seg${SEG_INDEX}`;

  console.log();
  console.log('Settings:');
  console.log(`  img_compression: 18 (WORKFLOW DEFAULT — more face animation freedom)`);
  console.log(`  strength: 0.7 (WORKFLOW DEFAULT)`);
  console.log(`  strength_model: 0.5 (WORKFLOW DEFAULT — distilled LoRA)`);
  console.log(`  cfg: 1.0 (workflow default)`);
  console.log(`  prompt enhancer: ON (required for lip-sync)`);
  console.log(`  negative: "${NEG_PROMPT}"`);
  console.log(`  prompt format: 4-SECTION (scene/character/action/camera)`);
  console.log(`  prompt:`);
  FOUR_SECTION_PROMPT.split('\n').forEach(line => console.log(`    ${line}`));
  console.log();

  const startTime = Date.now();
  console.log(`Submitting to ComfyUI... (${new Date().toLocaleTimeString()})`);

  try {
    const promptId = await submitWorkflow(workflow);
    console.log(`Queued: ${promptId}`);
    console.log('Waiting for completion...');

    const result = await pollCompletion(promptId);
    const outputs = result.outputs?.['341'];

    if (outputs?.images?.[0]) {
      const vid = outputs.images[0];
      const comfyPath = path.join(COMFYUI_OUTPUT, vid.subfolder || '', vid.filename);
      const outputPath = path.join(segDir, `seg-${String(SEG_INDEX).padStart(3, '0')}.mp4`);

      if (fs.existsSync(comfyPath)) {
        fs.copyFileSync(comfyPath, outputPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log();
        console.log(`✓ SUCCESS in ${elapsed}s`);
        console.log(`  Output: ${outputPath}`);
        console.log();
        console.log('Please review this segment for lip-sync quality.');
        console.log('Compare with seg-000.mp4 and seg-001.mp4 (known working).');
      }
    } else {
      console.error('ERROR: No output in result');
    }
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
  }
}

main().catch(console.error);

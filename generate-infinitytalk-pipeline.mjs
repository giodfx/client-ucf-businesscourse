#!/usr/bin/env node
/**
 * InfinityTalk Avatar Video Pipeline — UCF Business Course
 *
 * Three-stage pipeline for all 26 lessons:
 *   Stage A: Qwen Image Edit → 5 shot variations per lesson (~30s/lesson)
 *   Stage B: InfinityTalk → 16s video segments with shot cycling (~7min/segment)
 *   Stage C: FFmpeg → crossfade assembly into final MP4
 *
 * InfinityTalk Config (PROVEN WORKING):
 *   Base: Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors
 *   InfinityTalk: Wan2_1-InfiniteTalk-Single_fp8_e4m3fn_scaled_KJ.safetensors
 *   CRITICAL: Both models MUST be same format (fp8↔fp8)
 *   LoRA: lightx2v distill rank32 (strength 0.8)
 *   Resolution: 832x480 @ 25fps, 4 steps, flowmatch_distill
 *   Block swap: 40
 *
 * Usage:
 *   node generate-infinitytalk-pipeline.mjs                      # All lessons (2-pass)
 *   node generate-infinitytalk-pipeline.mjs --lesson lesson-2-1   # Single lesson
 *   node generate-infinitytalk-pipeline.mjs --skip-shots          # Skip Pass 1
 *   node generate-infinitytalk-pipeline.mjs --shots-only          # Only Pass 1 (shots)
 *   node generate-infinitytalk-pipeline.mjs --videos-only         # Only Pass 2 (videos)
 *   node generate-infinitytalk-pipeline.mjs --start lesson-3-1    # Start from specific
 *   node generate-infinitytalk-pipeline.mjs --force               # Overwrite existing
 *
 * Resume is automatic — existing shots and segments are skipped.
 * NEVER run two GPU processes simultaneously.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

const SEG_DURATION = 16;     // 16s segments (proven safe, tested)
const CROSSFADE = 1.5;       // 1.5s crossfade between segments
const EFFECTIVE_DUR = SEG_DURATION - CROSSFADE;

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON DATA
// ═══════════════════════════════════════════════════════════════════════════════

const LESSONS = [
  { id: 'lesson-0-1', module: 0, presenter: 'female' },
  { id: 'lesson-1-1', module: 1, presenter: 'male' },
  { id: 'lesson-1-2', module: 1, presenter: 'female' },
  { id: 'lesson-1-3', module: 1, presenter: 'male' },
  { id: 'lesson-2-1', module: 2, presenter: 'female' },
  { id: 'lesson-2-2', module: 2, presenter: 'male' },
  { id: 'lesson-2-3', module: 2, presenter: 'female' },
  { id: 'lesson-3-1', module: 3, presenter: 'male' },
  { id: 'lesson-3-2', module: 3, presenter: 'female' },
  { id: 'lesson-3-3', module: 3, presenter: 'male' },
  { id: 'lesson-4-1', module: 4, presenter: 'female' },
  { id: 'lesson-4-2', module: 4, presenter: 'male' },
  { id: 'lesson-4-3', module: 4, presenter: 'female' },
  { id: 'lesson-5-1', module: 5, presenter: 'male' },
  { id: 'lesson-5-2', module: 5, presenter: 'female' },
  { id: 'lesson-6-1', module: 6, presenter: 'male' },
  { id: 'lesson-6-2', module: 6, presenter: 'female' },
  { id: 'lesson-6-3', module: 6, presenter: 'male' },
  { id: 'lesson-7-1', module: 7, presenter: 'female' },
  { id: 'lesson-7-2', module: 7, presenter: 'male' },
  { id: 'lesson-7-3', module: 7, presenter: 'female' },
  { id: 'lesson-7-4', module: 7, presenter: 'male' },
  { id: 'lesson-7-5', module: 7, presenter: 'male' },
  { id: 'lesson-8-1', module: 8, presenter: 'female' },
  { id: 'lesson-8-2', module: 8, presenter: 'male' },
  { id: 'lesson-8-3', module: 8, presenter: 'female' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHARACTERS, OUTFITS, SHOT CYCLE
// ═══════════════════════════════════════════════════════════════════════════════

const CHARACTERS = {
  female: 'A confident Latina woman in her early 30s with dark shoulder-length wavy hair',
  male: 'A professional American man in his late 30s with short brown hair',
};

// OUTFITS removed — shot 1 is a direct copy of the avatar (preserves the real outfit).
// Shots 2-5 use edit instructions with "Keep the EXACT same clothing" to prevent drift.

// Shot cycle — 5 shots (medium L/R, medium-closeup L/R, close center), no same-shot back-to-back
const SHOT_CYCLE = [1, 3, 5, 2, 4, 1, 5, 3, 2, 4, 1, 3, 5, 4, 2, 1, 3, 5, 2, 4, 1, 3, 5, 2];

// InfinityTalk positive prompts (per gender)
// Allow subtle natural environment motion (water shimmer, leaves) for consistency
// but prevent large movements (cars, people, camera)
const INFINITYTALK_PROMPTS = {
  female: 'A confident Latina woman speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, warm expressive delivery',
  male: 'A professional American man speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, confident conversational delivery',
};

// InfinityTalk negative prompt — prevent LARGE background motion but allow subtle natural movement
const INFINITYTALK_NEG = 'moving cars, camera motion, camera shake, zooming, panning, walking people, body movement, hand movement, rapid background motion, bright tones, overexposed, subtitles';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE SCENE DESCRIPTIONS — kept for reference / InfinityTalk prompts.
// Shot generation v2 does NOT use these (shots 2-5 are zoom edits from avatar).
// RULES: NO cars, roads, water, waves, rides, cranes, or any moving elements.
// ═══════════════════════════════════════════════════════════════════════════════

// SCENES — one per module, for InfinityTalk context and reference.
const SCENES = {
  0: [ // Welcome — warm sunset terrace
    'on a scenic overlook terrace at golden hour, Florida palm trees silhouetted against a dramatic orange and gold sunset sky, warm amber lighting, stone railing with distant tree line',
    'on a scenic overlook terrace at golden hour, Florida palm trees silhouetted against a dramatic orange and gold sunset sky, warm amber lighting, stone railing with distant tree line',
    'on a scenic overlook terrace at golden hour, Florida palm trees silhouetted against a dramatic orange and gold sunset sky, warm amber lighting, stone railing with distant tree line',
    'on a scenic overlook terrace at golden hour, Florida palm trees silhouetted against a dramatic orange and gold sunset sky, warm amber lighting, stone railing with distant tree line',
    'on a scenic overlook terrace at golden hour, Florida palm trees silhouetted against a dramatic orange and gold sunset sky, warm amber lighting, stone railing with distant tree line',
  ],
  1: [ // Downtown Orlando — rooftop terrace (PROVEN WORKING)
    'on a rooftop terrace at golden hour, Orlando city skyline in the background, glass building behind, warm amber sunset sky, no street no road no cars',
    'on a rooftop terrace at golden hour, Orlando city skyline in the background, glass building behind, warm amber sunset sky, no street no road no cars',
    'on a rooftop terrace at golden hour, Orlando city skyline in the background, glass building behind, warm amber sunset sky, no street no road no cars',
    'on a rooftop terrace at golden hour, Orlando city skyline in the background, glass building behind, warm amber sunset sky, no street no road no cars',
    'on a rooftop terrace at golden hour, Orlando city skyline in the background, glass building behind, warm amber sunset sky, no street no road no cars',
  ],
  2: [ // Financial District — elegant corporate campus with reflecting pools (water OK)
    'in an elegant financial district courtyard at golden hour, ornamental reflecting pools surrounded by manicured topiary gardens, stone columns and classical banking facades, warm amber afternoon light, sophisticated corporate atmosphere',
    'in an elegant financial district courtyard at golden hour, ornamental reflecting pools surrounded by manicured topiary gardens, stone columns and classical banking facades, warm amber afternoon light, sophisticated corporate atmosphere',
    'in an elegant financial district courtyard at golden hour, ornamental reflecting pools surrounded by manicured topiary gardens, stone columns and classical banking facades, warm amber afternoon light, sophisticated corporate atmosphere',
    'in an elegant financial district courtyard at golden hour, ornamental reflecting pools surrounded by manicured topiary gardens, stone columns and classical banking facades, warm amber afternoon light, sophisticated corporate atmosphere',
    'in an elegant financial district courtyard at golden hour, ornamental reflecting pools surrounded by manicured topiary gardens, stone columns and classical banking facades, warm amber afternoon light, sophisticated corporate atmosphere',
  ],
  3: [ // Cape Canaveral — marshland with launch towers (static, OK)
    'on flat Florida marshland at golden hour, launch towers silhouetted on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, tall grass in foreground',
    'on flat Florida marshland at golden hour, launch towers silhouetted on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, tall grass in foreground',
    'on flat Florida marshland at golden hour, launch towers silhouetted on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, tall grass in foreground',
    'on flat Florida marshland at golden hour, launch towers silhouetted on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, tall grass in foreground',
    'on flat Florida marshland at golden hour, launch towers silhouetted on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, tall grass in foreground',
  ],
  4: [ // Theme park — festive architecture only (no rides/Ferris wheel that animate)
    'in front of colorful theme park architecture at golden hour, ornate festive facades with tropical landscaping, palm trees, warm festive lighting beginning to glow, decorative archways',
    'in front of colorful theme park architecture at golden hour, ornate festive facades with tropical landscaping, palm trees, warm festive lighting beginning to glow, decorative archways',
    'in front of colorful theme park architecture at golden hour, ornate festive facades with tropical landscaping, palm trees, warm festive lighting beginning to glow, decorative archways',
    'in front of colorful theme park architecture at golden hour, ornate festive facades with tropical landscaping, palm trees, warm festive lighting beginning to glow, decorative archways',
    'in front of colorful theme park architecture at golden hour, ornate festive facades with tropical landscaping, palm trees, warm festive lighting beginning to glow, decorative archways',
  ],
  5: [ // Port district — dock area with containers and maritime structures (no moving ships/cranes)
    'at a port container yard at golden hour, colorful stacked shipping containers, wooden dock pilings, port authority building behind, maritime bollards and mooring posts, warm amber coastal light, harbor skyline',
    'at a port container yard at golden hour, colorful stacked shipping containers, wooden dock pilings, port authority building behind, maritime bollards and mooring posts, warm amber coastal light, harbor skyline',
    'at a port container yard at golden hour, colorful stacked shipping containers, wooden dock pilings, port authority building behind, maritime bollards and mooring posts, warm amber coastal light, harbor skyline',
    'at a port container yard at golden hour, colorful stacked shipping containers, wooden dock pilings, port authority building behind, maritime bollards and mooring posts, warm amber coastal light, harbor skyline',
    'at a port container yard at golden hour, colorful stacked shipping containers, wooden dock pilings, port authority building behind, maritime bollards and mooring posts, warm amber coastal light, harbor skyline',
  ],
  6: [ // Coastal — beach dunes and vegetation only (no ocean/waves/water)
    'on sandy Florida dunes at golden hour, tall sea oats and dune grass against a dramatic orange and gold sunset sky, wooden beach fence in foreground, warm coastal light',
    'on sandy Florida dunes at golden hour, tall sea oats and dune grass against a dramatic orange and gold sunset sky, wooden beach fence in foreground, warm coastal light',
    'on sandy Florida dunes at golden hour, tall sea oats and dune grass against a dramatic orange and gold sunset sky, wooden beach fence in foreground, warm coastal light',
    'on sandy Florida dunes at golden hour, tall sea oats and dune grass against a dramatic orange and gold sunset sky, wooden beach fence in foreground, warm coastal light',
    'on sandy Florida dunes at golden hour, tall sea oats and dune grass against a dramatic orange and gold sunset sky, wooden beach fence in foreground, warm coastal light',
  ],
  7: [ // Florida springs — cypress trees and moss only (no water/reflections)
    'under towering cypress trees at golden hour, Spanish moss hanging from thick branches, lush green ferns and vegetation, warm dappled sunlight filtering through the canopy',
    'under towering cypress trees at golden hour, Spanish moss hanging from thick branches, lush green ferns and vegetation, warm dappled sunlight filtering through the canopy',
    'under towering cypress trees at golden hour, Spanish moss hanging from thick branches, lush green ferns and vegetation, warm dappled sunlight filtering through the canopy',
    'under towering cypress trees at golden hour, Spanish moss hanging from thick branches, lush green ferns and vegetation, warm dappled sunlight filtering through the canopy',
    'under towering cypress trees at golden hour, Spanish moss hanging from thick branches, lush green ferns and vegetation, warm dappled sunlight filtering through the canopy',
  ],
  8: [ // University campus — brick buildings and oaks (static, OK)
    'on a university campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
    'on a university campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
    'on a university campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
    'on a university campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
    'on a university campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
  ],
};

// Qwen Image Edit negative prompt — anti-photorealism + anti-text + outfit preservation
const SHOT_NEG = 'cars, vehicles, road, street, pavement, traffic, highway, automobile, photorealistic, photograph, realistic skin texture, airbrushed, smooth skin, stock photo, professional photo, text, words, letters, signs, banners, logos, writing, typography, signage, graffiti, watermark, different outfit, outfit change, costume change, different clothing, turtleneck, ugly, blurry, distorted face, deformed, extra fingers, mutated hands, poorly drawn face, oversaturated';

// ═══════════════════════════════════════════════════════════════════════════════
// SHOT PROMPT BUILDER (for Qwen Image Edit)
//
// NEW APPROACH (v3): Position + Zoom from avatar (lesson-1-1 reference).
//   Shot 1: COPY of avatar (LEFT, waist up — guaranteed correct outfit)
//   Shot 2: Edit → same zoom, character on RIGHT
//   Shot 3: Edit → medium close-up (collarbone), character CENTERED
//   Shot 4: Edit → medium close-up (mid-chest), character on RIGHT
//   Shot 5: Edit → close shot (head + upper shoulders), character CENTERED
//
// Every edit prompt includes explicit outfit/jewelry preservation to prevent drift.
// All shots generated INDEPENDENTLY from avatar (no chain = no drift accumulation).
// ═══════════════════════════════════════════════════════════════════════════════

function buildShotEditPrompt(shotNum, lesson) {
  // Shot 1 is a direct copy — this function is only called for shots 2-5.
  const preserve = 'Keep the EXACT same person, same clothing, same hairstyle, same jewelry, same accessories, same art style. DO NOT change the outfit or add new accessories.';

  let instruction;
  switch (shotNum) {
    case 2:
      // Medium shot, character on RIGHT — same zoom as avatar but repositioned
      instruction = `Move the character to the RIGHT side of the frame. Show more background on the LEFT side. Keep the same waist-up framing. ${preserve}`;
      break;
    case 3:
      // Medium close-up, character CENTER — tighter zoom
      instruction = `Change the framing to a medium close-up cropped at the collarbone. Show the upper chest, neck and head. Character CENTERED in the frame. ${preserve}`;
      break;
    case 4:
      // Medium close-up, character on RIGHT — tighter zoom + repositioned
      instruction = `Change the framing to a medium close-up cropped at mid-chest. Character positioned on the RIGHT side, more background visible on the LEFT. ${preserve}`;
      break;
    case 5:
      // Close shot, character CENTER — tightest zoom
      instruction = `Change the framing to show head and upper shoulders only, cropped at the collarbone. Character CENTERED. The person should appear noticeably BIGGER than the original. ${preserve}`;
      break;
    default:
      instruction = preserve;
  }

  return [
    instruction,
    'Cinematic digital painting with visible brushstrokes, warm golden hour lighting, painterly texture.',
    'Stylized painting, NOT a photograph, NOT photorealistic.',
    'NO text NO letters NO words NO signs NO banners NO logos.',
  ].join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fileExists(fp) {
  return fs.existsSync(fp) && fs.statSync(fp).size > 0;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getAudioDuration(wavPath) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${wavPath}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration);
  } catch { return 0; }
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function copyToComfyInput(srcPath, destFilename) {
  fs.copyFileSync(srcPath, path.join(COMFYUI_INPUT, destFilename));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMFYUI INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════

async function comfyuiHealthCheck() {
  try { const res = await fetch(`${COMFYUI_URL}/system_stats`); return res.ok; } catch { return false; }
}

async function freeVRAM() {
  try {
    await fetch(`${COMFYUI_URL}/free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
    });
  } catch {}
}

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
  let lastLog = 0;
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
    const elapsed = (Date.now() - start) / 1000;
    if (elapsed - lastLog >= 300) {
      console.log(`      ... ${formatTime(elapsed)} elapsed, still generating`);
      lastLog = elapsed;
    }
    await sleep(5000);
  }
  throw new Error('Timeout waiting for ComfyUI');
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE A: SHOT GENERATION (Qwen Image Edit)
// 5 camera angle variations from the existing avatar image. ~30s per lesson.
// ═══════════════════════════════════════════════════════════════════════════════

async function stageA_generateShots(lesson) {
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  ensureDir(shotDir);

  const existing = [1, 2, 3, 4, 5].filter(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
  if (existing.length === 5) {
    console.log(`    [SKIP] All 5 shots exist for ${lesson.id}`);
    return true;
  }

  const avatarPath = path.join(COURSE_DIR, `media/images/avatars/scenes/${lesson.id}-avatar.png`);
  if (!fileExists(avatarPath)) {
    console.error(`    Missing avatar: ${lesson.id}-avatar.png`);
    return false;
  }

  const avatarFilename = `ucf-${lesson.id}-avatar-ref.png`;
  copyToComfyInput(avatarPath, avatarFilename);

  const workflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json');
  if (!fs.existsSync(workflowPath)) {
    console.error(`    Missing workflow: 02_qwen_Image_edit_subgraphed.json`);
    return false;
  }

  const SHOT_COUNT = 5;
  const SHOT_NAMES = ['Medium-Left', 'Medium-Right', 'MedClose-Center', 'MedClose-Right', 'Close-Center'];

  // V2 approach — all shots from avatar, no chain drift:
  //   Shot 1: DIRECT COPY of avatar (guaranteed correct outfit/background)
  //   Shot 2: Edit from avatar → chest up (medium-tight)
  //   Shot 3: Edit from avatar → collarbone up (medium close-up)
  //   Shot 4: Edit from avatar → head + shoulders (close)
  //   Shot 5: Edit from avatar → face fills frame (tight close-up)

  for (const shotNum of [1, 2, 3, 4, 5]) {
    const shotPath = path.join(shotDir, `shot-${shotNum}.png`);
    if (fileExists(shotPath)) {
      console.log(`    [SKIP] shot-${shotNum}.png exists`);
      continue;
    }

    // Shot 1 = direct copy of avatar (no generation needed)
    if (shotNum === 1) {
      fs.copyFileSync(avatarPath, shotPath);
      console.log(`    Shot 1/${SHOT_COUNT} (${SHOT_NAMES[0]}) — copied from avatar`);
      continue;
    }

    // Shots 2-5: all generated from avatar (no chain, no drift)
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
    workflow['78'].inputs.image = avatarFilename;

    workflow['115:111'].inputs.prompt = buildShotEditPrompt(shotNum, lesson);
    if (workflow['115:110']?.inputs) workflow['115:110'].inputs.prompt = SHOT_NEG;
    if (workflow['115:3']?.inputs) workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
    workflow['60'].inputs.filename_prefix = `avatar-shots/${lesson.id}-shot-${shotNum}`;

    console.log(`    Shot ${shotNum}/${SHOT_COUNT} (${SHOT_NAMES[shotNum - 1]})...`);
    const shotStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId, 300000);
      const outputs = result.outputs?.['60'];
      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, shotPath);
          const elapsed = ((Date.now() - shotStart) / 1000).toFixed(0);
          console.log(`    OK shot-${shotNum}.png (${elapsed}s)`);
        }
      }
    } catch (e) {
      console.error(`    FAIL shot-${shotNum}: ${e.message}`);
      return false;
    }

    await sleep(2000);
  }

  return [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE B: VIDEO SEGMENTS (InfinityTalk)
// 16s segments at 832x480@25fps, cycling through 5 shot angles.
// ~7 min per segment on RTX 4090.
// ═══════════════════════════════════════════════════════════════════════════════

async function stageB_generateSegments(lesson) {
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments/${lesson.id}`);
  ensureDir(segDir);

  // Concat scene audio
  const audioScenesDir = path.join(COURSE_DIR, `media/audio/scenes/${lesson.id}`);
  const vdPath = path.join(COURSE_DIR, `video-scripts/${lesson.id}-video-data.json`);
  if (!fs.existsSync(vdPath)) { console.error(`    Missing video-data`); return []; }
  const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));

  const sceneAudioFiles = vd.scenes
    .map(s => path.join(audioScenesDir, `${lesson.id}-scene-${s.sceneNumber}.wav`))
    .filter(f => fs.existsSync(f));

  if (sceneAudioFiles.length === 0) { console.error(`    No audio files`); return []; }

  const fullAudioPath = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-full.wav`);
  if (sceneAudioFiles.length === 1) {
    execSync(`ffmpeg -y -i "${sceneAudioFiles[0]}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
  } else {
    const concatList = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-audiolist.txt`);
    fs.writeFileSync(concatList, sceneAudioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
    try { fs.unlinkSync(concatList); } catch {}
  }

  const totalDuration = getAudioDuration(fullAudioPath);
  if (totalDuration <= 0) { console.error(`    Zero audio duration`); return []; }

  const numSegments = Math.ceil(totalDuration / EFFECTIVE_DUR);
  console.log(`    Audio: ${totalDuration.toFixed(1)}s -> ${numSegments} segments`);

  // Load InfinityTalk workflow template
  const itWorkflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/infinityTalk - Single -Wan 2.1.json');

  const segmentPaths = [];
  const segStart = Date.now();

  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * EFFECTIVE_DUR;
    const segDur = Math.min(SEG_DURATION, totalDuration - offset);
    if (segDur < 2) break;

    const segVideoPath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}.mp4`);

    if (fileExists(segVideoPath)) {
      console.log(`    [SKIP] seg${seg} exists`);
      segmentPaths.push(segVideoPath);
      continue;
    }

    // Pick shot for this segment
    const shotNum = SHOT_CYCLE[seg % SHOT_CYCLE.length];
    const shotImage = path.join(shotDir, `shot-${shotNum}.png`);
    if (!fileExists(shotImage)) {
      console.error(`    Missing shot: shot-${shotNum}.png`);
      continue;
    }

    // Copy shot image
    const imageFilename = `ucf-${lesson.id}-seg${seg}.png`;
    copyToComfyInput(shotImage, imageFilename);

    // Trim audio for segment
    const audioFilename = `ucf-${lesson.id}-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${fullAudioPath}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, audioFilename)}"`,
      { stdio: 'pipe' }
    );

    // Configure InfinityTalk workflow
    const workflow = JSON.parse(fs.readFileSync(itWorkflowPath, 'utf-8'));

    // Image (node 73)
    workflow['73'].inputs.image = imageFilename;
    // Audio (node 60)
    workflow['60'].inputs.audio = audioFilename;
    workflow['60'].inputs.audioUI = '';
    // Prompt (node 54) — static background to prevent car/environment animation
    workflow['54'].inputs.positive_prompt = INFINITYTALK_PROMPTS[lesson.presenter];
    workflow['54'].inputs.negative_prompt = INFINITYTALK_NEG;
    // Models — fp8 matching pair (CRITICAL)
    workflow['52'].inputs.model = 'Wan2_1-InfiniteTalk-Single_fp8_e4m3fn_scaled_KJ.safetensors';
    workflow['71'].inputs.model = 'Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors';
    workflow['71'].inputs.base_precision = 'fp16_fast';
    // Output (node 61)
    workflow['61'].inputs.save_output = true;
    workflow['61'].inputs.filename_prefix = `video/ucf-${lesson.id}-seg${seg}`;
    // Random seed
    workflow['70'].inputs.seed = Math.floor(Math.random() * 1e15);

    const shotName = ['Wide', 'Medium', 'Close-up', '3/4', 'Med-Wide'][shotNum - 1];
    console.log(`    [${timestamp()}] Seg ${seg + 1}/${numSegments}: shot-${shotNum} (${shotName}), ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s`);

    const thisSegStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      // InfinityTalk outputs under 'gifs' key (VHS_VideoCombine)
      const outputs = result.outputs?.['61'];
      if (outputs?.gifs?.[0]) {
        const vid = outputs.gifs[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, vid.subfolder || '', vid.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, segVideoPath);
          segmentPaths.push(segVideoPath);
          const elapsed = ((Date.now() - thisSegStart) / 1000).toFixed(0);
          console.log(`    OK seg${seg} (${elapsed}s) — shot-${shotNum}`);
        } else {
          console.error(`    FAIL seg${seg} output file not found`);
        }
      } else {
        console.error(`    FAIL seg${seg} no output in result`);
      }
    } catch (e) {
      console.error(`    FAIL seg${seg}: ${e.message}`);
    }

    if (seg < numSegments - 1) await sleep(5000);
  }

  // Keep full audio for Stage C
  const stableAudioPath = path.join(segDir, 'full-audio-original.wav');
  if (fs.existsSync(fullAudioPath)) {
    fs.copyFileSync(fullAudioPath, stableAudioPath);
    try { fs.unlinkSync(fullAudioPath); } catch {}
  }

  const totalElapsed = ((Date.now() - segStart) / 1000 / 60).toFixed(1);
  console.log(`    Segments: ${segmentPaths.length}/${numSegments} generated in ${totalElapsed}min`);

  return segmentPaths;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE C: ASSEMBLY (Hard cut + original audio mux)
// Segments overlap by CROSSFADE (1.5s) in audio. For a hard cut:
//   seg0: use first EFFECTIVE_DUR (14.5s) — lip-sync covers audio 0→14.5s
//   seg1+: use first EFFECTIVE_DUR — lip-sync starts right at the boundary
//   last seg: use full length
// Then mux the original Qwen3-TTS audio on top.
// ═══════════════════════════════════════════════════════════════════════════════

function stageC_assembleVideo(lesson, segmentPaths) {
  if (segmentPaths.length === 0) { console.error(`    No segments to assemble`); return null; }

  const outputPath = path.join(COURSE_DIR, `media/video/avatars/${lesson.id}-avatar.mp4`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments/${lesson.id}`);
  const originalAudio = path.join(segDir, 'full-audio-original.wav');
  const useOriginalAudio = fs.existsSync(originalAudio);

  if (useOriginalAudio) console.log(`    Using original Qwen3-TTS audio`);

  if (segmentPaths.length === 1) {
    if (useOriginalAudio) {
      execSync(
        `ffmpeg -y -i "${segmentPaths[0]}" -i "${originalAudio}" -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast -c:a aac -b:a 192k -shortest "${outputPath}"`,
        { stdio: 'pipe' }
      );
    } else {
      fs.copyFileSync(segmentPaths[0], outputPath);
    }
    return outputPath;
  }

  // Hard cut assembly: seg0 trim to SEG_DURATION, middle segs skip CROSSFADE + trim to EFFECTIVE_DUR, last seg skip CROSSFADE + use rest
  console.log(`    Assembling ${segmentPaths.length} segments with hard cuts...`);

  const cutPaths = [];
  const lastIdx = segmentPaths.length - 1;
  for (let i = 0; i < segmentPaths.length; i++) {
    const cutFile = path.join(segDir, `cut-${String(i).padStart(3, '0')}.mp4`);
    if (i === 0) {
      // First segment: trim to exactly SEG_DURATION (InfinityTalk outputs ~17.6s for 16s audio)
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -t ${SEG_DURATION} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    } else if (i < lastIdx) {
      // Middle segments: skip CROSSFADE morph zone, trim to exactly EFFECTIVE_DUR
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -t ${EFFECTIVE_DUR} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    } else {
      // Last segment: skip CROSSFADE morph zone, use the rest (no duration trim)
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    }
    cutPaths.push(cutFile);
  }

  // Concat all cut segments
  const videoOnlyPath = path.join(segDir, 'assembled-video-only.mp4');
  const concatList = path.join(segDir, 'concat-list.txt');
  fs.writeFileSync(concatList, cutPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -an -c:v copy "${videoOnlyPath}"`,
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
  );
  console.log(`    Hard cut concat complete`);

  // Mux original audio and truncate to match audio duration
  if (useOriginalAudio && fs.existsSync(videoOnlyPath)) {
    const audioDur = getAudioDuration(originalAudio);
    const tempMuxed = path.join(segDir, 'muxed-temp.mp4');
    execSync(
      `ffmpeg -y -i "${videoOnlyPath}" -i "${originalAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${tempMuxed}"`,
      { stdio: 'pipe' }
    );
    // Truncate to exact audio duration (last segment may extend beyond audio end)
    execSync(
      `ffmpeg -y -i "${tempMuxed}" -t ${audioDur} -c:v copy -c:a copy "${outputPath}"`,
      { stdio: 'pipe' }
    );
    try { fs.unlinkSync(tempMuxed); } catch {}
    console.log(`    Original audio muxed -> ${lesson.id}-avatar.mp4 (${audioDur.toFixed(1)}s)`);
  } else if (fs.existsSync(videoOnlyPath)) {
    fs.renameSync(videoOnlyPath, outputPath);
  }

  // Cleanup temp files
  try { fs.unlinkSync(videoOnlyPath); } catch {}
  for (const f of cutPaths) { try { fs.unlinkSync(f); } catch {} }
  try { fs.unlinkSync(concatList); } catch {}

  return outputPath;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS ONE LESSON (A → B → C)
// ═══════════════════════════════════════════════════════════════════════════════

async function processLesson(lesson, skipShots = false) {
  const lessonStart = Date.now();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${lesson.id.toUpperCase()} | Module ${lesson.module} | ${lesson.presenter.toUpperCase()}`);
  console.log(`  Outfit: ${OUTFITS[lesson.module]}`);
  console.log(`${'═'.repeat(60)}`);

  // Stage A: Shot generation
  if (!skipShots) {
    console.log(`\n  [STAGE A] Shot Generation (Qwen Image Edit)`);
    const shotsOk = await stageA_generateShots(lesson);
    if (!shotsOk) {
      console.error(`  Shot generation failed — skipping lesson`);
      return false;
    }

    // Free VRAM after Qwen before loading InfinityTalk models
    await freeVRAM();
    await sleep(3000);
  } else {
    const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
    const allExist = [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
    if (!allExist) {
      console.error(`  --skip-shots used but shots missing — skipping lesson`);
      return false;
    }
    console.log(`  [STAGE A] Skipped — shots verified`);
  }

  // Stage B: Video segments
  console.log(`\n  [STAGE B] Video Segments (InfinityTalk fp8)`);
  const segmentPaths = await stageB_generateSegments(lesson);
  if (segmentPaths.length === 0) {
    console.error(`  No segments generated — skipping lesson`);
    return false;
  }

  // Stage C: Assembly
  console.log(`\n  [STAGE C] Assembly (FFmpeg crossfade)`);
  const outputPath = stageC_assembleVideo(lesson, segmentPaths);
  if (!outputPath || !fileExists(outputPath)) {
    console.error(`  Assembly failed`);
    return false;
  }

  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  const videoDuration = getAudioDuration(outputPath);
  const totalElapsed = ((Date.now() - lessonStart) / 1000 / 60).toFixed(1);

  console.log(`\n  COMPLETE: ${lesson.id}-avatar.mp4`);
  console.log(`    ${segmentPaths.length} segments | ${videoDuration.toFixed(0)}s | ${fileSizeMB}MB | ${totalElapsed}min`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

function loadProgress() {
  const fp = path.join(COURSE_DIR, '.infinitytalk-progress.json');
  if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  return { completed: {}, errors: {}, startedAt: null };
}

function saveProgress(progress) {
  fs.writeFileSync(path.join(COURSE_DIR, '.infinitytalk-progress.json'), JSON.stringify(progress, null, 2) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const lessonFilter = args.includes('--lesson') ? args[args.indexOf('--lesson') + 1] : null;
  const startFrom = args.includes('--start') ? args[args.indexOf('--start') + 1] : null;
  const skipShots = args.includes('--skip-shots');
  const force = args.includes('--force');
  const shotsOnly = args.includes('--shots-only');
  const videosOnly = args.includes('--videos-only');

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  INFINITYTALK AVATAR PIPELINE — UCF Business Course');
  console.log('═'.repeat(60));
  console.log(`  TWO-PASS ARCHITECTURE:`);
  console.log(`    Pass 1: Qwen Image Edit → 5 shots/lesson (ALL lessons)`);
  console.log(`    Pass 2: InfinityTalk fp8 → ${SEG_DURATION}s segments + FFmpeg assembly`);
  console.log(`  Output: 832x480 @ 25fps, H.264`);
  console.log(`  Lessons: ${lessonFilter || `ALL (${LESSONS.length})`}`);
  console.log(`  Skip shots: ${skipShots}, Force: ${force}`);
  if (shotsOnly) console.log(`  MODE: Shots only (Stage A)`);
  if (videosOnly) console.log(`  MODE: Videos only (Stage B+C)`);
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log();

  if (!await comfyuiHealthCheck()) {
    console.error('ERROR: ComfyUI not reachable at', COMFYUI_URL);
    process.exit(1);
  }
  console.log('  ComfyUI: Connected');

  const progress = loadProgress();
  if (!progress.startedAt) progress.startedAt = new Date().toISOString();

  let lessons = LESSONS;
  if (lessonFilter) lessons = LESSONS.filter(l => l.id === lessonFilter);
  if (startFrom) {
    const idx = LESSONS.findIndex(l => l.id === startFrom);
    if (idx >= 0) lessons = LESSONS.slice(idx);
  }

  const pipelineStart = Date.now();

  // ─── PASS 1: ALL SHOT IMAGES (Qwen Image Edit) ───────────────────────
  if (!skipShots && !videosOnly) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  PASS 1: SHOT GENERATION — ${lessons.length} lessons × 5 shots`);
    console.log(`${'─'.repeat(60)}`);

    let shotSuccess = 0, shotFail = 0, shotSkip = 0;
    const passAStart = Date.now();

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      console.log(`\n  [${i + 1}/${lessons.length}] ${lesson.id} | Module ${lesson.module} | ${lesson.presenter}`);

      try {
        const shotsOk = await stageA_generateShots(lesson);
        if (shotsOk) {
          // Check if it was a skip (all existed) or new generation
          const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
          const allExisted = [1, 2, 3, 4, 5].every(n => {
            const f = path.join(shotDir, `shot-${n}.png`);
            return fs.existsSync(f) && fs.statSync(f).mtimeMs < passAStart;
          });
          if (allExisted) { shotSkip++; } else { shotSuccess++; }
        } else {
          shotFail++;
          progress.errors[lesson.id] = { timestamp: new Date().toISOString(), error: 'Shot generation failed' };
          saveProgress(progress);
        }
      } catch (e) {
        console.error(`    FATAL: ${e.message}`);
        shotFail++;
        progress.errors[lesson.id] = { timestamp: new Date().toISOString(), error: e.message };
        saveProgress(progress);
        await freeVRAM();
        await sleep(5000);
      }

      // Brief pause between lessons (Qwen is fast, ~30s/lesson)
      if (i < lessons.length - 1) await sleep(2000);
    }

    const passATime = (Date.now() - passAStart) / 1000;
    console.log(`\n  PASS 1 COMPLETE: ${shotSuccess} generated, ${shotSkip} skipped, ${shotFail} failed (${formatTime(passATime)})`);

    if (shotFail > 0) {
      console.log('  WARNING: Some shots failed. Failed lessons will be skipped in Pass 2.');
    }
  } else {
    console.log(`\n  PASS 1: SKIPPED (${skipShots ? '--skip-shots' : '--videos-only'})`);
  }

  // ─── FREE VRAM BETWEEN PASSES ────────────────────────────────────────
  if (!shotsOnly) {
    console.log('\n  Unloading Qwen models, freeing VRAM for InfinityTalk...');
    await freeVRAM();
    await sleep(5000);
  }

  // ─── PASS 2: ALL VIDEO SEGMENTS + ASSEMBLY (InfinityTalk + FFmpeg) ───
  if (!shotsOnly) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  PASS 2: VIDEO GENERATION — ${lessons.length} lessons`);
    console.log(`${'─'.repeat(60)}`);

    let vidComplete = 0, vidErrors = 0, vidSkipped = 0;
    const passBStart = Date.now();

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];

      // Skip if final output exists (unless --force)
      const outputPath = path.join(COURSE_DIR, `media/video/avatars/${lesson.id}-avatar.mp4`);
      if (!force && fileExists(outputPath)) {
        console.log(`\n  [SKIP] ${lesson.id}-avatar.mp4 already exists`);
        vidSkipped++;
        continue;
      }

      // Verify shots exist before attempting video
      const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
      const allShots = [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
      if (!allShots) {
        console.log(`\n  [SKIP] ${lesson.id} — missing shots, cannot generate video`);
        vidErrors++;
        continue;
      }

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  [${i + 1}/${lessons.length}] ${lesson.id.toUpperCase()} | Module ${lesson.module} | ${lesson.presenter.toUpperCase()}`);
      console.log(`${'═'.repeat(60)}`);

      try {
        // Stage B: Video segments
        console.log(`\n  [STAGE B] Video Segments (InfinityTalk fp8)`);
        const segmentPaths = await stageB_generateSegments(lesson);
        if (segmentPaths.length === 0) {
          console.error(`  No segments generated — skipping lesson`);
          vidErrors++;
          progress.errors[lesson.id] = { timestamp: new Date().toISOString(), error: 'No segments' };
          saveProgress(progress);
          continue;
        }

        // Stage C: Assembly
        console.log(`\n  [STAGE C] Assembly (FFmpeg crossfade)`);
        const finalPath = stageC_assembleVideo(lesson, segmentPaths);
        if (!finalPath || !fileExists(finalPath)) {
          console.error(`  Assembly failed`);
          vidErrors++;
          progress.errors[lesson.id] = { timestamp: new Date().toISOString(), error: 'Assembly failed' };
          saveProgress(progress);
          continue;
        }

        const fileSizeMB = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
        const videoDuration = getAudioDuration(finalPath);
        vidComplete++;
        progress.completed[lesson.id] = { timestamp: new Date().toISOString(), duration: videoDuration, sizeMB: parseFloat(fileSizeMB), segments: segmentPaths.length };
        delete progress.errors[lesson.id];
        saveProgress(progress);

        console.log(`\n  COMPLETE: ${lesson.id}-avatar.mp4`);
        console.log(`    ${segmentPaths.length} segments | ${videoDuration.toFixed(0)}s | ${fileSizeMB}MB`);

        // ETA for remaining
        if (vidComplete > 0 && i < lessons.length - 1) {
          const avgTime = (Date.now() - passBStart) / 1000 / vidComplete;
          const remaining = lessons.filter((l, j) => j > i && !fileExists(path.join(COURSE_DIR, `media/video/avatars/${l.id}-avatar.mp4`))).length;
          if (remaining > 0) {
            console.log(`  ETA: ~${formatTime(remaining * avgTime)} for ${remaining} remaining lessons`);
          }
        }

      } catch (e) {
        console.error(`\n  FATAL ERROR on ${lesson.id}: ${e.message}`);
        vidErrors++;
        progress.errors[lesson.id] = { timestamp: new Date().toISOString(), error: e.message };
        saveProgress(progress);
        await freeVRAM();
        await sleep(10000);
      }

      // Rest between lessons
      if (i < lessons.length - 1) {
        console.log('  Cooling down (10s)...');
        await sleep(10000);
      }
    }

    const passBTime = (Date.now() - passBStart) / 1000;
    console.log(`\n  PASS 2 COMPLETE: ${vidComplete} videos, ${vidErrors} errors, ${vidSkipped} skipped (${formatTime(passBTime)})`);
  }

  // ─── FINAL SUMMARY ───────────────────────────────────────────────────
  const totalElapsed = (Date.now() - pipelineStart) / 1000;
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  PIPELINE COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  Total time: ${formatTime(totalElapsed)}`);

  if (Object.keys(progress.errors).length > 0) {
    console.log('\n  Failed lessons:');
    for (const [lid, info] of Object.entries(progress.errors)) {
      console.log(`    ${lid}: ${info.error}`);
    }
  }

  if (Object.keys(progress.completed).length > 0) {
    console.log(`\n  Completed: ${Object.keys(progress.completed).length}/${LESSONS.length} lessons`);
  }

  progress.completedAt = new Date().toISOString();
  saveProgress(progress);
  console.log(`\n  Finished: ${new Date().toLocaleString()}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

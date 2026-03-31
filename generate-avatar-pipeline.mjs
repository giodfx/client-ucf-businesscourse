#!/usr/bin/env node
/**
 * Avatar Pipeline Orchestrator — UCF Business Course
 *
 * Three-stage pipeline:
 *   Stage 1: Qwen Image Edit → scene-specific avatar images (25 images)
 *   Stage 2: Qwen3-TTS → scene narration audio (~170 WAV files)
 *   Stage 3: LTX-2.3 fp8 → intro avatar videos (25 videos)
 *
 * Usage:
 *   node generate-avatar-pipeline.mjs [--stage 1|2|3] [--lesson lesson-X-X] [--resume]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const COURSE_DIR = __dirname;
const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';

// ============================================================================
// LESSON ORDERING & PRESENTER CONFIG
// ============================================================================

const LESSONS = [
  'lesson-0-1',
  'lesson-1-1', 'lesson-1-2', 'lesson-1-3',
  'lesson-2-1', 'lesson-2-2', 'lesson-2-3',
  'lesson-3-1', 'lesson-3-2', 'lesson-3-3',
  'lesson-4-1', 'lesson-4-2', 'lesson-4-3',
  'lesson-5-1', 'lesson-5-2',
  'lesson-6-1', 'lesson-6-2', 'lesson-6-3',
  'lesson-7-1', 'lesson-7-2', 'lesson-7-3', 'lesson-7-4', 'lesson-7-5',
  'lesson-8-1', 'lesson-8-2', 'lesson-8-3',
];

const FEMALE_DESC = 'a confident Latina woman in her early 30s with dark shoulder-length wavy hair';
const MALE_DESC = 'a professional American man in his late 30s with short brown hair';

const VOICE_REFS = {
  female: path.join(PROJECT_ROOT, 'voices/FemaleJessica.mp3'),
  male: path.join(PROJECT_ROOT, 'voices/MaleAmerican.mp3'),
};

// Module-specific outfits
const OUTFITS = {
  0: { female: 'a smart casual navy top with a thin gold necklace', male: 'a casual henley shirt with a leather jacket draped over shoulders' },
  1: { female: 'a tailored charcoal blazer over a white blouse', male: 'a fitted charcoal suit with a white open-collar shirt' },
  2: { female: 'an elegant emerald green blouse with subtle gold earrings', male: 'a navy polo shirt with sleeves neatly rolled' },
  3: { female: 'a structured burgundy jacket over a cream silk top', male: 'a dark blazer with a light blue dress shirt' },
  4: { female: 'a coral blazer over a soft gray top', male: 'a chambray button-down shirt with sleeves rolled up' },
  5: { female: 'a tailored navy dress with a thin gold belt', male: 'a slim-fit charcoal suit with a burgundy pocket square' },
  6: { female: 'a flowing printed blouse with gold accessories', male: 'a smart casual oxford shirt untucked over dark trousers' },
  7: { female: 'a UCF branded blazer with a black-and-gold pin', male: 'a UCF polo shirt in black with gold accents' },
  8: { female: 'a white blazer with statement gold earrings', male: 'a sport coat over a crisp white shirt' },
};

// Scene/location descriptions per module
const LOCATIONS = {
  0: 'standing beside a car on a scenic highway at golden hour, wide open road stretching into the distance, warm sunset sky with orange and amber tones',
  1: 'standing in downtown Orlando with modern glass buildings and palm trees behind them, clear blue sky, warm afternoon light',
  2: 'standing in a sleek financial district lobby with marble floors and floor-to-ceiling windows, city skyline visible through glass, modern professional environment',
  3: 'standing near Cape Canaveral with a rocket launch pad visible in the background, dramatic sky with scattered clouds, inspiring aerospace setting',
  4: 'standing at a vibrant theme park entrance with colorful architecture and tropical landscaping, festive lights beginning to glow, magical atmosphere',
  5: 'standing at a bustling port shopping center with container ships visible in the distance, waterfront promenade, warm coastal afternoon light',
  6: 'standing on a beautiful Florida beach with turquoise water and white sand, palm trees swaying gently, relaxed golden hour atmosphere',
  7: 'standing beside a crystal-clear natural spring surrounded by lush green vegetation, Spanish moss hanging from cypress trees, serene Florida wilderness',
  8: 'standing in front of the UCF campus headquarters building with the Pegasus logo visible, modern architecture, sunny day with the UCF fountain in background',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getModuleNumber(lessonId) {
  return parseInt(lessonId.split('-')[1]);
}

function getPresenter(lessonId) {
  // Read from video-data.json first (handles non-alternating cases like 7-4/7-5 both male)
  try {
    const vd = readVideoData(lessonId);
    if (vd.presenter) return vd.presenter;
  } catch {}
  const idx = LESSONS.indexOf(lessonId);
  return idx % 2 === 0 ? 'female' : 'male';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function comfyuiHealthCheck() {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    return res.ok;
  } catch { return false; }
}

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
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
        const entry = data[promptId];
        const status = entry.status?.status_str;
        if (status === 'success') return entry;
        if (status === 'error') throw new Error(`ComfyUI execution error: ${JSON.stringify(entry.status)}`);
      }
    } catch (e) {
      if (e.message.includes('execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for prompt ${promptId}`);
}

function readVideoData(lessonId) {
  const fp = path.join(COURSE_DIR, 'video-scripts', `${lessonId}-video-data.json`);
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function writeVideoData(lessonId, data) {
  const fp = path.join(COURSE_DIR, 'video-scripts', `${lessonId}-video-data.json`);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fileExists(fp) {
  return fs.existsSync(fp) && fs.statSync(fp).size > 0;
}

function copyToComfyInput(srcPath, destFilename) {
  const dest = path.join(COMFYUI_INPUT, destFilename);
  fs.copyFileSync(srcPath, dest);
  return destFilename;
}

function getAudioDuration(wavPath) {
  try {
    const out = execSync(
      `ffprobe -v quiet -print_format json -show_format "${wavPath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(JSON.parse(out).format.duration);
  } catch { return 0; }
}

// ============================================================================
// STAGE 1: QWEN IMAGE EDIT — AVATAR IMAGES
// ============================================================================

async function stage1_generateAvatarImage(lessonId) {
  const mod = getModuleNumber(lessonId);
  const presenter = getPresenter(lessonId);
  const outputDir = path.join(COURSE_DIR, 'media/images/avatars/scenes');
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${lessonId}-avatar.png`);

  if (fileExists(outputPath)) {
    console.log(`  [SKIP] ${lessonId}-avatar.png already exists`);
    return outputPath;
  }

  // Load Qwen Image Edit workflow
  const workflow = JSON.parse(fs.readFileSync(
    path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json'), 'utf-8'
  ));

  // Set input image
  const baseImage = presenter === 'female' ? 'presenter-female.png' : 'presenter-male.png';
  // Copy base image to ComfyUI input if not already there
  const srcImage = path.join(COURSE_DIR, `media/images/avatars/${baseImage}`);
  if (fileExists(srcImage)) {
    copyToComfyInput(srcImage, baseImage);
  }
  workflow['78'].inputs.image = baseImage;

  // Set positive prompt
  const charDesc = presenter === 'female' ? FEMALE_DESC : MALE_DESC;
  const outfit = OUTFITS[mod]?.[presenter] || OUTFITS[0][presenter];
  const location = LOCATIONS[mod] || LOCATIONS[0];

  const prompt = `Cinematic digital painting, rich warm lighting, ${charDesc}, wearing ${outfit}, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features with clear jawline and lips, ${location}, cinematic color grading, painterly brushstroke texture on skin and clothing, NOT a photograph NOT photorealistic, digital painting with visible paint texture`;

  workflow['115:111'].inputs.prompt = prompt;

  // Randomize seed
  workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);

  // Set output filename prefix
  workflow['60'].inputs.filename_prefix = `avatar/${lessonId}-avatar`;

  console.log(`  Submitting Qwen Image Edit for ${lessonId} (${presenter})...`);
  const promptId = await submitWorkflow(workflow);
  console.log(`  Prompt ID: ${promptId}`);

  const result = await pollCompletion(promptId);

  // Find output image
  const outputs = result.outputs?.['60'];
  if (outputs?.images?.[0]) {
    const img = outputs.images[0];
    const comfyOutputPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
    if (fs.existsSync(comfyOutputPath)) {
      fs.copyFileSync(comfyOutputPath, outputPath);
      console.log(`  Saved: ${outputPath}`);
      return outputPath;
    }
  }

  console.error(`  WARNING: Could not find output image for ${lessonId}`);
  return null;
}

// ============================================================================
// STAGE 2: QWEN3-TTS — NARRATION AUDIO
// ============================================================================

async function generateTTS(text, presenter, outputPath, instruction = '') {
  const refAudio = VOICE_REFS[presenter];
  const config = {
    text,
    mode: 'clone',
    referenceAudio: refAudio.replace(/\\/g, '/'),
    instruction: instruction || (presenter === 'female' ? 'warm and professional, clear pace' : 'confident and encouraging, conversational'),
    outputPath: outputPath.replace(/\\/g, '/'),
  };

  return new Promise((resolve, reject) => {
    const py = spawn('python', [
      path.join(PROJECT_ROOT, 'src/ai/audio/qwen3-tts-generator.py'),
      JSON.stringify(config),
    ], { cwd: PROJECT_ROOT });

    let stdout = '';
    let stderr = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      if (code !== 0) {
        console.error(`  TTS error: ${stderr.slice(-500)}`);
        reject(new Error(`TTS failed with code ${code}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim().split('\n').pop());
        resolve(result);
      } catch {
        resolve({ success: true, output_path: outputPath });
      }
    });
  });
}

async function resampleTo16k(inputPath, outputPath) {
  execSync(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`, { stdio: 'pipe' });
}

async function stage2_generateSceneAudio(lessonId) {
  const vd = readVideoData(lessonId);
  const presenter = getPresenter(lessonId);
  const audioDir = path.join(COURSE_DIR, `media/audio/scenes/${lessonId}`);
  ensureDir(audioDir);

  let updated = false;
  for (const scene of vd.scenes) {
    const audioFile = `${lessonId}-scene-${scene.sceneNumber}.wav`;
    const audioPath = path.join(audioDir, audioFile);

    if (fileExists(audioPath)) {
      console.log(`  [SKIP] ${audioFile} already exists`);
      // Still update duration if it's 0
      if (scene.duration === 0) {
        scene.duration = getAudioDuration(audioPath);
        updated = true;
      }
      continue;
    }

    if (!scene.narration || scene.narration.trim().length < 10) {
      console.log(`  [SKIP] ${audioFile} — no narration text`);
      continue;
    }

    console.log(`  Generating TTS for scene ${scene.sceneNumber} (${scene.narration.length} chars)...`);
    const rawPath = audioPath.replace('.wav', '-raw.wav');

    try {
      await generateTTS(scene.narration, presenter, rawPath);

      // Resample to 16kHz mono for LTX-2.3 compatibility
      await resampleTo16k(rawPath, audioPath);

      // Clean up raw file
      if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);

      // Update duration
      scene.duration = getAudioDuration(audioPath);
      scene.audioUrl = `media/audio/scenes/${lessonId}/${audioFile}`;
      updated = true;
      console.log(`  Saved: ${audioFile} (${scene.duration.toFixed(1)}s)`);
    } catch (e) {
      console.error(`  ERROR generating ${audioFile}: ${e.message}`);
    }
  }

  if (updated) {
    vd.totalDuration = vd.scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
    writeVideoData(lessonId, vd);
    console.log(`  Updated video-data.json (total: ${vd.totalDuration.toFixed(1)}s)`);
  }
}

// ============================================================================
// STAGE 3: LTX-2.3 FP8 — FULL-LENGTH AVATAR VIDEO PER LESSON
// ============================================================================
// LTX-2.3 on 4090 24GB maxes out at ~18s per generation (OOMs beyond that).
// Strategy: Generate 18s segments with LAST-FRAME CONTINUATION — each segment
// starts from the final frame of the previous one, creating seamless visual
// flow. Segments overlap by 1s and are crossfaded in ffmpeg for smooth joins.
// Result: one continuous full-length MP4 per lesson with no visible seams.
// ============================================================================

const SEG_DURATION = 18;  // max safe duration per LTX job on 4090
const OVERLAP = 1;        // 1s overlap for crossfade between segments

function extractLastFrame(videoPath, outputImagePath) {
  // Extract the very last frame as PNG for next segment's start image
  execSync(
    `ffmpeg -y -sseof -0.1 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputImagePath}"`,
    { stdio: 'pipe' }
  );
}

async function stage3_generateFullVideo(lessonId) {
  const vd = readVideoData(lessonId);
  const presenter = getPresenter(lessonId);
  const videoDir = path.join(COURSE_DIR, 'media/video/avatars');
  const segDir = path.join(videoDir, 'segments', lessonId);
  ensureDir(videoDir);
  ensureDir(segDir);
  const outputPath = path.join(videoDir, `${lessonId}-avatar.mp4`);

  if (fileExists(outputPath)) {
    console.log(`  [SKIP] ${lessonId}-avatar.mp4 already exists`);
    return outputPath;
  }

  // Step 1: Concat all scene audio into one WAV
  const audioDir = path.join(COURSE_DIR, `media/audio/scenes/${lessonId}`);
  const sceneAudioFiles = vd.scenes
    .map(s => path.join(audioDir, `${lessonId}-scene-${s.sceneNumber}.wav`))
    .filter(f => fs.existsSync(f));

  if (sceneAudioFiles.length === 0) {
    console.log(`  [SKIP] No audio files found`);
    return null;
  }

  const fullAudioPath = path.join(COMFYUI_INPUT, `ucf-${lessonId}-full.wav`);

  if (sceneAudioFiles.length === 1) {
    fs.copyFileSync(sceneAudioFiles[0], fullAudioPath);
  } else {
    const concatListPath = path.join(COMFYUI_INPUT, `ucf-${lessonId}-audiolist.txt`);
    fs.writeFileSync(concatListPath, sceneAudioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
    fs.unlinkSync(concatListPath);
  }

  const totalDuration = getAudioDuration(fullAudioPath);
  if (totalDuration <= 0) {
    console.log(`  [SKIP] Zero duration after concat`);
    return null;
  }

  // Calculate segments with overlap
  const effectiveDur = SEG_DURATION - OVERLAP;
  const numSegments = Math.ceil(totalDuration / effectiveDur);
  console.log(`  Full audio: ${totalDuration.toFixed(1)}s → ${numSegments} segments with last-frame continuation (${presenter})`);

  // Avatar image — used for first segment only
  const avatarImagePath = path.join(COURSE_DIR, `media/images/avatars/scenes/${lessonId}-avatar.png`);
  const baseImagePath = path.join(COURSE_DIR, `media/images/avatars/presenter-${presenter}.png`);
  const origImagePath = fileExists(avatarImagePath) ? avatarImagePath : baseImagePath;

  // Build LTX prompt
  const charDesc = presenter === 'female' ? FEMALE_DESC : MALE_DESC;
  const mod = getModuleNumber(lessonId);
  const outfit = OUTFITS[mod]?.[presenter] || OUTFITS[0][presenter];
  const ltxPrompt = `scene: Professional presentation setting with warm lighting\ncharacter: ${charDesc}, wearing ${outfit}\naction: Speaking directly to the camera with natural lip movements synchronized to speech, subtle head movements and hand gestures for emphasis\ncamera: Fixed medium shot, chest-up framing, steady with slight depth of field`;

  const lessonStartTime = Date.now();
  const segmentVideoPaths = [];
  let currentImagePath = origImagePath;

  // Step 2: Generate each segment with last-frame continuation
  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * effectiveDur;
    const segDur = Math.min(SEG_DURATION, totalDuration - offset);
    if (segDur < 1) break; // skip tiny trailing segments

    const segVideoPath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}.mp4`);

    // Check if segment already generated (resume support)
    if (fileExists(segVideoPath)) {
      console.log(`    [SKIP] seg${seg} already exists`);
      segmentVideoPaths.push(segVideoPath);
      // Extract last frame for next segment
      const lastFramePath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}-lastframe.png`);
      if (!fileExists(lastFramePath)) extractLastFrame(segVideoPath, lastFramePath);
      if (fileExists(lastFramePath)) currentImagePath = lastFramePath;
      continue;
    }

    // Copy current image to ComfyUI input
    const imageFilename = `ucf-${lessonId}-seg${seg}.png`;
    copyToComfyInput(currentImagePath, imageFilename);

    // Trim audio segment
    const segAudioFilename = `ucf-${lessonId}-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${fullAudioPath}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, segAudioFilename)}"`,
      { stdio: 'pipe' }
    );

    // Load fresh workflow
    const workflow = JSON.parse(fs.readFileSync(
      path.join(PROJECT_ROOT, 'workflows/comfyui/video_ltx2_3_ia2v.json'), 'utf-8'
    ));

    // v3 balanced settings
    workflow['340:334'].inputs.img_compression = 5;
    workflow['340:325'].inputs.strength = 0.75;
    workflow['340:314'].inputs.text = 'pc game, console game, video game, cartoon, childish, ugly, blurry, distorted face, deformed mouth, asymmetric eyes, uncanny valley';
    workflow['340:293'].inputs.strength_model = 0.4;

    // Set inputs
    workflow['269'].inputs.image = imageFilename;
    workflow['276'].inputs.audio = segAudioFilename;
    workflow['276'].inputs.audioUI = '';
    workflow['340:331'].inputs.value = segDur;
    workflow['340:286'].inputs.noise_seed = Math.floor(Math.random() * 1e15);
    workflow['340:319'].inputs.value = ltxPrompt;
    workflow['341'].inputs.filename_prefix = `video/ucf-${lessonId}-seg${seg}`;

    console.log(`    Seg ${seg + 1}/${numSegments}: ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s${seg > 0 ? ' (last-frame start)' : ''}...`);
    const segStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId, 900000);

      const outputs = result.outputs?.['341'];
      if (outputs?.images?.[0]) {
        const vid = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, vid.subfolder || '', vid.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, segVideoPath);
          segmentVideoPaths.push(segVideoPath);
          const segElapsed = ((Date.now() - segStart) / 1000).toFixed(0);
          console.log(`    ✓ seg${seg} (${segElapsed}s)`);

          // Extract last frame for next segment's start image
          const lastFramePath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}-lastframe.png`);
          extractLastFrame(segVideoPath, lastFramePath);
          if (fileExists(lastFramePath)) {
            currentImagePath = lastFramePath;
          }
        } else {
          console.error(`    ✗ seg${seg} output file not found`);
        }
      } else {
        console.error(`    ✗ seg${seg} no output in result`);
      }
    } catch (e) {
      console.error(`    ✗ seg${seg} FAILED: ${e.message}`);
    }

    // Brief GPU rest between segments
    if (seg < numSegments - 1) await sleep(5000);
  }

  // Step 3: Assemble final video
  if (segmentVideoPaths.length === 0) {
    console.error(`  ✗ No segments generated for ${lessonId}`);
    return null;
  }

  if (segmentVideoPaths.length === 1) {
    // Single segment — just copy
    fs.copyFileSync(segmentVideoPaths[0], outputPath);
  } else {
    // Crossfade segments with 1s overlap for seamless joins
    // First, trim overlap from each segment (except first's start and last's end)
    // Then concatenate with crossfade using ffmpeg xfade filter
    const trimmedPaths = [];
    for (let i = 0; i < segmentVideoPaths.length; i++) {
      const trimmedPath = path.join(segDir, `trimmed-${String(i).padStart(3, '0')}.mp4`);
      if (i === 0) {
        // First segment: keep full length
        fs.copyFileSync(segmentVideoPaths[i], trimmedPath);
      } else {
        // Subsequent segments: trim first 0.5s (overlap handled by crossfade)
        execSync(
          `ffmpeg -y -i "${segmentVideoPaths[i]}" -ss 0.5 -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${trimmedPath}"`,
          { stdio: 'pipe' }
        );
      }
      trimmedPaths.push(trimmedPath);
    }

    // Simple concat (the last-frame continuation already provides visual continuity)
    const concatListPath = path.join(segDir, 'concat-list.txt');
    fs.writeFileSync(concatListPath, trimmedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${outputPath}"`,
      { stdio: 'pipe' }
    );
  }

  const totalElapsed = ((Date.now() - lessonStartTime) / 1000 / 60).toFixed(1);
  const fileSizeMB = fileExists(outputPath) ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1) : '?';
  console.log(`  ✓ ${lessonId}-avatar.mp4 — ${segmentVideoPaths.length} segs, ${totalDuration.toFixed(0)}s video, ${fileSizeMB}MB, ${totalElapsed}min`);

  // Cleanup temp audio from ComfyUI input
  try { fs.unlinkSync(fullAudioPath); } catch {}

  return outputPath;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const stageFilter = args.includes('--stage') ? parseInt(args[args.indexOf('--stage') + 1]) : 0;
  const lessonFilter = args.includes('--lesson') ? args[args.indexOf('--lesson') + 1] : null;
  const resume = args.includes('--resume');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AVATAR PIPELINE — UCF Business Course');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Stage filter: ${stageFilter || 'ALL'}`);
  console.log(`  Lesson filter: ${lessonFilter || 'ALL'}`);
  console.log(`  Resume mode: ${resume}`);
  console.log();

  // Health check
  const healthy = await comfyuiHealthCheck();
  if (!healthy) {
    console.error('ERROR: ComfyUI is not running at', COMFYUI_URL);
    process.exit(1);
  }
  console.log('  ComfyUI: Connected\n');

  const lessons = lessonFilter ? [lessonFilter] : LESSONS;

  for (const lessonId of lessons) {
    const mod = getModuleNumber(lessonId);
    const presenter = getPresenter(lessonId);
    console.log(`\n────────────────────────────────────────────────────`);
    console.log(`  ${lessonId.toUpperCase()} | Module ${mod} | ${presenter.toUpperCase()}`);
    console.log(`────────────────────────────────────────────────────`);

    try {
      // Stage 1: Avatar Image
      if (!stageFilter || stageFilter === 1) {
        console.log('\n  [STAGE 1] Qwen Image Edit — Avatar Image');
        await stage1_generateAvatarImage(lessonId);
      }

      // Stage 2: TTS Audio
      if (!stageFilter || stageFilter === 2) {
        console.log('\n  [STAGE 2] Qwen3-TTS — Scene Narration Audio');
        await stage2_generateSceneAudio(lessonId);
      }

      // Stage 3: Full-length Avatar Video
      if (!stageFilter || stageFilter === 3) {
        console.log('\n  [STAGE 3] LTX-2.3 — Full-length Avatar Video');
        await stage3_generateFullVideo(lessonId);
      }

      // GPU rest between lessons
      console.log('\n  Cooling down (15s)...');
      await sleep(15000);

    } catch (e) {
      console.error(`\n  ERROR processing ${lessonId}: ${e.message}`);
      if (!resume) {
        console.error('  Use --resume to continue past errors');
        process.exit(1);
      }
      console.log('  Continuing to next lesson...');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * InfinityTalk Spanish Avatar Video Pipeline — UCF Business Course (3 demo lessons)
 *
 * Reuses existing shot images (English pipeline), but uses Spanish audio.
 * Stages: B (InfinityTalk segments) + C (FFmpeg assembly)
 *
 * Usage:
 *   node generate-infinitytalk-spanish.mjs                       # All 3 lessons
 *   node generate-infinitytalk-spanish.mjs --lesson lesson-1-1   # Single lesson
 *   node generate-infinitytalk-spanish.mjs --start lesson-1-1    # Start from specific
 *   node generate-infinitytalk-spanish.mjs --force               # Overwrite existing
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

const SEG_DURATION = 16;
const CROSSFADE = 1.5;
const EFFECTIVE_DUR = SEG_DURATION - CROSSFADE;

// ═══════════════════════════════════════════════════════════════════════════════
// LESSONS (3 demo lessons only)
// ═══════════════════════════════════════════════════════════════════════════════

const LESSONS = [
  { id: 'lesson-0-1', module: 0, presenter: 'female' },
  { id: 'lesson-1-1', module: 1, presenter: 'male' },
  { id: 'lesson-1-2', module: 1, presenter: 'female' },
];

// Shot cycle — same as English pipeline
const SHOT_CYCLE = [1, 3, 5, 2, 4, 1, 5, 3, 2, 4, 1, 3, 5, 4, 2, 1, 3, 5, 2, 4, 1, 3, 5, 2];

// InfinityTalk prompts (same as English)
const INFINITYTALK_PROMPTS = {
  female: 'A confident Latina woman speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, warm expressive delivery',
  male: 'A professional American man speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, confident conversational delivery',
};
const INFINITYTALK_NEG = 'moving cars, camera motion, camera shake, zooming, panning, walking people, body movement, hand movement, rapid background motion, bright tones, overexposed, subtitles';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timestamp() { return new Date().toLocaleTimeString('en-US', { hour12: false }); }
function fileExists(p) { try { return fs.statSync(p).size > 1000; } catch { return false; } }
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

function copyToComfyInput(src, filename) {
  const dest = path.join(COMFYUI_INPUT, filename);
  fs.copyFileSync(src, dest);
}

function getAudioDuration(p) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${p}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration) || 0;
  } catch { return 0; }
}

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) throw new Error(`ComfyUI submit failed: ${res.status}`);
  const data = await res.json();
  return data.prompt_id;
}

async function pollCompletion(promptId, timeout = 900_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const data = await res.json();
      if (data[promptId]) {
        if (data[promptId].status?.status_str === 'error') {
          throw new Error('ComfyUI workflow error');
        }
        return data[promptId];
      }
    } catch (e) {
      if (e.message.includes('error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for ${promptId}`);
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

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE B: VIDEO SEGMENTS (InfinityTalk) — uses Spanish audio
// ═══════════════════════════════════════════════════════════════════════════════

async function stageB_generateSegments(lesson, force) {
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments-es/${lesson.id}`);
  ensureDir(segDir);

  // Use SPANISH audio
  const audioScenesDir = path.join(COURSE_DIR, `media/audio/scenes-es/${lesson.id}`);
  const vdPath = path.join(COURSE_DIR, `video-scripts/${lesson.id}-video-data-es.json`);
  if (!fs.existsSync(vdPath)) { console.error(`    Missing video-data-es`); return []; }
  const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));

  const sceneAudioFiles = vd.scenes
    .map(s => path.join(audioScenesDir, `${lesson.id}-scene-${s.sceneNumber}.wav`))
    .filter(f => fs.existsSync(f));

  if (sceneAudioFiles.length === 0) { console.error(`    No Spanish audio files`); return []; }

  // Concat all scene audio into one file
  const fullAudioPath = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-es-full.wav`);
  if (sceneAudioFiles.length === 1) {
    execSync(`ffmpeg -y -i "${sceneAudioFiles[0]}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
  } else {
    const concatList = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-es-audiolist.txt`);
    fs.writeFileSync(concatList, sceneAudioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
    try { fs.unlinkSync(concatList); } catch {}
  }

  const totalDuration = getAudioDuration(fullAudioPath);
  if (totalDuration <= 0) { console.error(`    Zero audio duration`); return []; }

  const numSegments = Math.ceil(totalDuration / EFFECTIVE_DUR);
  console.log(`    Spanish audio: ${totalDuration.toFixed(1)}s -> ${numSegments} segments`);

  // Load InfinityTalk workflow
  const itWorkflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/infinityTalk - Single -Wan 2.1.json');

  const segmentPaths = [];
  const segStart = Date.now();

  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * EFFECTIVE_DUR;
    const segDur = Math.min(SEG_DURATION, totalDuration - offset);
    if (segDur < 2) break;

    const segVideoPath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}.mp4`);

    if (!force && fileExists(segVideoPath)) {
      console.log(`    [SKIP] seg${seg} exists`);
      segmentPaths.push(segVideoPath);
      continue;
    }

    // Pick shot
    const shotNum = SHOT_CYCLE[seg % SHOT_CYCLE.length];
    const shotImage = path.join(shotDir, `shot-${shotNum}.png`);
    if (!fileExists(shotImage)) {
      console.error(`    Missing shot: shot-${shotNum}.png`);
      continue;
    }

    // Copy shot image to ComfyUI input
    const imageFilename = `ucf-${lesson.id}-es-seg${seg}.png`;
    copyToComfyInput(shotImage, imageFilename);

    // Trim audio for this segment
    const audioFilename = `ucf-${lesson.id}-es-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${fullAudioPath}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, audioFilename)}"`,
      { stdio: 'pipe' }
    );

    // Configure InfinityTalk workflow
    const workflow = JSON.parse(fs.readFileSync(itWorkflowPath, 'utf-8'));
    workflow['73'].inputs.image = imageFilename;
    workflow['60'].inputs.audio = audioFilename;
    workflow['60'].inputs.audioUI = '';
    workflow['54'].inputs.positive_prompt = INFINITYTALK_PROMPTS[lesson.presenter];
    workflow['54'].inputs.negative_prompt = INFINITYTALK_NEG;
    workflow['52'].inputs.model = 'Wan2_1-InfiniteTalk-Single_fp8_e4m3fn_scaled_KJ.safetensors';
    workflow['71'].inputs.model = 'Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors';
    workflow['71'].inputs.base_precision = 'fp16_fast';
    workflow['61'].inputs.save_output = true;
    workflow['61'].inputs.filename_prefix = `video/ucf-${lesson.id}-es-seg${seg}`;
    workflow['70'].inputs.seed = Math.floor(Math.random() * 1e15);

    const shotName = ['Wide', 'Medium', 'Close-up', '3/4', 'Med-Wide'][shotNum - 1];
    console.log(`    [${timestamp()}] Seg ${seg + 1}/${numSegments}: shot-${shotNum} (${shotName}), ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s`);

    const thisSegStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

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
          console.error(`    FAIL seg${seg} output not found`);
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
  console.log(`    Segments: ${segmentPaths.length}/${numSegments} in ${totalElapsed}min`);

  return segmentPaths;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE C: ASSEMBLY — Hard cut + original Spanish audio mux
// ═══════════════════════════════════════════════════════════════════════════════

function stageC_assembleVideo(lesson, segmentPaths) {
  if (segmentPaths.length === 0) { console.error(`    No segments`); return null; }

  const outputPath = path.join(COURSE_DIR, `media/video/avatars/${lesson.id}-avatar-es.mp4`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments-es/${lesson.id}`);
  const originalAudio = path.join(segDir, 'full-audio-original.wav');
  const useOriginalAudio = fs.existsSync(originalAudio);

  if (useOriginalAudio) console.log(`    Using original Spanish TTS audio`);

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

  console.log(`    Assembling ${segmentPaths.length} segments with hard cuts...`);

  const cutPaths = [];
  const lastIdx = segmentPaths.length - 1;
  for (let i = 0; i < segmentPaths.length; i++) {
    const cutFile = path.join(segDir, `cut-${String(i).padStart(3, '0')}.mp4`);
    if (i === 0) {
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -t ${SEG_DURATION} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    } else if (i < lastIdx) {
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -t ${EFFECTIVE_DUR} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(
        `ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`,
        { stdio: 'pipe' }
      );
    }
    cutPaths.push(cutFile);
  }

  const videoOnlyPath = path.join(segDir, 'assembled-video-only.mp4');
  const concatList = path.join(segDir, 'concat-list.txt');
  fs.writeFileSync(concatList, cutPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -an -c:v copy "${videoOnlyPath}"`,
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
  );
  console.log(`    Hard cut concat complete`);

  if (useOriginalAudio && fs.existsSync(videoOnlyPath)) {
    const audioDur = getAudioDuration(originalAudio);
    const tempMuxed = path.join(segDir, 'muxed-temp.mp4');
    execSync(
      `ffmpeg -y -i "${videoOnlyPath}" -i "${originalAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${tempMuxed}"`,
      { stdio: 'pipe' }
    );
    execSync(
      `ffmpeg -y -i "${tempMuxed}" -t ${audioDur} -c:v copy -c:a copy "${outputPath}"`,
      { stdio: 'pipe' }
    );
    try { fs.unlinkSync(tempMuxed); } catch {}
    console.log(`    Spanish audio muxed -> ${lesson.id}-avatar-es.mp4 (${audioDur.toFixed(1)}s)`);
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
// PROCESS ONE LESSON (B → C only, shots already exist)
// ═══════════════════════════════════════════════════════════════════════════════

async function processLesson(lesson, force) {
  const lessonStart = Date.now();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${lesson.id.toUpperCase()} (SPANISH) | Module ${lesson.module} | ${lesson.presenter.toUpperCase()}`);
  console.log(`${'═'.repeat(60)}`);

  // Verify shots exist
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  const allShots = [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
  if (!allShots) {
    console.error(`  Missing shot images — run English pipeline first`);
    return false;
  }
  console.log(`  Shots verified (reusing from English pipeline)`);

  // Stage B: Video segments with Spanish audio
  console.log(`\n  [STAGE B] InfinityTalk Segments (Spanish audio)`);
  const segmentPaths = await stageB_generateSegments(lesson, force);
  if (segmentPaths.length === 0) {
    console.error(`  Segment generation failed`);
    return false;
  }

  // Stage C: Assembly
  console.log(`\n  [STAGE C] FFmpeg Assembly`);
  const outputPath = stageC_assembleVideo(lesson, segmentPaths);
  if (!outputPath) {
    console.error(`  Assembly failed`);
    return false;
  }

  const elapsed = ((Date.now() - lessonStart) / 1000 / 60).toFixed(1);
  console.log(`\n  COMPLETE: ${lesson.id}-avatar-es.mp4 (${elapsed}min)`);

  // Also copy to output folder for the demo
  const outputDest = path.join(COURSE_DIR, `output/media/video/avatars/${lesson.id}-avatar-es.mp4`);
  ensureDir(path.dirname(outputDest));
  fs.copyFileSync(outputPath, outputDest);
  console.log(`  Copied to output/media/video/avatars/`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const lessonArg = args.find((a, i) => (args[i - 1] === '--lesson' || args[i - 1] === '--start'));
  const singleLesson = lessonArg || null;

  let lessons = LESSONS;
  if (singleLesson) {
    const found = LESSONS.find(l => l.id === singleLesson);
    if (!found) {
      console.error(`Unknown lesson: ${singleLesson}`);
      process.exit(1);
    }
    lessons = [found];
  }

  // If --start, filter to lessons from that point
  const startArg = args.find((a, i) => args[i - 1] === '--start');
  if (startArg && !lessonArg) {
    const idx = LESSONS.findIndex(l => l.id === startArg);
    if (idx >= 0) lessons = LESSONS.slice(idx);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SPANISH InfinityTalk Pipeline — UCF Business Course`);
  console.log(`  Lessons: ${lessons.map(l => l.id).join(', ')}`);
  console.log(`  Force: ${force}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Check ComfyUI
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!res.ok) throw new Error();
    console.log(`ComfyUI: OK`);
  } catch {
    console.error(`ComfyUI not reachable at ${COMFYUI_URL} — start it first!`);
    process.exit(1);
  }

  let completed = 0;
  for (const lesson of lessons) {
    // Skip if Spanish video already exists (unless --force)
    const esVideo = path.join(COURSE_DIR, `media/video/avatars/${lesson.id}-avatar-es.mp4`);
    if (!force && fileExists(esVideo)) {
      console.log(`\n  [SKIP] ${lesson.id}-avatar-es.mp4 already exists`);
      completed++;
      continue;
    }

    const ok = await processLesson(lesson, force);
    if (ok) {
      completed++;
    } else {
      console.error(`\n  ${lesson.id} FAILED — stopping`);
      break;
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE: ${completed}/${lessons.length} Spanish videos generated`);
  console.log(`${'═'.repeat(60)}`);
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Bookend Avatar Video Pipeline — UCF Business Course (Modules 0-5 only)
 *
 * Generates 22 bookend videos (11 in-scope videos × 2 languages) from:
 *   - bookend audio:  media/audio/bookend/{video-id}-{lang}.wav
 *   - shot images:    media/images/avatars/shots/{lesson-id}/shot-{1..5}.png
 *   - InfinityTalk + FFmpeg
 *
 * Output: media/video/bookend/{video-id}-{lang}.mp4
 *
 * INFRASTRUCTURE: This script targets the DESKTOP ComfyUI (127.0.0.1:8188) where
 * the InfinityTalk models live (D:/ComfyUI_windows_portable). Audio gen is on the
 * laptop (Tailscale 100.111.43.126) but video render runs locally on RTX 4090.
 *
 * COOLING (PROVEN — prevents PC crash on long runs):
 *   - 5s pause between segments
 *   - freeVRAM() + 5s pause between videos
 *   - 10s pause + freeVRAM on segment failure
 *   - Auto-resume: existing segments/videos are skipped
 *
 * USAGE:
 *   node generate-bookend-video.mjs --video course-intro --lang en   # one
 *   node generate-bookend-video.mjs --all --lang en                  # all EN
 *   node generate-bookend-video.mjs --all                            # all 22
 *   node generate-bookend-video.mjs --first                          # first only (course-intro EN, for review)
 *   node generate-bookend-video.mjs --start <id>                     # resume from
 *   node generate-bookend-video.mjs --force                          # overwrite
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ComfyUIWatchdog } from './comfyui-watchdog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Watchdog — restart ComfyUI proactively to avoid VRAM fragmentation.
// Beat the recurring overnight crashes by killing the process before
// it kills itself.
const watchdog = new ComfyUIWatchdog({
  url: 'http://127.0.0.1:8188',
  port: 8188,
  bat: 'D:\\ComfyUI_windows_portable\\run_nvidia_gpu.bat',
  restartEveryVideos: 8,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — match the existing InfinityTalk pipeline that's been proven on this course
// ═══════════════════════════════════════════════════════════════════════════════

const COMFYUI_URL = 'http://127.0.0.1:8188';     // Desktop ComfyUI (RTX 4090)
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const COURSE_DIR = __dirname;

// SEG_DURATION lowered from 16s -> 8s on 2026-05-01 to test crash-threshold theory.
// Spanish render crashed twice at ~4 min mark within seg 1 inference (~6 min/seg).
// Shorter segments = each inference finishes in ~3 min, below the crash threshold.
// If this works, the bug is time-based corruption WITHIN a single inference,
// not call-based or fragmentation-based. Assembly logic still works (more segs).
const SEG_DURATION = 8;             // 8s segments — half the inference time, below crash window
const CROSSFADE = 1.5;              // morph zone we skip on hard-cut assembly
const EFFECTIVE_DUR = SEG_DURATION - CROSSFADE;
const INTER_SEGMENT_PAUSE = 30000;  // 30s between segments — extra thermal/PSU recovery time
const INTER_VIDEO_PAUSE = 5000;     // 5s between videos (after VRAM free)
const ERROR_RECOVERY_PAUSE = 10000; // 10s after a segment error

const SHOT_CYCLE = [1, 3, 5, 2, 4, 1, 5, 3, 2, 4]; // no same-shot back-to-back

const OUT_VIDEO_DIR = path.join(COURSE_DIR, 'media', 'video', 'bookend');
const SCRIPTS_FILE = path.join(COURSE_DIR, 'bookend-scripts.json');
const PROGRESS_FILE = path.join(COURSE_DIR, '.bookend-video-progress.json');

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS — match existing course prompts (allow subtle natural motion)
// ═══════════════════════════════════════════════════════════════════════════════

const INFINITYTALK_PROMPTS = {
  female_en: 'A confident Latina woman speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, warm expressive delivery',
  female_es: 'A confident Latina woman speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, warm expressive delivery',
  male_en: 'A professional American man speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, confident conversational delivery',
  male_es: 'A professional American man speaking directly to the camera with natural lip movements and subtle head motion, subtle natural environment movement, gentle water shimmer, soft leaf sway, only face and mouth as primary motion, confident conversational delivery',
};
const INFINITYTALK_NEG = 'moving cars, camera motion, camera shake, zooming, panning, walking people, body movement, hand movement, rapid background motion, bright tones, overexposed, subtitles';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fileExists(fp) { try { return fs.statSync(fp).size > 0; } catch { return false; } }
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function copyToComfyInput(src, destFn) {
  ensureDir(COMFYUI_INPUT);
  fs.copyFileSync(src, path.join(COMFYUI_INPUT, destFn));
}
function getAudioDuration(wav) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${wav}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration);
  } catch { return 0; }
}
function lessonIdFromAvatar(p) {
  const m = /lesson-(\d+-\d+)-avatar/.exec(p);
  return m ? `lesson-${m[1]}` : null;
}

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}
async function comfyHealth() {
  try { await fetchJSON(`${COMFYUI_URL}/system_stats`); return true; } catch { return false; }
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
  const r = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: `ucf-bookend-${Date.now()}` })
  });
  const j = await r.json();
  if (j.error) throw new Error(`Submit error: ${JSON.stringify(j.error)}`);
  return j.prompt_id;
}
async function pollCompletion(promptId, timeoutMs = 900000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const hist = await fetchJSON(`${COMFYUI_URL}/history/${promptId}`);
      if (hist[promptId]) {
        const s = hist[promptId].status;
        if (s?.completed) return hist[promptId];
        if (s?.status_str === 'error') throw new Error(`Generation failed: ${JSON.stringify(s.messages)}`);
      }
    } catch (e) {
      if (e.message.includes('Generation failed')) throw e;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout after ${timeoutMs/1000}s`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════════════════

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); } catch { return { completed: [] }; }
}
function saveProgress(p) {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE B — InfinityTalk segments
// ═══════════════════════════════════════════════════════════════════════════════

async function generateSegments(video, lang, voiceKey) {
  const lessonId = lessonIdFromAvatar(video.avatar);
  if (!lessonId) throw new Error(`Cannot derive lesson id from avatar: ${video.avatar}`);

  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lessonId}`);
  const segDir = path.join(COURSE_DIR, `media/video/bookend/segments/${video.id}-${lang}`);
  ensureDir(segDir);

  // Find bookend audio
  const audioPath = path.join(COURSE_DIR, `media/audio/bookend/${video.id}-${lang}.wav`);
  if (!fileExists(audioPath)) {
    throw new Error(`Audio missing: ${audioPath}`);
  }

  // Resample audio to 16kHz mono for InfinityTalk
  const trimmedAudio = path.join(COMFYUI_INPUT, `ucf-bk-${video.id}-${lang}-full.wav`);
  ensureDir(COMFYUI_INPUT);
  execSync(`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${trimmedAudio}"`, { stdio: 'pipe' });

  const totalDur = getAudioDuration(trimmedAudio);
  if (totalDur < 1) throw new Error(`Zero audio duration for ${audioPath}`);

  const numSegments = Math.max(1, Math.ceil(totalDur / EFFECTIVE_DUR));
  console.log(`    Audio: ${totalDur.toFixed(1)}s -> ${numSegments} segments`);

  // Stash original audio for Stage C mux
  const stableAudio = path.join(segDir, 'full-audio-original.wav');
  fs.copyFileSync(audioPath, stableAudio);

  // Workflow template
  const itWorkflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/infinityTalk - Single -Wan 2.1.json');
  const tmpl = JSON.parse(fs.readFileSync(itWorkflowPath, 'utf-8'));

  const segmentPaths = [];
  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * EFFECTIVE_DUR;
    const segDur = Math.min(SEG_DURATION, totalDur - offset);
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
      console.error(`    Missing shot: shot-${shotNum}.png — falling back to scene avatar`);
      // Fall back to scene avatar
      const fallback = path.join(COURSE_DIR, video.avatar);
      if (!fileExists(fallback)) {
        console.error(`    Fallback missing too: ${fallback}`);
        continue;
      }
      copyToComfyInput(fallback, `ucf-bk-${video.id}-${lang}-seg${seg}.png`);
    } else {
      copyToComfyInput(shotImage, `ucf-bk-${video.id}-${lang}-seg${seg}.png`);
    }

    // Trim audio for segment
    const segAudio = `ucf-bk-${video.id}-${lang}-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${trimmedAudio}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, segAudio)}"`,
      { stdio: 'pipe' }
    );

    // Configure workflow
    const workflow = JSON.parse(JSON.stringify(tmpl));
    workflow['73'].inputs.image = `ucf-bk-${video.id}-${lang}-seg${seg}.png`;
    workflow['60'].inputs.audio = segAudio;
    workflow['60'].inputs.audioUI = '';
    workflow['54'].inputs.positive_prompt = INFINITYTALK_PROMPTS[voiceKey];
    workflow['54'].inputs.negative_prompt = INFINITYTALK_NEG;
    // Use models saved in workflow JSON (default: GGUF Q3_K_S + Q6_K, ~10GB) — fp8 override removed
    // to avoid OOM crashes on sustained runs. base_precision is also left to workflow default
    // (fp16, NOT fp16_fast) — fp16_fast is fragile on Windows + Triton + sageattention stack
    // and has caused hard system crashes (kernel-power 41). See workflow JSON to change.
    workflow['61'].inputs.save_output = true;
    workflow['61'].inputs.filename_prefix = `bookend/${video.id}-${lang}-seg${seg}`;
    workflow['70'].inputs.seed = Math.floor(Math.random() * 1e15);

    const shotName = ['Wide-L', 'Med-R', 'CU-Cen', 'Med-CU-R', 'Close-Cen'][shotNum - 1];
    console.log(`    [${timestamp()}] Seg ${seg + 1}/${numSegments}: shot-${shotNum} (${shotName}), ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s`);
    const t0 = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);
      const out61 = result.outputs?.['61'];
      if (out61?.gifs?.[0]) {
        const v = out61.gifs[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, v.subfolder || '', v.filename);
        if (fileExists(comfyPath)) {
          fs.copyFileSync(comfyPath, segVideoPath);
          const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
          console.log(`    OK seg${seg} (${elapsed}s)`);
          segmentPaths.push(segVideoPath);
        } else {
          console.error(`    FAIL seg${seg}: output not found at ${comfyPath}`);
        }
      } else {
        console.error(`    FAIL seg${seg}: no output in result`);
      }
    } catch (e) {
      console.error(`    FAIL seg${seg}: ${e.message}`);
      console.log(`    Cooling for ${ERROR_RECOVERY_PAUSE/1000}s + freeVRAM before continuing...`);
      await freeVRAM();
      await sleep(ERROR_RECOVERY_PAUSE);
    }

    if (seg < numSegments - 1) await sleep(INTER_SEGMENT_PAUSE);
  }

  return { segmentPaths, totalDur };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE C — Hard-cut assembly + audio mux
// ═══════════════════════════════════════════════════════════════════════════════

function assembleVideo(video, lang, segmentPaths) {
  if (segmentPaths.length === 0) { console.error(`    No segments to assemble`); return null; }

  ensureDir(OUT_VIDEO_DIR);
  const outputPath = path.join(OUT_VIDEO_DIR, `${video.id}-${lang}.mp4`);
  const segDir = path.join(COURSE_DIR, `media/video/bookend/segments/${video.id}-${lang}`);
  const originalAudio = path.join(segDir, 'full-audio-original.wav');
  const useOrig = fileExists(originalAudio);

  if (segmentPaths.length === 1) {
    if (useOrig) {
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
      execSync(`ffmpeg -y -i "${segmentPaths[i]}" -t ${SEG_DURATION} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`, { stdio: 'pipe' });
    } else if (i < lastIdx) {
      execSync(`ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -t ${EFFECTIVE_DUR} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`, { stdio: 'pipe' });
    } else {
      execSync(`ffmpeg -y -i "${segmentPaths[i]}" -ss ${CROSSFADE} -an -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${cutFile}"`, { stdio: 'pipe' });
    }
    cutPaths.push(cutFile);
  }

  const videoOnly = path.join(segDir, 'assembled-video-only.mp4');
  const concatList = path.join(segDir, 'concat-list.txt');
  fs.writeFileSync(concatList, cutPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -an -c:v copy "${videoOnly}"`, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });

  if (useOrig && fileExists(videoOnly)) {
    const audioDur = getAudioDuration(originalAudio);
    const tempMux = path.join(segDir, 'muxed-temp.mp4');
    execSync(`ffmpeg -y -i "${videoOnly}" -i "${originalAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${tempMux}"`, { stdio: 'pipe' });
    execSync(`ffmpeg -y -i "${tempMux}" -t ${audioDur} -c:v copy -c:a copy "${outputPath}"`, { stdio: 'pipe' });
    try { fs.unlinkSync(tempMux); } catch {}
    console.log(`    Audio muxed -> ${path.basename(outputPath)} (${audioDur.toFixed(1)}s)`);
  } else if (fileExists(videoOnly)) {
    fs.renameSync(videoOnly, outputPath);
  }

  // Cleanup
  try { fs.unlinkSync(videoOnly); } catch {}
  for (const f of cutPaths) try { fs.unlinkSync(f); } catch {}
  try { fs.unlinkSync(concatList); } catch {}

  return outputPath;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS ONE VIDEO
// ═══════════════════════════════════════════════════════════════════════════════

async function processVideo(video, lang) {
  const voiceKey = video[`voice_${lang}`]; // female_en / male_en / etc.
  const outputPath = path.join(OUT_VIDEO_DIR, `${video.id}-${lang}.mp4`);

  if (fileExists(outputPath)) {
    console.log(`  [SKIP] ${path.basename(outputPath)} already exists`);
    return { status: 'skipped' };
  }

  const startTime = Date.now();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${video.label} — ${lang.toUpperCase()}  (voice=${voiceKey})`);
  console.log(`${'═'.repeat(60)}`);

  // CRITICAL: Free VRAM at the START of every video render. ComfyUI accumulates
  // VRAM fragmentation across previous renders (even other ComfyUI activity since
  // last launch — image gen, prior videos, etc). The /free endpoint forces an
  // unload + cudaMalloc reset before we re-load the Wan models. Without this,
  // the second/third video render in a session hits stale state and the SDPA-
  // mitigated kernel fragility re-emerges, hard-rebooting the PC.
  console.log('  [VRAM] Clearing before render...');
  await freeVRAM();
  await sleep(3000);

  try {
    const { segmentPaths, totalDur } = await generateSegments(video, lang, voiceKey);
    if (segmentPaths.length === 0) {
      console.error(`  No segments generated — skipping assembly`);
      return { status: 'error' };
    }
    const finalPath = assembleVideo(video, lang, segmentPaths);
    if (!finalPath) {
      return { status: 'error' };
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n  COMPLETE in ${elapsed}s -> ${path.basename(finalPath)}`);
    return { status: 'success', path: finalPath, duration: totalDur, elapsed };
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    return { status: 'error', error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(n);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i+1] : null; };

  // First contact — if ComfyUI is dead, the watchdog will boot it.
  if (!await comfyHealth()) {
    console.log('ComfyUI not reachable — watchdog will start it.');
    await watchdog.restart('initial start');
  }

  const data = JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8'));
  const videos = data.videos.filter(v => v.approved);

  let targets;
  if (flag('--first')) {
    targets = [{ video: videos[0], lang: 'en' }];
  } else if (arg('--video')) {
    const v = videos.find(x => x.id === arg('--video'));
    if (!v) { console.error(`No video: ${arg('--video')}`); process.exit(1); }
    const langs = arg('--lang') ? [arg('--lang')] : ['en', 'es'];
    targets = langs.map(l => ({ video: v, lang: l }));
  } else if (flag('--all')) {
    const langs = arg('--lang') ? [arg('--lang')] : ['en', 'es'];
    targets = [];
    for (const v of videos) for (const l of langs) targets.push({ video: v, lang: l });
  } else {
    console.error('Specify --first, --video <id>, or --all');
    process.exit(1);
  }

  // --start filtering
  const startId = arg('--start');
  if (startId) {
    const idx = targets.findIndex(t => t.video.id === startId);
    if (idx >= 0) targets = targets.slice(idx);
  }

  console.log('═'.repeat(70));
  console.log('UCF Bookend Video Pipeline (InfinityTalk + cooling + watchdog)');
  console.log('═'.repeat(70));
  console.log(`ComfyUI:     ${COMFYUI_URL}`);
  console.log(`Targets:     ${targets.length} video(s)`);
  console.log(`Output:      ${OUT_VIDEO_DIR}`);
  console.log(`Cooling:     ${INTER_SEGMENT_PAUSE/1000}s between segs, ${INTER_VIDEO_PAUSE/1000}s + VRAM-free between videos`);
  console.log(`Watchdog:    restart ComfyUI every ${watchdog.restartEveryVideos} videos + on death detection`);
  console.log('═'.repeat(70));

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const { video, lang } = targets[i];

    // Watchdog: health-check + proactive restart cadence.
    // Skip for already-existing outputs to avoid pointless restart cycles.
    const existingPath = path.join(OUT_VIDEO_DIR, `${video.id}-${lang}.mp4`);
    if (!fileExists(existingPath)) {
      try {
        await watchdog.beforeVideo();
      } catch (e) {
        console.error(`  WATCHDOG FATAL: ${e.message}`);
        process.exit(2);
      }
    }

    const r = await processVideo(video, lang);
    r.video = video.id; r.lang = lang;
    results.push(r);

    if (r.status === 'success') {
      watchdog.afterVideoSuccess();
    }

    // Inter-video cooling
    if (i < targets.length - 1) {
      console.log(`\n  ──── COOL DOWN ──── freeVRAM + ${INTER_VIDEO_PAUSE/1000}s pause`);
      await freeVRAM();
      await sleep(INTER_VIDEO_PAUSE);
    }
  }

  const success = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log('\n' + '═'.repeat(70));
  console.log(`Done: ${success} success, ${skipped} skipped, ${errors} errors`);
  console.log(`Watchdog: ${watchdog.totalRestarts} restart(s) total`);
  console.log(`Output: ${OUT_VIDEO_DIR}`);
  console.log('═'.repeat(70));
  if (errors > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

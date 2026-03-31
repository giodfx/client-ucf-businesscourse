#!/usr/bin/env node
/**
 * Spanish TTS generation using Qwen3-TTS via ComfyUI API.
 * Uses FB_Qwen3TTSVoiceClone with ICL mode, language='Spanish'.
 *
 * Reads from *-video-data-es.json files, outputs to media/audio/scenes-es/.
 * Supports REMOTE ComfyUI (laptop via Tailscale) — uploads ref audio via API,
 * downloads output audio via API. No filesystem access to remote machine needed.
 *
 * Usage:
 *   node generate-tts-spanish.mjs                            # All lessons with -es.json files
 *   node generate-tts-spanish.mjs --lesson lesson-1-1        # Single lesson
 *   node generate-tts-spanish.mjs --start lesson-3-1         # Resume from specific
 *   node generate-tts-spanish.mjs --url http://100.111.43.126:8188  # Laptop via Tailscale
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const urlArg = args.find((_, i) => args[i - 1] === '--url');

// Default: laptop via Tailscale. Override with --url or COMFYUI_URL env.
const COMFYUI_URL = urlArg || process.env.COMFYUI_URL || 'http://100.111.43.126:8188';

const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE REFERENCES — Same English ref voices, Qwen3 speaks Spanish with them
// ═══════════════════════════════════════════════════════════════════════════════

const VOICE_REFS = {
  female: {
    audio: path.join(PROJECT_ROOT, 'voices/FemaleJessica.mp3'),
    filename: 'tts-ref-female.mp3',
    text: "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.",
  },
  male: {
    audio: path.join(PROJECT_ROOT, 'voices/MaleAmerican.mp3'),
    filename: 'tts-ref-male.mp3',
    text: "It allows you to easily download YouTube videos as MP3 or MP4 files. The service is completely free and does not require any sign-up",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON ROSTER
// ═══════════════════════════════════════════════════════════════════════════════

const LESSONS = [
  { id: 'lesson-0-1', presenter: 'female' },
  { id: 'lesson-1-1', presenter: 'male' },
  { id: 'lesson-1-2', presenter: 'female' },
  { id: 'lesson-1-3', presenter: 'male' },
  { id: 'lesson-2-1', presenter: 'female' },
  { id: 'lesson-2-2', presenter: 'male' },
  { id: 'lesson-2-3', presenter: 'female' },
  { id: 'lesson-3-1', presenter: 'male' },
  { id: 'lesson-3-2', presenter: 'female' },
  { id: 'lesson-3-3', presenter: 'male' },
  { id: 'lesson-4-1', presenter: 'female' },
  { id: 'lesson-4-2', presenter: 'male' },
  { id: 'lesson-4-3', presenter: 'female' },
  { id: 'lesson-5-1', presenter: 'male' },
  { id: 'lesson-5-2', presenter: 'female' },
  { id: 'lesson-6-1', presenter: 'male' },
  { id: 'lesson-6-2', presenter: 'female' },
  { id: 'lesson-6-3', presenter: 'male' },
  { id: 'lesson-7-1', presenter: 'female' },
  { id: 'lesson-7-2', presenter: 'male' },
  { id: 'lesson-7-3', presenter: 'female' },
  { id: 'lesson-7-4', presenter: 'male' },
  { id: 'lesson-7-5', presenter: 'male' },
  { id: 'lesson-8-1', presenter: 'female' },
  { id: 'lesson-8-2', presenter: 'male' },
  { id: 'lesson-8-3', presenter: 'female' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getAudioDuration(wavPath) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${wavPath}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration);
  } catch { return 0; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMFYUI REMOTE API — upload/download via HTTP (no filesystem access needed)
// ═══════════════════════════════════════════════════════════════════════════════

/** Upload a file to ComfyUI's input folder via /upload/image endpoint */
async function uploadToComfyInput(localPath, remoteFilename) {
  const fileBuffer = fs.readFileSync(localPath);
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

  // Build multipart form data manually
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${remoteFilename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header),
    fileBuffer,
    Buffer.from(footer),
  ]);

  const res = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

/** Download an output file from ComfyUI via /view endpoint */
async function downloadFromComfyOutput(filename, subfolder) {
  const params = new URLSearchParams({ filename, type: 'output' });
  if (subfolder) params.set('subfolder', subfolder);

  const res = await fetch(`${COMFYUI_URL}/view?${params}`);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${filename}`);
  return Buffer.from(await res.arrayBuffer());
}

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Submit: ${JSON.stringify(data.error).substring(0, 500)}`);
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error(`Nodes: ${JSON.stringify(data.node_errors).substring(0, 500)}`);
  }
  return data.prompt_id;
}

async function pollCompletion(promptId, timeoutMs = 1800000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const data = await res.json();
      if (data[promptId]) {
        const status = data[promptId].status?.status_str;
        if (status === 'success') return data[promptId];
        if (status === 'error') throw new Error(`Exec error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Exec error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTS WORKFLOW BUILDER — SPANISH
// ═══════════════════════════════════════════════════════════════════════════════

function buildTTSWorkflow(text, refAudioFilename, refText, outputPrefix) {
  return {
    '10': {
      class_type: 'LoadAudio',
      inputs: { audio: refAudioFilename },
    },
    '20': {
      class_type: 'FB_Qwen3TTSVoiceClone',
      inputs: {
        target_text: text,
        ref_audio: ['10', 0],
        ref_text: refText,
        model_choice: '1.7B',
        device: 'auto',
        precision: 'bf16',
        language: 'Spanish',
        x_vector_only: false,
        seed: Math.floor(Math.random() * 1e15),
        max_new_tokens: 4096,
        top_p: 0.8,
        top_k: 20,
        temperature: 1,
        repetition_penalty: 1.05,
        attention: 'auto',
        unload_model_after_generate: false,
      },
    },
    '30': {
      class_type: 'SaveAudio',
      inputs: {
        audio: ['20', 0],
        filename_prefix: outputPrefix,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS LESSON (Spanish) — fully remote via HTTP
// ═══════════════════════════════════════════════════════════════════════════════

async function processLesson(lessonId, presenter) {
  const vdPath = path.join(COURSE_DIR, `video-scripts/${lessonId}-video-data-es.json`);
  if (!fs.existsSync(vdPath)) {
    console.log(`    [SKIP] No Spanish video-data: ${lessonId}`);
    return 'skip';
  }

  const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));
  const audioDir = path.join(COURSE_DIR, `media/audio/scenes-es/${lessonId}`);
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const voice = VOICE_REFS[presenter];

  let sceneCount = 0;
  for (const scene of vd.scenes) {
    const narration = (scene.narration || '').trim();
    if (narration.length < 10) continue;

    const finalPath = path.join(audioDir, `${lessonId}-scene-${scene.sceneNumber}.wav`);

    // Skip if already exists
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 1000) {
      const dur = getAudioDuration(finalPath);
      scene.duration = dur;
      console.log(`    [SKIP] Scene ${scene.sceneNumber} (${dur.toFixed(1)}s)`);
      sceneCount++;
      continue;
    }

    const outputPrefix = `tts-ucf-es/${lessonId}-scene-${scene.sceneNumber}`;
    process.stdout.write(`    Scene ${scene.sceneNumber}: ${narration.length} chars...`);
    const t0 = Date.now();

    try {
      const workflow = buildTTSWorkflow(narration, voice.filename, voice.text, outputPrefix);
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      // Find the output audio
      const outputs = result.outputs?.['30']?.audio;
      if (!outputs || outputs.length === 0) throw new Error('No output audio');

      const outFile = outputs[0].filename;
      const subfolder = outputs[0].subfolder || '';

      // Download output from remote ComfyUI
      const audioBuffer = await downloadFromComfyOutput(outFile, subfolder);
      const tempPath = finalPath + '.tmp.flac';
      fs.writeFileSync(tempPath, audioBuffer);

      // Convert to 16kHz mono WAV
      execSync(`ffmpeg -y -i "${tempPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${finalPath}"`, { stdio: 'ignore' });
      fs.unlinkSync(tempPath);

      const dur = getAudioDuration(finalPath);
      scene.duration = dur;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(` OK (${dur.toFixed(1)}s) [${elapsed}s]`);
      sceneCount++;
    } catch (e) {
      console.log(` FAILED: ${e.message}`);
      return false;
    }
  }

  // Update Spanish video-data with durations
  const total = vd.scenes.reduce((s, sc) => s + (sc.duration || 0), 0);
  vd.totalDuration = total;
  fs.writeFileSync(vdPath, JSON.stringify(vd, null, 2));
  console.log(`    Total: ${total.toFixed(1)}s (${(total / 60).toFixed(1)} min), ${sceneCount} scenes`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const lessonArg = args.find((_, i) => args[i - 1] === '--lesson');
  const startArg = args.find((_, i) => args[i - 1] === '--start');

  console.log('\n' + '='.repeat(60));
  console.log('  SPANISH TTS — Qwen3-TTS via ComfyUI API (ICL Mode)');
  console.log('='.repeat(60));
  console.log(`  ComfyUI: ${COMFYUI_URL}`);
  console.log(`  Language: Spanish`);
  console.log(`  Audio output: media/audio/scenes-es/`);
  console.log(`  Mode: Remote (HTTP upload/download)`);

  // Test connection
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    const stats = await res.json();
    const gpu = stats.devices?.[0];
    console.log(`  Connected: ComfyUI ${stats.system?.comfyui_version || 'OK'}`);
    if (gpu) console.log(`  GPU: ${gpu.name} (${(gpu.vram_total / 1e9).toFixed(1)}GB VRAM)`);
  } catch {
    console.error('  ERROR: Cannot connect to ComfyUI at ' + COMFYUI_URL);
    process.exit(1);
  }

  // Upload reference audio files to remote ComfyUI
  console.log('  Uploading reference audio...');
  for (const [name, voice] of Object.entries(VOICE_REFS)) {
    try {
      await uploadToComfyInput(voice.audio, voice.filename);
      console.log(`    ${name}: ${voice.filename} OK`);
    } catch (e) {
      console.error(`    ${name}: FAILED — ${e.message}`);
      console.error('    Make sure the reference audio files exist locally.');
      process.exit(1);
    }
  }

  // Find lessons with Spanish video-data
  let targets;
  if (lessonArg) {
    targets = LESSONS.filter(l => l.id === lessonArg);
    if (!targets.length) { console.error(`  Unknown lesson: ${lessonArg}`); process.exit(1); }
  } else {
    targets = LESSONS.filter(l => {
      const esPath = path.join(COURSE_DIR, `video-scripts/${l.id}-video-data-es.json`);
      return fs.existsSync(esPath);
    });
    if (startArg) {
      const idx = targets.findIndex(l => l.id === startArg);
      if (idx > 0) targets = targets.slice(idx);
    }
  }

  console.log(`  Lessons with Spanish data: ${targets.length}`);
  if (targets.length === 0) {
    console.log('  No Spanish video-data files found.');
    process.exit(0);
  }
  console.log(`  Targets: ${targets.map(t => t.id).join(', ')}`);

  let completed = 0;
  let skipped = 0;
  const failed = [];
  const overallStart = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const { id, presenter } = targets[i];
    console.log(`\n  [${i + 1}/${targets.length}] ${id} | ${presenter}`);
    const lessonStart = Date.now();

    const result = await processLesson(id, presenter);
    const elapsed = (Date.now() - lessonStart) / 60000;

    if (result === 'skip') {
      skipped++;
    } else if (result) {
      completed++;
      console.log(`    Done in ${elapsed.toFixed(1)}min`);
    } else {
      failed.push(id);
      console.log(`    FAILED after ${elapsed.toFixed(1)}min`);
    }
  }

  const totalTime = (Date.now() - overallStart) / 60000;
  console.log('\n' + '='.repeat(60));
  console.log(`  COMPLETE: ${completed}/${targets.length} lessons in ${totalTime.toFixed(1)} min`);
  if (skipped) console.log(`  Skipped (no data): ${skipped}`);
  if (failed.length) console.log(`  FAILED: ${failed.join(', ')}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Batch TTS regeneration using Qwen3-TTS via ComfyUI API.
 * Uses FB_Qwen3TTSVoiceClone with ICL mode (x_vector_only=false + ref_text)
 * to prevent tone drift across scenes.
 *
 * Can run on desktop (localhost:8188) or laptop (localhost:8190 or network IP).
 *
 * Usage:
 *   node regenerate-tts-comfyui.mjs                       # All lessons
 *   node regenerate-tts-comfyui.mjs --lesson lesson-2-1    # Single lesson
 *   node regenerate-tts-comfyui.mjs --start lesson-3-1     # Resume from specific
 *   node regenerate-tts-comfyui.mjs --url http://192.168.50.18:8188  # Remote ComfyUI
 *   COMFYUI_URL=http://127.0.0.1:8190 node regenerate-tts-comfyui.mjs  # Laptop
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const urlArg = args.find((_, i) => args[i - 1] === '--url');
const COMFYUI_URL = urlArg || process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE REFERENCES — ICL mode (with ref_text transcription for consistent voice)
// ═══════════════════════════════════════════════════════════════════════════════

const VOICE_REFS = {
  female: {
    audio: path.join(PROJECT_ROOT, 'voices/FemaleJessica.mp3'),
    text: "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.",
    instruction: 'warm and professional, clear pace',
  },
  male: {
    audio: path.join(PROJECT_ROOT, 'voices/MaleAmerican.mp3'),
    text: "It allows you to easily download YouTube videos as MP3 or MP4 files. The service is completely free and does not require any sign-up",
    instruction: 'confident and encouraging, conversational',
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

const SKIP_LESSONS = new Set(['lesson-0-1', 'lesson-1-1', 'lesson-7-1']); // Already have ICL audio

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

function copyToComfyInput(srcPath, filename) {
  const destPath = path.join(COMFYUI_INPUT, filename);
  if (!fs.existsSync(destPath) || fs.statSync(srcPath).mtimeMs > fs.statSync(destPath).mtimeMs) {
    fs.copyFileSync(srcPath, destPath);
  }
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

async function pollCompletion(promptId, timeoutMs = 600000) {
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
// TTS WORKFLOW BUILDER
// ComfyUI nodes: LoadAudio → FB_Qwen3TTSVoiceClone → SaveAudio
// CRITICAL: x_vector_only=false + ref_text = ICL mode (consistent voice)
// ═══════════════════════════════════════════════════════════════════════════════

function buildTTSWorkflow(text, refAudioFilename, refText, outputPrefix) {
  return {
    // Node 10: Load reference audio from ComfyUI input folder
    '10': {
      class_type: 'LoadAudio',
      inputs: { audio: refAudioFilename },
    },
    // Node 20: Voice clone generation (ICL mode)
    '20': {
      class_type: 'FB_Qwen3TTSVoiceClone',
      inputs: {
        target_text: text,
        ref_audio: ['10', 0],
        ref_text: refText,
        model_choice: '1.7B',
        device: 'auto',
        precision: 'bf16',
        language: 'English',
        x_vector_only: false,  // CRITICAL: false = ICL mode = consistent voice
        seed: Math.floor(Math.random() * 1e15),
        max_new_tokens: 4096,
        top_p: 0.8,
        top_k: 20,
        temperature: 1,
        repetition_penalty: 1.05,
        attention: 'auto',
        unload_model_after_generate: false,  // Keep loaded for next scene
      },
    },
    // Node 30: Save output audio
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
// PROCESS LESSON
// ═══════════════════════════════════════════════════════════════════════════════

async function processLesson(lessonId, presenter) {
  const vdPath = path.join(COURSE_DIR, `video-scripts/${lessonId}-video-data.json`);
  if (!fs.existsSync(vdPath)) {
    console.log(`    [ERROR] Missing video-data: ${lessonId}`);
    return false;
  }

  const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));
  const audioDir = path.join(COURSE_DIR, `media/audio/scenes/${lessonId}`);
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const voice = VOICE_REFS[presenter];
  const refFilename = `tts-ref-${presenter}.mp3`;
  copyToComfyInput(voice.audio, refFilename);

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

    const outputPrefix = `tts-ucf/${lessonId}-scene-${scene.sceneNumber}`;
    process.stdout.write(`    Scene ${scene.sceneNumber}: ${narration.length} chars...`);
    const t0 = Date.now();

    try {
      const workflow = buildTTSWorkflow(narration, refFilename, voice.text, outputPrefix);
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      // Find the output audio file
      const outputs = result.outputs?.['30']?.audio;
      if (!outputs || outputs.length === 0) throw new Error('No output audio');

      const outFile = outputs[0].filename;
      const subfolder = outputs[0].subfolder || '';
      const comfyPath = path.join(COMFYUI_OUTPUT, subfolder, outFile);

      if (!fs.existsSync(comfyPath)) throw new Error(`Output not found: ${comfyPath}`);

      // Convert to 16kHz mono WAV for InfinityTalk
      execSync(`ffmpeg -y -i "${comfyPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${finalPath}"`, { stdio: 'ignore' });

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

  // Update video-data with durations
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

  console.log('\n' + '═'.repeat(60));
  console.log('  BATCH TTS — Qwen3-TTS via ComfyUI API (ICL Mode)');
  console.log('═'.repeat(60));
  console.log(`  ComfyUI: ${COMFYUI_URL}`);
  console.log(`  ICL mode: x_vector_only=false + ref_text (consistent voice)`);

  // Test connection
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    const stats = await res.json();
    console.log(`  Connected: ComfyUI ${stats.system?.comfyui_version || 'OK'}`);
  } catch {
    console.error('  ERROR: Cannot connect to ComfyUI at ' + COMFYUI_URL);
    process.exit(1);
  }

  // Determine targets
  let targets;
  if (lessonArg) {
    targets = LESSONS.filter(l => l.id === lessonArg);
    if (!targets.length) { console.error(`  Unknown lesson: ${lessonArg}`); process.exit(1); }
  } else {
    targets = LESSONS.filter(l => !SKIP_LESSONS.has(l.id));
    if (startArg) {
      const idx = targets.findIndex(l => l.id === startArg);
      if (idx > 0) targets = targets.slice(idx);
    }
  }

  console.log(`  Lessons: ${targets.length}`);
  console.log(`  Skipping: ${[...SKIP_LESSONS].join(', ')}`);

  let completed = 0;
  const failed = [];
  const overallStart = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const { id, presenter } = targets[i];
    console.log(`\n  [${i + 1}/${targets.length}] ${id} | ${presenter}`);
    const lessonStart = Date.now();

    const ok = await processLesson(id, presenter);
    const elapsed = (Date.now() - lessonStart) / 60000;

    if (ok) {
      completed++;
      console.log(`    Done in ${elapsed.toFixed(1)}min`);
    } else {
      failed.push(id);
      console.log(`    FAILED after ${elapsed.toFixed(1)}min`);
    }
  }

  const totalTime = (Date.now() - overallStart) / 60000;
  console.log('\n' + '═'.repeat(60));
  console.log(`  COMPLETE: ${completed}/${targets.length} lessons in ${totalTime.toFixed(1)} min`);
  if (failed.length) console.log(`  FAILED: ${failed.join(', ')}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });

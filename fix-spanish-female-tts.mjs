#!/usr/bin/env node
/**
 * Fix Spanish TTS — Regenerate FEMALE voice for lesson-0-1 and lesson-1-2.
 * Uses Qwen3TTSVoiceClone on laptop ComfyUI with tts-ref-female.mp3.
 *
 * Usage:
 *   node fix-spanish-female-tts.mjs
 *   node fix-spanish-female-tts.mjs --lesson lesson-0-1
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COMFYUI_URL = 'http://100.111.43.126:8188';
const COURSE_DIR = path.resolve('.');
const AUDIO_ES_DIR = path.join(COURSE_DIR, 'media/audio/scenes-es');
const POLL_INTERVAL = 2000;
const TIMEOUT = 300_000; // 5 min per scene

// Ref text for FemaleJessica (ICL mode — prevents tone drift)
const REF_TEXT = "Hey friends, let's talk. Let's have a conversation about anything. My name is Jessica, and I'm looking forward to chatting with you.";

const LESSONS_TO_FIX = [
  { id: 'lesson-0-1', presenter: 'female' },
  { id: 'lesson-1-2', presenter: 'female' },
];

const args = process.argv.slice(2);
const lessonFilter = args.includes('--lesson') ? args[args.indexOf('--lesson') + 1] : null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status} ${await res.text()}`);
  return (await res.json()).prompt_id;
}

async function waitForResult(promptId) {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT) {
    await sleep(POLL_INTERVAL);
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    if (!res.ok) continue;
    const history = await res.json();
    if (!history[promptId]) continue;
    const status = history[promptId].status;
    if (status?.completed) return history[promptId];
    if (status?.status_str === 'error') {
      throw new Error(`ComfyUI error: ${JSON.stringify(status.messages || [])}`);
    }
  }
  throw new Error(`Timeout after ${TIMEOUT/1000}s`);
}

async function downloadAudio(result, outputPath) {
  // Find the SaveAudio node output
  const outputs = result.outputs || {};
  for (const nodeId of Object.keys(outputs)) {
    const node = outputs[nodeId];
    if (node.audio && node.audio.length > 0) {
      const { filename, subfolder, type } = node.audio[0];
      const url = `${COMFYUI_URL}/api/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${type || 'output'}`;
      const res = await fetch(url);
      if (!res.ok) {
        // Try alternate URL format
        const url2 = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${type || 'output'}`;
        const res2 = await fetch(url2);
        if (!res2.ok) throw new Error(`Download failed: ${res.status} / ${res2.status}`);
        const buf = Buffer.from(await res2.arrayBuffer());
        fs.writeFileSync(outputPath, buf);
        return buf.length;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outputPath, buf);
      return buf.length;
    }
  }
  throw new Error('No audio output found');
}

function buildWorkflow(text, seed) {
  return {
    "1": {
      "class_type": "Qwen3TTSModelLoader",
      "inputs": {
        "model_name": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "device": "cuda:0",
        "dtype": "bfloat16",
        "keep_model_loaded": true,
        "use_flash_attn": false
      }
    },
    "2": {
      "class_type": "LoadAudio",
      "inputs": {
        "audio": "tts-ref-female.mp3"
      }
    },
    "3": {
      "class_type": "Qwen3TTSVoiceClone",
      "inputs": {
        "model": ["1", 0],
        "text": text,
        "ref_audio": ["2", 0],
        "ref_text": REF_TEXT,
        "language": "Spanish",
        "seed": seed,
        "x_vector_only": false,
        "max_new_tokens": 4096,
        "temperature": 1.0,
        "top_p": 0.8,
        "repetition_penalty": 1.1
      }
    },
    "4": {
      "class_type": "SaveAudio",
      "inputs": {
        "filename_prefix": "tts_spanish_female",
        "audio": ["3", 0]
      }
    }
  };
}

function getAudioDuration(filePath) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${filePath}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration) || 0;
  } catch { return 0; }
}

function resampleTo16k(input, output) {
  execSync(`ffmpeg -y -i "${input}" -ar 16000 -ac 1 -c:a pcm_s16le "${output}"`, { stdio: 'pipe' });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Fix Spanish TTS — Female Voice (Laptop ComfyUI)║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  // Check ComfyUI
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!res.ok) throw new Error();
    console.log('ComfyUI connected on laptop');
  } catch {
    console.error(`ERROR: Cannot reach ComfyUI at ${COMFYUI_URL}`);
    process.exit(1);
  }

  let targets = LESSONS_TO_FIX;
  if (lessonFilter) {
    targets = targets.filter(t => t.id === lessonFilter);
  }

  for (const lesson of targets) {
    const vdPath = path.join(COURSE_DIR, `video-scripts/${lesson.id}-video-data-es.json`);
    if (!fs.existsSync(vdPath)) {
      console.log(`  SKIP ${lesson.id}: no Spanish video-data`);
      continue;
    }

    const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));
    const outDir = path.join(AUDIO_ES_DIR, lesson.id);

    // Backup old audio
    const backupDir = path.join(outDir, '_backup_male');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    console.log(`\n══ ${lesson.id} (${vd.scenes.length} scenes) ══`);

    for (const scene of vd.scenes) {
      const narration = (scene.narration || '').trim();
      if (narration.length < 10) continue;

      const sceneNum = scene.sceneNumber;
      const finalPath = path.join(outDir, `${lesson.id}-scene-${sceneNum}.wav`);
      const tempPath = path.join(outDir, `${lesson.id}-scene-${sceneNum}-temp.flac`);

      // Backup existing (male) audio
      if (fs.existsSync(finalPath)) {
        const backupFile = path.join(backupDir, path.basename(finalPath));
        if (!fs.existsSync(backupFile)) {
          fs.copyFileSync(finalPath, backupFile);
        }
      }

      console.log(`  Scene ${sceneNum}: ${narration.length} chars...`);
      const t0 = Date.now();

      try {
        const workflow = buildWorkflow(narration, Math.floor(Math.random() * 999999));
        const promptId = await submitWorkflow(workflow);
        console.log(`    Queued: ${promptId.substring(0, 8)}...`);

        const result = await waitForResult(promptId);

        // Download as temp file (ComfyUI outputs FLAC)
        await downloadAudio(result, tempPath);

        // Resample to 16kHz WAV (required for InfinityTalk)
        resampleTo16k(tempPath, finalPath);
        fs.unlinkSync(tempPath);

        const dur = getAudioDuration(finalPath);
        scene.duration = dur;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`    DONE — ${dur.toFixed(1)}s audio, ${elapsed}s generation`);
      } catch (err) {
        console.error(`    FAILED: ${err.message}`);
      }
    }

    // Update video-data with new durations
    const total = vd.scenes.reduce((s, sc) => s + (sc.duration || 0), 0);
    vd.totalDuration = total;
    fs.writeFileSync(vdPath, JSON.stringify(vd, null, 2));
    console.log(`  Total duration: ${total.toFixed(1)}s (${(total/60).toFixed(1)} min)`);

    // Reconcat audio for InfinityTalk
    const concatList = path.join(AUDIO_ES_DIR, `${lesson.id}-concat.txt`);
    const concatMp3 = path.join(AUDIO_ES_DIR, `${lesson.id}-full-es.mp3`);

    const lines = vd.scenes
      .filter(s => (s.narration || '').trim().length >= 10)
      .map(s => `file '${lesson.id}/${lesson.id}-scene-${s.sceneNumber}.wav'`);
    fs.writeFileSync(concatList, lines.join('\n'));

    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -q:a 2 "${concatMp3}"`, { cwd: AUDIO_ES_DIR, stdio: 'pipe' });
    const fullDur = getAudioDuration(concatMp3);
    console.log(`  Concat: ${lesson.id}-full-es.mp3 (${fullDur.toFixed(1)}s)`);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  DONE — Female Spanish audio regenerated');
  console.log('  Next: re-run InfinityTalk for these lessons');
  console.log('══════════════════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

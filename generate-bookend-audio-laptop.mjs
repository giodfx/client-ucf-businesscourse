#!/usr/bin/env node
/**
 * Bookend audio generator — LAPTOP variant via Tailscale ComfyUI HTTP API.
 *
 * Reads bookend-scripts.json, generates EN+ES audio per video using Qwen3TTSVoiceClone
 * node on the laptop's ComfyUI (RTX 4070 Laptop GPU, Tailscale IP 100.111.43.126).
 *
 * CHUNKING: each script split into ~60-word chunks at sentence boundaries (per
 * MEMORY.md "Audio must be per-scene: scene-sized chunks (not one long file)").
 * Each chunk → separate Qwen3TTSVoiceClone call → concatenated locally with FFmpeg.
 *
 * Usage:
 *   node generate-bookend-audio-laptop.mjs --samples       # course-intro + module-1-intro EN+ES
 *   node generate-bookend-audio-laptop.mjs --video <id>    # single video EN+ES
 *   node generate-bookend-audio-laptop.mjs --all           # all in-scope (Modules 0-5)
 *   node generate-bookend-audio-laptop.mjs --lang en       # restrict to one language
 *
 * Output: media/audio/bookend/{video-id}-{lang}.wav (24kHz native from laptop)
 */
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = 'http://100.111.43.126:8188';
const SCRIPTS_FILE = path.join(__dirname, 'bookend-scripts.json');
const OUT_DIR = path.join(__dirname, 'media', 'audio', 'bookend');
const CHUNKS_DIR = path.join(OUT_DIR, '.chunks');
const MAX_WORDS_PER_CHUNK = 60;
const INTER_CHUNK_GAP_MS = 200;

// ---------- CLI args ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i+1] : null; };

// ---------- Load scripts ----------
const data = JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8'));
const voiceRefs = data._meta.voice_refs;
const allVideos = data.videos;

// Filter targets
let targets;
if (flag('--samples')) {
  targets = allVideos.filter(v => v.id === 'course-intro' || v.id === 'module-1-intro');
} else if (arg('--video')) {
  targets = allVideos.filter(v => v.id === arg('--video'));
} else if (flag('--all')) {
  targets = allVideos.filter(v => v.approved);
} else {
  console.error('Specify --samples, --video <id>, or --all');
  process.exit(1);
}
const langs = arg('--lang') ? [arg('--lang')] : ['en', 'es'];
const force = flag('--force');

console.log('='.repeat(70));
console.log('UCF Bookend Audio Gen — LAPTOP mode (ComfyUI HTTP via Tailscale)');
console.log('='.repeat(70));
console.log(`ComfyUI URL: ${COMFYUI_URL}`);
console.log(`Targets:     ${targets.length} video(s) x ${langs.length} lang = ${targets.length * langs.length} audios`);
console.log(`Chunk size:  ~${MAX_WORDS_PER_CHUNK} words max per chunk (sentence-aligned)`);
console.log(`Inter-chunk: ${INTER_CHUNK_GAP_MS}ms gap`);
console.log('='.repeat(70));

// ---------- Helpers ----------

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function uploadAudio(filePath) {
  const filename = path.basename(filePath);
  const form = new FormData();
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime = ext === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  form.append('image', new Blob([buf], { type: mime }), filename);
  form.append('overwrite', 'true');
  const res = await fetch(`${COMFYUI_URL}/upload/image`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.name; // filename as stored in ComfyUI input
}

async function queuePrompt(workflow, clientId) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  if (!res.ok) throw new Error(`Queue failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function waitForCompletion(promptId, timeoutMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const history = await fetchJSON(`${COMFYUI_URL}/history/${promptId}`);
      if (history[promptId]) {
        const status = history[promptId].status;
        if (status?.completed) return history[promptId];
        if (status?.status_str === 'error') throw new Error(`Generation failed: ${JSON.stringify(status.messages)}`);
      }
    } catch (e) {
      if (e.message.includes('Generation failed')) throw e;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Timeout after ${timeoutMs/1000}s`);
}

async function downloadFile(filename, subfolder, type, outputPath) {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  return buf.length;
}

function chunkScript(text, maxWords = MAX_WORDS_PER_CHUNK) {
  text = text.trim();
  if (!text) return [];
  // Split at sentence boundaries; respect Spanish ¿ ¡
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let current = [];
  let currentWords = 0;
  for (const sent of sentences) {
    const sw = sent.split(/\s+/).length;
    if (sw > maxWords) {
      // Split by commas as fallback
      const sub = sent.split(/(?<=,)\s+/);
      for (const sp of sub) {
        const spw = sp.split(/\s+/).length;
        if (currentWords + spw > maxWords && current.length) {
          chunks.push(current.join(' ').trim());
          current = [sp]; currentWords = spw;
        } else {
          current.push(sp); currentWords += spw;
        }
      }
      continue;
    }
    if (currentWords + sw > maxWords && current.length) {
      chunks.push(current.join(' ').trim());
      current = [sent]; currentWords = sw;
    } else {
      current.push(sent); currentWords += sw;
    }
  }
  if (current.length) chunks.push(current.join(' ').trim());
  return chunks.filter(Boolean);
}

function buildVoiceCloneWorkflow({ refAudioName, text, refText, language, seed, filenamePrefix }) {
  // Workflow: LoadAudio -> Qwen3TTSModelLoader -> Qwen3TTSVoiceClone -> SaveAudio
  // NOTE: Use Qwen3TTSModelLoader (outputs QWEN_TTS_MODEL) — NOT Qwen3TTSLoader (different family).
  return {
    "1": {
      "class_type": "Qwen3TTSModelLoader",
      "inputs": {
        "model_name": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "device": "cuda:0",
        "dtype": "bfloat16",
        "keep_model_loaded": true,
        "use_flash_attn": false
      },
      "_meta": { "title": "Qwen3 TTS Model Loader" }
    },
    "2": {
      "class_type": "LoadAudio",
      "inputs": { "audio": refAudioName },
      "_meta": { "title": "Reference Audio" }
    },
    "3": {
      "class_type": "Qwen3TTSVoiceClone",
      "inputs": {
        "model": ["1", 0],
        "text": text,
        "ref_audio": ["2", 0],
        "ref_text": refText,
        "language": language,
        "seed": seed
      },
      "_meta": { "title": "Voice Clone" }
    },
    "4": {
      "class_type": "SaveAudio",
      "inputs": {
        "filename_prefix": filenamePrefix,
        "audio": ["3", 0]
      },
      "_meta": { "title": "Save Audio" }
    }
  };
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr?.toString()?.slice(-500)}`);
}

function ffprobeDuration(filePath) {
  const r = spawnSync('ffprobe', ['-v','quiet','-print_format','json','-show_format', filePath], { stdio: ['ignore','pipe','pipe'] });
  try { return parseFloat(JSON.parse(r.stdout.toString()).format.duration); } catch { return 0; }
}

function concatChunks(chunkPaths, outputPath, gapMs = INTER_CHUNK_GAP_MS) {
  if (chunkPaths.length === 1) {
    ffmpeg(['-i', chunkPaths[0], '-c', 'copy', outputPath]);
    return;
  }
  const inputs = [];
  const filterParts = [];
  chunkPaths.forEach((p, i) => {
    inputs.push('-i', p);
    filterParts.push(`[${i}:a]apad=pad_dur=${gapMs/1000}[c${i}]`);
  });
  const concatInputs = chunkPaths.map((_, i) => `[c${i}]`).join('');
  const filter = filterParts.join(';') + ';' + concatInputs + `concat=n=${chunkPaths.length}:v=0:a=1[out]`;
  ffmpeg([...inputs, '-filter_complex', filter, '-map', '[out]', '-c:a', 'pcm_s16le', outputPath]);
}

// ---------- Test connection ----------
async function testConnection() {
  try {
    const stats = await fetchJSON(`${COMFYUI_URL}/system_stats`);
    const gpu = stats.devices?.[0];
    console.log(`Laptop GPU: ${gpu?.name || '?'}`);
    console.log(`VRAM:       ${Math.round((gpu?.vram_total || 0) / (1024*1024))}MB total, ${Math.round((gpu?.vram_free || 0) / (1024*1024))}MB free\n`);
    return true;
  } catch (e) {
    console.error(`Cannot reach laptop ComfyUI at ${COMFYUI_URL}: ${e.message}`);
    process.exit(1);
  }
}

// ---------- Main per-video processing ----------
async function generateOne(video, lang) {
  const voiceKey = video[`voice_${lang}`];
  const ref = voiceRefs[voiceKey];
  const refAudioPath = path.join(__dirname, ref.audio);

  if (!fs.existsSync(refAudioPath)) {
    throw new Error(`Reference audio missing: ${refAudioPath}`);
  }

  const langCode = lang === 'es' ? 'Spanish' : 'English';
  const scriptText = video[`script_${lang}`];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chunksSubdir = path.join(CHUNKS_DIR, `${video.id}-${lang}`);
  fs.mkdirSync(chunksSubdir, { recursive: true });
  const outFinal = path.join(OUT_DIR, `${video.id}-${lang}.wav`);

  if (!force && fs.existsSync(outFinal) && fs.statSync(outFinal).size > 1000) {
    const dur = ffprobeDuration(outFinal);
    console.log(`    SKIP — already exists (${dur.toFixed(1)}s)`);
    return { status: 'skipped', duration: dur };
  }

  // Upload reference audio to laptop ComfyUI (idempotent — overwrite=true)
  const refUploadName = await uploadAudio(refAudioPath);
  console.log(`    Ref audio uploaded: ${refUploadName}`);

  // Chunk
  const chunks = chunkScript(scriptText);
  console.log(`    Script: ${scriptText.length} chars, ${scriptText.split(/\s+/).length} words -> ${chunks.length} chunks`);

  const chunkPaths = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkFile = path.join(chunksSubdir, `chunk-${String(i+1).padStart(2,'0')}.wav`);
    if (!force && fs.existsSync(chunkFile) && fs.statSync(chunkFile).size > 1000) {
      console.log(`      [${i+1}/${chunks.length}] SKIP existing chunk`);
      chunkPaths.push(chunkFile);
      continue;
    }

    const seed = Math.floor(Math.random() * 2147483647);
    const filenamePrefix = `bookend/${video.id}-${lang}-chunk-${i+1}`;
    const workflow = buildVoiceCloneWorkflow({
      refAudioName: refUploadName,
      text: chunkText,
      refText: ref.transcription,
      language: langCode,
      seed,
      filenamePrefix
    });

    const t0 = Date.now();
    const clientId = `ucf-bookend-${Date.now()}-${i}`;
    const { prompt_id } = await queuePrompt(workflow, clientId);
    console.log(`      [${i+1}/${chunks.length}] Queued (${chunkText.split(/\s+/).length}w): ${prompt_id}`);

    const result = await waitForCompletion(prompt_id);
    const out4 = result.outputs?.["4"];
    if (!out4?.audio?.length) throw new Error(`No audio output from chunk ${i+1}: ${JSON.stringify(result.outputs)}`);
    const audioInfo = out4.audio[0];
    await downloadFile(audioInfo.filename, audioInfo.subfolder, 'output', chunkFile);
    const dur = ffprobeDuration(chunkFile);
    console.log(`      [${i+1}/${chunks.length}] ${((Date.now()-t0)/1000).toFixed(1)}s -> ${dur.toFixed(1)}s audio`);
    chunkPaths.push(chunkFile);
  }

  // Concatenate
  console.log(`    Concatenating ${chunkPaths.length} chunks...`);
  concatChunks(chunkPaths, outFinal);
  const finalDur = ffprobeDuration(outFinal);
  const sizeKB = Math.round(fs.statSync(outFinal).size / 1024);
  console.log(`    DONE — ${finalDur.toFixed(1)}s, ${sizeKB}KB`);
  return { status: 'success', duration: finalDur };
}

// ---------- Run ----------
(async () => {
  await testConnection();

  let success = 0, errors = 0, skipped = 0, totalDur = 0;
  for (const video of targets) {
    console.log(`\n=== ${video.label} (id=${video.id}) ===`);
    console.log(`    Module ${video.module}, voice=${video.voice_en}/${video.voice_es}`);
    for (const lang of langs) {
      console.log(`  --- ${lang.toUpperCase()} ---`);
      try {
        const { status, duration } = await generateOne(video, lang);
        if (status === 'success') { success++; totalDur += duration; }
        else if (status === 'skipped') { skipped++; totalDur += duration; }
      } catch (e) {
        console.error(`    FAILED: ${e.message}`);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Done: ${success} success, ${skipped} skipped, ${errors} errors`);
  console.log(`Total audio duration: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)} min)`);
  console.log(`Files: ${OUT_DIR}`);
  console.log('='.repeat(70));
  if (errors > 0) process.exit(1);
})();

#!/usr/bin/env node
/**
 * Generate hero images for all 25 lessons via ComfyUI API on laptop (Tailscale).
 * Reads prompts from qwen-optimized-prompts.json, sends to Qwen 2512 GGUF workflow.
 *
 * Usage: node generate-hero-images.mjs [--start N] [--only lesson-X-Y]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = 'http://100.111.43.126:8188';
const OUTPUT_DIR = path.join(__dirname, 'media', 'images', 'scenes');
const PROMPTS_FILE = path.join(__dirname, 'qwen-optimized-prompts.json');

// Workflow template from image_qwen_2512_gguf.json
const WORKFLOW_TEMPLATE = {
  "60": {
    "inputs": {
      "filename_prefix": "UCF-Hero",
      "images": ["86:8", 0]
    },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  },
  "91": {
    "inputs": {
      "value": ""  // Prompt injected here
    },
    "class_type": "PrimitiveStringMultiline",
    "_meta": { "title": "Prompt" }
  },
  "86:39": {
    "inputs": { "vae_name": "qwen_image_vae.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "Load VAE" }
  },
  "86:38": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image"
    },
    "class_type": "CLIPLoader",
    "_meta": { "title": "Load CLIP" }
  },
  "86:37": {
    "inputs": {
      "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors",
      "weight_dtype": "fp8_e4m3fn"
    },
    "class_type": "UNETLoader",
    "_meta": { "title": "Load Diffusion Model" }
  },
  "86:3": {
    "inputs": {
      "seed": 0,  // Will be randomized per image
      "steps": 25,
      "cfg": 4,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["86:66", 0],
      "positive": ["86:81", 0],
      "negative": ["86:7", 0],
      "latent_image": ["86:58", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "KSampler" }
  },
  "86:58": {
    "inputs": { "width": 1824, "height": 1024, "batch_size": 1 },
    "class_type": "EmptySD3LatentImage",
    "_meta": { "title": "EmptySD3LatentImage" }
  },
  "86:81": {
    "inputs": {
      "text": ["91", 0],
      "clip": ["86:38", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
  },
  "86:8": {
    "inputs": {
      "samples": ["86:3", 0],
      "vae": ["86:39", 0]
    },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  },
  "86:66": {
    "inputs": {
      "shift": 3.1,
      "model": ["86:37", 0]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": { "title": "ModelSamplingAuraFlow" }
  },
  "86:7": {
    "inputs": {
      "text": "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲",
      "clip": ["86:38", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
  }
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function queuePrompt(workflow, clientId) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Queue failed (${res.status}): ${text}`);
  }
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
        if (status?.status_str === 'error') {
          throw new Error(`Generation failed: ${JSON.stringify(status.messages)}`);
        }
      }
    } catch (e) {
      if (e.message.includes('Generation failed')) throw e;
      // Ignore fetch errors during polling
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Timeout after ${timeoutMs / 1000}s`);
}

async function downloadImage(filename, subfolder, outputPath) {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=output`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

async function generateImage(promptEntry, index) {
  const { lessonId, qwenPrompt, lessonTitle } = promptEntry;
  const outputPath = path.join(OUTPUT_DIR, `${lessonId}-hero.png`);

  // Skip if already generated
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 100000) { // >100KB means valid image
      console.log(`  SKIP ${lessonId} — already exists (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      return { lessonId, status: 'skipped', path: outputPath };
    }
  }

  console.log(`\n[${ index + 1}/25] Generating: ${lessonId}`);
  console.log(`  Title: ${lessonTitle}`);
  console.log(`  Prompt: ${qwenPrompt.substring(0, 80)}...`);

  // Create workflow with this prompt
  const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  workflow["91"].inputs.value = qwenPrompt;
  workflow["86:3"].inputs.seed = Math.floor(Math.random() * 2147483647);
  workflow["60"].inputs.filename_prefix = `UCF-${lessonId}`;

  const clientId = `ucf-gen-${Date.now()}`;

  try {
    const { prompt_id } = await queuePrompt(workflow, clientId);
    console.log(`  Queued: ${prompt_id}`);

    const startTime = Date.now();
    const result = await waitForCompletion(prompt_id, 600000);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Find output image
    const outputs = result.outputs;
    const saveNode = outputs["60"];
    if (!saveNode?.images?.length) {
      throw new Error('No output images found');
    }

    const img = saveNode.images[0];
    const size = await downloadImage(img.filename, img.subfolder, outputPath);

    console.log(`  DONE in ${elapsed}s — ${(size / 1024 / 1024).toFixed(1)}MB → ${outputPath}`);
    return { lessonId, status: 'success', path: outputPath, time: elapsed };

  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return { lessonId, status: 'error', error: err.message };
  }
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  let startFrom = 0;
  let onlyLesson = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) startFrom = parseInt(args[i + 1]) - 1;
    if (args[i] === '--only' && args[i + 1]) onlyLesson = args[i + 1];
  }

  // Load prompts
  const promptsData = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
  let prompts = promptsData.prompts;

  if (onlyLesson) {
    prompts = prompts.filter(p => p.lessonId === onlyLesson);
    if (prompts.length === 0) {
      console.error(`Lesson ${onlyLesson} not found in prompts file`);
      process.exit(1);
    }
  } else {
    prompts = prompts.slice(startFrom);
  }

  // Ensure output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check ComfyUI
  try {
    const stats = await fetchJSON(`${COMFYUI_URL}/system_stats`);
    const gpu = stats.devices?.[0];
    console.log('='.repeat(70));
    console.log('UCF Business Course — Hero Image Generation');
    console.log('='.repeat(70));
    console.log(`ComfyUI: ${COMFYUI_URL}`);
    console.log(`GPU: ${gpu?.name || 'unknown'}`);
    console.log(`VRAM: ${((gpu?.vram_total || 0) / 1024 / 1024 / 1024).toFixed(1)}GB total, ${((gpu?.vram_free || 0) / 1024 / 1024 / 1024).toFixed(1)}GB free`);
    console.log(`Model: Qwen 2512 GGUF (Q4_K_M)`);
    console.log(`Resolution: 1824x1024`);
    console.log(`Prompts: ${prompts.length} to generate`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
  } catch (err) {
    console.error(`Cannot reach ComfyUI at ${COMFYUI_URL}: ${err.message}`);
    process.exit(1);
  }

  // Generate sequentially (one at a time — 8GB VRAM constraint)
  const results = [];
  for (let i = 0; i < prompts.length; i++) {
    const result = await generateImage(prompts[i], startFrom + i);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('GENERATION SUMMARY');
  console.log('='.repeat(70));
  const success = results.filter(r => r.status === 'success');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log(`Success: ${success.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Errors:  ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nFailed lessons:');
    errors.forEach(e => console.log(`  ${e.lessonId}: ${e.error}`));
    console.log('\nRetry with: node generate-hero-images.mjs --only <lessonId>');
  }

  if (success.length > 0) {
    const avgTime = success.reduce((sum, r) => sum + parseFloat(r.time), 0) / success.length;
    console.log(`\nAvg generation time: ${avgTime.toFixed(1)}s per image`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

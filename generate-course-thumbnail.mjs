#!/usr/bin/env node
/**
 * Generate the UCF Business Course splash/thumbnail image for the LMS.
 * Concept A: "The Road Ahead" — painterly digital illustration of an open road
 * heading toward the Orlando skyline at golden hour, with palm trees and
 * subtle Central Florida sense-of-place.
 *
 * Runs on the LAPTOP ComfyUI via Tailscale (RTX 4070 Laptop GPU @ 100.111.43.126),
 * NOT the desktop (which has the InfinityTalk video pipeline issue).
 *
 * Output: media/images/course-thumbnail-1920x1080.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = 'http://100.111.43.126:8188';   // LAPTOP via Tailscale
const OUTPUT_DIR = path.join(__dirname, 'media', 'images');
const OUTPUT_FILENAME = 'course-thumbnail-1920x1080.png';

// Concept A — "The Road Ahead"
const PROMPT = `Painterly digital illustration of a quiet two-lane highway curving toward the Orlando city skyline at golden hour, viewed from a low cinematic perspective. Tall palm trees line both sides of the road, casting long warm shadows across the asphalt. A vivid sunset sky with peach, soft orange, and lavender clouds fills the upper half of the frame. The Orlando skyline rises in the distance, suggested rather than detailed — recognizable silhouettes of glass towers, the SunTrust Plaza pyramid, and a hint of the I-4 corridor. Lush green roadside vegetation and Central Florida palm hammocks frame the foreground. The composition leads the eye down the road toward the city, conveying journey, opportunity, and arrival. Style: editorial digital painting with visible brushstrokes, painterly texture, warm cinematic color grading, high contrast between sky and road. Mood: optimistic, aspirational, welcoming. Inspired by classic American road-trip travel poster art elevated with modern digital painting techniques.`;

const NEGATIVE = 'photograph, photorealistic, photoreal, stock photo, bland, washed out, low contrast, text, words, letters, signs, billboards, road signs, watermark, logo, signature, blurry, low quality, distortion, fisheye, ugly, deformed, oversaturated, neon, cyberpunk, futuristic, sci-fi, snow, winter, rain';

// Workflow — Qwen 2512 fp8 (matches what the laptop's existing scripts use)
const WORKFLOW = {
  "60": {
    "inputs": { "filename_prefix": "UCF-CourseThumb", "images": ["86:8", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  },
  "91": {
    "inputs": { "value": PROMPT },
    "class_type": "PrimitiveStringMultiline",
    "_meta": { "title": "Prompt" }
  },
  "92": {
    "inputs": { "value": NEGATIVE },
    "class_type": "PrimitiveStringMultiline",
    "_meta": { "title": "Negative Prompt" }
  },
  "86:39": {
    "inputs": { "vae_name": "qwen_image_vae.safetensors" },
    "class_type": "VAELoader"
  },
  "86:38": {
    "inputs": { "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image" },
    "class_type": "CLIPLoader"
  },
  "86:37": {
    "inputs": { "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors", "weight_dtype": "fp8_e4m3fn" },
    "class_type": "UNETLoader"
  },
  "86:66": {
    "inputs": { "shift": 3.1, "model": ["86:37", 0] },
    "class_type": "ModelSamplingAuraFlow"
  },
  "86:3": {
    "inputs": {
      "seed": Math.floor(Math.random() * 1e15),
      "steps": 30,
      "cfg": 4,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["86:66", 0],
      "positive": ["86:81", 0],
      "negative": ["86:7", 0],
      "latent_image": ["86:58", 0]
    },
    "class_type": "KSampler"
  },
  "86:58": {
    "inputs": { "width": 1920, "height": 1088, "batch_size": 1 },   // 16:9-ish, divisible by 64
    "class_type": "EmptySD3LatentImage"
  },
  "86:81": {
    "inputs": { "text": ["91", 0], "clip": ["86:38", 0] },
    "class_type": "CLIPTextEncode"
  },
  "86:7": {
    "inputs": { "text": ["92", 0], "clip": ["86:38", 0] },
    "class_type": "CLIPTextEncode"
  },
  "86:8": {
    "inputs": { "samples": ["86:3", 0], "vae": ["86:39", 0] },
    "class_type": "VAEDecode"
  }
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(()=>'')}`);
  return res.json();
}

async function main() {
  console.log(`\n  UCF Course Thumbnail Generation`);
  console.log(`  ComfyUI: ${COMFYUI_URL} (laptop via Tailscale)\n`);

  // Health check
  try {
    await fetchJSON(`${COMFYUI_URL}/system_stats`);
    console.log('  ✓ Laptop ComfyUI reachable');
  } catch (e) {
    console.error(`  ✗ Cannot reach laptop ComfyUI: ${e.message}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('\n  Submitting workflow...');
  const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: WORKFLOW })
  });
  const submitData = await submitRes.json();
  if (submitData.error || (submitData.node_errors && Object.keys(submitData.node_errors).length)) {
    console.error('  ✗ Workflow submission error:', JSON.stringify(submitData).substring(0, 800));
    process.exit(1);
  }
  const promptId = submitData.prompt_id;
  console.log(`  ✓ Submitted, prompt_id: ${promptId}`);

  // Poll
  console.log('  Generating (typical: 30-60s on RTX 4070 Laptop)...');
  const start = Date.now();
  let history;
  while (Date.now() - start < 300000) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const data = await fetchJSON(`${COMFYUI_URL}/history/${promptId}`);
      if (data[promptId]?.status?.status_str === 'success') { history = data[promptId]; break; }
      if (data[promptId]?.status?.status_str === 'error') throw new Error('Execution error');
    } catch {}
    process.stdout.write('.');
  }
  if (!history) { console.error('\n  ✗ Timeout'); process.exit(1); }
  console.log(`\n  ✓ Generated in ${((Date.now()-start)/1000).toFixed(1)}s`);

  // Download
  const outputs = history.outputs?.['60']?.images?.[0];
  if (!outputs) { console.error('  ✗ No image in output:', JSON.stringify(history.outputs)); process.exit(1); }
  const imgUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(outputs.filename)}&subfolder=${encodeURIComponent(outputs.subfolder || '')}&type=${outputs.type || 'output'}`;
  const imgRes = await fetch(imgUrl);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  const outPath = path.join(OUTPUT_DIR, OUTPUT_FILENAME);
  fs.writeFileSync(outPath, imgBuf);
  console.log(`\n  ✓ Saved: ${outPath} (${(imgBuf.length/1024).toFixed(1)} KB)`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
